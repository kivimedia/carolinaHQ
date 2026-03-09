'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (tokenHash && type === 'recovery') {
        // Verify the token_hash directly - no Supabase redirect needed
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (error) {
          setError('This reset link is invalid or has expired. Please request a new one.');
          setVerifying(false);
          return;
        }

        setReady(true);
        setVerifying(false);
        return;
      }

      // Fallback: listen for auth state change (hash-based flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setReady(true);
          setVerifying(false);
        }
      });

      // Also check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        setVerifying(false);
      } else {
        // No token_hash and no session - show error after a brief wait
        setTimeout(() => {
          setVerifying(false);
          if (!ready) {
            setError('No valid reset token found. Please request a new password reset link.');
          }
        }, 3000);
      }

      return () => subscription.unsubscribe();
    };

    verifyToken();
  }, [searchParams, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 rounded-xl bg-mint/20 text-mint-dark text-sm font-body">
          Password updated successfully! Redirecting...
        </div>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin h-6 w-6 border-2 border-electric border-t-transparent rounded-full mx-auto" />
        <p className="text-navy/60 text-sm font-body">Verifying your reset link...</p>
      </div>
    );
  }

  if (!ready && error) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm font-body">
          {error}
        </div>
        <Button variant="ghost" onClick={() => router.push('/forgot-password')}>
          Request a new reset link
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="New Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      {error && (
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-sm font-body">
          {error}
        </div>
      )}
      <Button type="submit" loading={loading} className="w-full">
        Update Password
      </Button>
    </form>
  );
}
