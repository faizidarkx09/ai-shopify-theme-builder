// app/api/billing/webhook/route.ts
// Stripe webhook — TEST-MODE STUB ONLY (Cut 5 fills in the real one).
//
// There is no Stripe secret in this repo, so no signature can (or should)
// be verified here. This route accepts a test payload, validates only its
// shape via lib/billing.ts, and reports that nothing was processed.
// It NEVER changes a plan and NEVER charges anyone.

import { parseBillingWebhookEvent, STRIPE_TEST_MODE } from '../../../../lib/billing';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return json(
      {
        received: false,
        processed: false,
        mode: 'test-stub',
        reason: 'Webhook body JSON nahi hai.',
      },
      400,
    );
  }

  const parsed = parseBillingWebhookEvent(body);

  // Test stub: acknowledge receipt, process nothing. A real Cut 5 handler
  // would verify the Stripe signature with STRIPE_TEST_MODE.webhookSecret
  // (currently null on purpose) and then update the subscription.
  return json({
    received: true,
    processed: false,
    mode: 'test-stub',
    stripeMode: STRIPE_TEST_MODE.mode,
    eventType: parsed.type ?? null,
    ok: parsed.ok,
    reason:
      parsed.reason ??
      'Test stub: event mil gaya, lekin koi plan change nahi hua. ' +
        'Asli webhook verification Cut 5 me Stripe keys ke saath aayegi.',
  });
}
