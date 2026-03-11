// src/app/api/iso/subscriptions/route.ts
// GET  — list user's subscriptions
// POST — add subscription
// DELETE — remove subscription

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const { data, error } = await supabase
    .from('iso_alert_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscriptions: data })
}

export async function POST(req: NextRequest) {
  const { userId, standardRef, standardTitle, frequency } = await req.json()
  if (!userId || !standardRef) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('iso_alert_subscriptions')
    .upsert({
      user_id: userId,
      standard_ref: standardRef,
      standard_title: standardTitle || standardRef,
      frequency: frequency || 'weekly',
      active: true,
    }, { onConflict: 'user_id,standard_ref' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: data })
}

export async function DELETE(req: NextRequest) {
  const { userId, standardRef } = await req.json()
  if (!userId || !standardRef) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await supabase
    .from('iso_alert_subscriptions')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('standard_ref', standardRef)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
