// src/app/api/iso/search/route.ts
// Searches iso_standards_cache. Falls back to ISO OData API if cache is empty.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  // Try local cache first
  const { data: cached, error } = await supabase
    .from('iso_standards_cache')
    .select('reference, title, status, edition, publication_date, tc_reference, iso_url')
    .or(`reference.ilike.%${q}%,title.ilike.%${q}%`)
    .not('status', 'ilike', '%withdrawn%')
    .order('reference')
    .limit(20)

  if (!error && cached && cached.length > 0) {
    return NextResponse.json({ results: cached, source: 'cache' })
  }

  // Cache empty — try ISO public OData endpoint as fallback
  // ISO provides a public OData v4 API at publicdata.iso.org
  try {
    const encoded = encodeURIComponent(q)
    const odataUrl = `https://publicdata.iso.org/api/Documents?$filter=contains(title,'${encoded}') or contains(reference,'${encoded}')&$top=20&$select=reference,title,status,publicationDate`
    const res = await fetch(odataUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 }
    })
    if (res.ok) {
      const json = await res.json()
      const results = (json.value || []).map((item: any) => ({
        reference: item.reference,
        title: item.title,
        status: item.status,
        publication_date: item.publicationDate,
        iso_url: `https://www.iso.org/standard/${item.reference?.replace(/\s+/g,'-')}.html`,
      }))
      return NextResponse.json({ results, source: 'odata' })
    }
  } catch {}

  // Final fallback — return empty, suggest sync
  return NextResponse.json({ results: [], source: 'empty', needsSync: true })
}
