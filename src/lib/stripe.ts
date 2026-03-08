import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

export const PLANS = {
  free: {
    name: 'Explorer',
    queries: 5,
    projects: 1,
    uploads: 1,
  },
  professional: {
    name: 'Professional',
    queries: 100,
    projects: 5,
    uploads: 5,
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID!,
  },
  team: {
    name: 'Team',
    queries: -1, // unlimited
    projects: 20,
    uploads: -1, // unlimited
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID!,
    annual:  process.env.STRIPE_TEAM_ANNUAL_PRICE_ID!,
  },
}

export async function createCheckoutSession({
  userId,
  email,
  priceId,
  plan,
}: {
  userId: string
  email: string
  priceId: string
  plan: string
}) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  })
  return session
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  })
  return session
}
