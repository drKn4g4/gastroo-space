import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Client-side Stripe.js loader singleton.
 * Call once — subsequent calls return the same Promise.
 */
export function getStripe() {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    if (!publishableKey) {
      console.warn('Stripe publishable key is missing from environment variables.');
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
