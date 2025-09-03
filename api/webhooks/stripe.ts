import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { handleStripeWebhook as handleStripeWebhookShared } from '../../src/lib/webhooks';

// Create Stripe and Supabase clients using server-side credentials
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn('SUPABASE_URL/VITE_SUPABASE_URL is not set. Server updates will fail.');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Server updates will fail.');
}

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err: any) => reject(err));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client is not initialized');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed', err?.message || err);
    return res.status(400).json({ error: `Webhook Error: ${err?.message || 'invalid signature'}` });
  }

  try {
    await handleStripeWebhookShared(
      { id: event.id, type: event.type, data: { object: (event.data as any).object } },
      supabaseAdmin as any
    );
  } catch (err) {
    console.error('Stripe webhook handler error', err);
    return res.status(500).json({ received: true, error: 'Processing error' });
  }

  return res.status(200).json({ received: true });
}