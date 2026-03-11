// src/app/api/cron/iso-alerts/route.ts
// Runs on schedule via Vercel Cron.
// Finds changed standards, matches against subscriptions, sends emails.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(req: NextRequest) {
  // Vercel cron sends this header
  const cronSecret = req.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    // 1. First trigger a fresh sync
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/iso/sync`, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
    })

    // 2. Find standards that changed since last alert run
    // We look for records where last_seen_at is recent and hash differs from what users last saw
    // Simple approach: find all subscribed standards and check for changes in past 7 days

    const { data: subscriptions } = await supabase
      .from('iso_alert_subscriptions')
      .select('user_id, standard_ref, standard_title, frequency')
      .eq('active', true)

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions' })
    }

    // Get unique standards being watched
    const watchedRefs = [...new Set(subscriptions.map(s => s.standard_ref))]

    // Get latest data for those standards
    const { data: standards } = await supabase
      .from('iso_standards_cache')
      .select('reference, title, status, edition, publication_date, iso_url, snapshot_hash')
      .in('reference', watchedRefs)

    if (!standards) return NextResponse.json({ message: 'No standards data' })

    // Get recently sent alerts to avoid duplicates
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLogs } = await supabase
      .from('iso_alert_log')
      .select('user_id, standard_ref, new_value')
      .gte('sent_at', sevenDaysAgo)

    const recentSet = new Set(
      recentLogs?.map(l => `${l.user_id}:${l.standard_ref}:${l.new_value}`) || []
    )

    // Group subscriptions by user
    const byUser = new Map<string, typeof subscriptions>()
    for (const sub of subscriptions) {
      if (!byUser.has(sub.user_id)) byUser.set(sub.user_id, [])
      byUser.get(sub.user_id)!.push(sub)
    }

    // Get user emails
    const userIds = [...byUser.keys()]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    let emailsSent = 0

    for (const [userId, subs] of byUser) {
      const profile = profileMap.get(userId)
      if (!profile?.email) continue

      // Determine which frequency applies today
      const today = new Date()
      const isMonday = today.getDay() === 1
      const isFirstOfMonth = today.getDate() === 1

      const updatesForUser: { standard: any; sub: any; changeType: string; detail: string }[] = []

      for (const sub of subs) {
        // Skip based on frequency
        if (sub.frequency === 'weekly' && !isMonday) continue
        if (sub.frequency === 'monthly' && !isFirstOfMonth) continue

        const standard = standards.find(s => s.reference === sub.standard_ref)
        if (!standard) continue

        const dedupeKey = `${userId}:${standard.reference}:${standard.snapshot_hash}`
        if (recentSet.has(dedupeKey)) continue

        // Determine what changed
        let changeType = 'updated'
        let detail = ''

        if (standard.status?.toLowerCase().includes('withdraw')) {
          changeType = 'withdrawn'; detail = `This standard has been withdrawn.`
        } else if (standard.edition) {
          changeType = 'new_edition'; detail = `Edition ${standard.edition} · Published ${standard.publication_date}`
        } else {
          changeType = 'status_change'; detail = `Status: ${standard.status}`
        }

        updatesForUser.push({ standard, sub, changeType, detail })
      }

      if (updatesForUser.length === 0) continue

      // Build and send email
      const html = buildEmailHtml({
        userName: profile.full_name || profile.email,
        updates: updatesForUser,
      })

      const { error: emailError } = await resend.emails.send({
        from: 'standards.online <alerts@standards.online>',
        to: profile.email,
        subject: `${updatesForUser.length} ISO standard update${updatesForUser.length > 1 ? 's' : ''} for you`,
        html,
      })

      if (!emailError) {
        emailsSent++
        // Log alerts sent
        for (const u of updatesForUser) {
          await supabase.from('iso_alert_log').insert({
            user_id: userId,
            standard_ref: u.standard.reference,
            change_type: u.changeType,
            new_value: u.standard.snapshot_hash,
            email_sent: true,
            sent_at: new Date().toISOString(),
          })
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent })

  } catch (err: any) {
    console.error('Alerts cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildEmailHtml({ userName, updates }: { userName: string; updates: any[] }) {
  const updateRows = updates.map(({ standard, changeType, detail }) => {
    const badgeColor = changeType === 'withdrawn' ? '#b91c1c' :
                       changeType === 'new_edition' ? '#15803d' : '#b45309'
    const badgeLabel = changeType === 'withdrawn' ? 'Withdrawn' :
                       changeType === 'new_edition' ? 'New Edition' : 'Updated'
    return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #EAE0D6">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-family:Epilogue,sans-serif;font-weight:800;font-size:15px;color:#1C1410">${standard.reference}</span>
                <span style="background:${badgeColor}15;border:1px solid ${badgeColor}30;color:${badgeColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;font-family:Epilogue,sans-serif;letter-spacing:0.06em;text-transform:uppercase">${badgeLabel}</span>
              </div>
              <p style="font-size:13px;color:#5C4D43;margin:0 0 4px;font-weight:300">${standard.title}</p>
              <p style="font-size:12px;color:#9C8C83;margin:0">${detail}</p>
            </div>
          </div>
          <a href="${standard.iso_url}" style="display:inline-block;margin-top:10px;font-size:12px;color:#E8631A;text-decoration:none;font-weight:600">View on ISO.org →</a>
        </td>
      </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@300;400;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F5EDE3;font-family:'DM Sans',sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#FFFAF6;border-radius:16px;overflow:hidden;border:1px solid #EAE0D6">

    <!-- Header -->
    <div style="background:#0B1E3E;padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-family:'Epilogue',sans-serif;font-size:20px;letter-spacing:-0.03em">
        <span style="font-weight:800;color:#fff">standards</span><span style="font-weight:800;color:#F57332">.</span><span style="font-weight:300;color:rgba(255,255,255,0.45)">online</span>
      </span>
      <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);font-family:'Epilogue',sans-serif">ISO Alert</span>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <h1 style="font-family:'Epilogue',sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.03em;color:#1C1410;margin:0 0 6px">
        ${updates.length} standard update${updates.length > 1 ? 's' : ''} for you
      </h1>
      <p style="font-size:14px;color:#9C8C83;margin:0 0 28px;font-weight:300">
        Hi ${userName}, here are the latest changes to the ISO standards you're watching.
      </p>

      <table style="width:100%;border-collapse:collapse">
        ${updateRows}
      </table>

      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #EAE0D6">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts"
          style="display:inline-block;background:#E8631A;color:#fff;padding:12px 24px;border-radius:9px;font-size:14px;font-weight:600;text-decoration:none;font-family:'DM Sans',sans-serif">
          Manage your alerts →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #EAE0D6;background:#FDF4EC">
      <p style="font-size:12px;color:#9C8C83;margin:0">
        You're receiving this because you subscribed to ISO standard alerts on standards.online.
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts" style="color:#E8631A;text-decoration:none">Manage preferences</a>
      </p>
    </div>

  </div>
</body>
</html>
  `
}
