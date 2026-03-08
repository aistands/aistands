import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { priceId, plan } = await req.json()
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await createCheckoutSession({
    userId: user.id,
    email: user.email!,
    priceId,
    plan,
  })

  return NextResponse.json({ url: session.url })
}
