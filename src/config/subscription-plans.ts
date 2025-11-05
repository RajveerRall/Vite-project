/**
 * Subscription Plans Configuration
 * Hardcoded plans with direct DodoPayments checkout links
 * Plans don't change, so we hardcode them instead of fetching from database
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  minutes: number;
  price: number;
  currency?: string;
  type: 'one-time' | 'subscription';
  dodoProductId?: string; // DodoPayments product ID
  dodoPriceId?: string; // DodoPayments price ID (for checkout)
  checkoutUrl?: string; // Direct checkout URL (if available)
  description?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pack-8-hours',
    name: '8 Hours Reading Pack',
    minutes: 480,
    price: 0.99,
    currency: 'usd',
    type: 'one-time',
    dodoProductId: 'pdt_5M8Lxkn2sPl8QFLdvcQWM',
    checkoutUrl: 'https://test.checkout.dodopayments.com/buy/pdt_5M8Lxkn2sPl8QFLdvcQWM?quantity=1',
    description: 'Get 8 hours of premium TTS experience. Read at your pace and pay for only what you use. Minutes never expire and can be used anytime.',
  },
  {
    id: 'monthly-premium',
    name: 'Premium Monthly Plan',
    minutes: 3000, // 50 hours
    price: 5.00,
    currency: 'usd',
    type: 'subscription',
    dodoProductId: 'pdt_c782nCjrKrVYEVe26983x',
    checkoutUrl: 'https://test.checkout.dodopayments.com/buy/pdt_c782nCjrKrVYEVe26983x?quantity=1',
    description: '50 hours of premium text-to-speech narration every month for $5. Enjoy high-quality AI voices, seamless playback, and all premium features. Best for daily readers who want reliable access to narrated books.',
  },
] as const;

// Helper to get plans by type
export function getPlansByType(type: 'one-time' | 'subscription'): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(plan => plan.type === type);
}

// Helper to get plan by ID
export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === id);
}

// Helper to get subscription plans (excludes one-time packs)
export function getSubscriptionPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(plan => plan.type === 'subscription');
}

// Helper to get one-time packs
export function getOneTimePacks(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(plan => plan.type === 'one-time');
}

