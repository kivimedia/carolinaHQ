import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

/**
 * QuickBooks webhook endpoint.
 *
 * Intuit sends event notifications here when invoices, payments, or
 * customers change in QuickBooks Online. The webhook verifier token
 * is used to validate the HMAC-SHA256 signature on each request.
 *
 * Intuit expects a 200 response within 10 seconds. Heavy processing
 * should be done asynchronously after responding.
 */

function getVerifierToken(): string {
  const token = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;
  if (!token) throw new Error('QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN not set');
  return token;
}

/**
 * Verify the Intuit webhook signature.
 * Intuit signs the raw body with HMAC-SHA256 using the verifier token
 * and sends the signature in the `intuit-signature` header (base64-encoded).
 */
function verifySignature(rawBody: string, signature: string): boolean {
  const hash = createHmac('sha256', getVerifierToken())
    .update(rawBody)
    .digest('base64');
  return hash === signature;
}

interface WebhookEvent {
  name: string;       // e.g. "Invoice", "Payment", "Customer"
  id: string;         // entity ID
  operation: string;  // "Create", "Update", "Delete", "Void"
  lastUpdated: string;
}

interface WebhookNotification {
  realmId: string;
  dataChangeEvent: {
    entities: WebhookEvent[];
  };
}

interface WebhookPayload {
  eventNotifications: WebhookNotification[];
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('intuit-signature');

    // Intuit requires signature verification
    if (!signature || !verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: WebhookPayload = JSON.parse(rawBody);

    // Respond immediately with 200 -- Intuit requires a fast response
    // Process events asynchronously below

    for (const notification of payload.eventNotifications) {
      const { realmId, dataChangeEvent } = notification;

      for (const entity of dataChangeEvent.entities) {
        // Log for now; expand with actual processing as needed
        console.log(
          `[QB Webhook] ${entity.operation} ${entity.name} #${entity.id} ` +
            `for realm ${realmId} at ${entity.lastUpdated}`,
        );

        // Future: dispatch to specific handlers based on entity.name
        // e.g. syncInvoice(realmId, entity.id) for Invoice events
        // e.g. syncPayment(realmId, entity.id) for Payment events
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('QuickBooks webhook error:', err);
    // Still return 200 to prevent Intuit from disabling the webhook
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
