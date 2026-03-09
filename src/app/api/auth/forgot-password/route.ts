import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/auth/forgot-password
 * Generate a password recovery link and email it to the user.
 * Extracts the token_hash from Supabase's action link and builds
 * a direct reset URL - bypasses Supabase redirect URL config entirely.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server not configured for password resets' },
        { status: 500 }
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Extract token_hash from the action link query string
    const actionLink = data?.properties?.action_link || '';
    let tokenHash = '';
    try {
      const url = new URL(actionLink);
      tokenHash = url.searchParams.get('token') || '';
    } catch {
      // fallback: couldn't parse action link
    }

    if (!tokenHash) {
      return NextResponse.json({ error: 'Failed to generate reset token' }, { status: 500 });
    }

    // Build a direct reset URL that our /reset-password page handles
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://carolina-hq.vercel.app';
    const resetUrl = `${siteUrl}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    // Send the recovery email via Resend
    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@dailycookie.co';

    if (resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email.trim()],
            subject: 'Reset Your Password - Carolina HQ',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
                <div style="background: #1a1f36; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h1 style="color: #fff; font-size: 20px; margin: 0;">Carolina HQ</h1>
                </div>
                <p style="color: #333; font-size: 15px; line-height: 1.6;">
                  Hi there,
                </p>
                <p style="color: #333; font-size: 15px; line-height: 1.6;">
                  We received a request to reset your password. Click the button below to choose a new one:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: #4F6BFF; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #999; font-size: 12px; line-height: 1.5;">
                  This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            `,
          }),
        });
        emailSent = res.ok;
      } catch {
        // Email send failed, but we still have the reset URL as fallback
      }
    }

    return NextResponse.json({
      ok: true,
      email_sent: emailSent,
      // Include direct reset link as fallback
      action_link: resetUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate reset link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
