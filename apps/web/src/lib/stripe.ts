import { loadStripe, Stripe } from '@stripe/stripe-js'

// Singleton — wird nur einmal geladen
let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key || key.includes('DEIN')) {
      console.warn('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY nicht gesetzt')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

// Test-Modus erkennen
export const isTestMode = () =>
  (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_test_')
