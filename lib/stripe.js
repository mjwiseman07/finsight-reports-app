import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set. Add it to .env.local.');
}

// Singleton Stripe client — reused across API routes.
// API version pinned to match the webhook destination version in Stripe.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  typescript: false,
  appInfo: {
    name: 'Advisacor',
    version: '1.0.0',
    url: 'https://advisacor.com',
  },
});

export default stripe;
