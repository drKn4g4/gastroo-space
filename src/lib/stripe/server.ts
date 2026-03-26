import Stripe from 'stripe';

/**
 * Stripe server-side singleton.
 * Uses global cache to survive HMR in development (same pattern as firebase/admin.ts).
 */
const globalStripe = globalThis as typeof globalThis & { __stripe?: Stripe };

if (!globalStripe.__stripe) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  globalStripe.__stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    typescript: true,
  });
}

export const stripe = globalStripe.__stripe;

/** Application fee percentage Gastroo takes on Connect payments */
export const APPLICATION_FEE_PERCENT = parseFloat(
  process.env.STRIPE_APPLICATION_FEE_PERCENT ?? '1.5',
);
