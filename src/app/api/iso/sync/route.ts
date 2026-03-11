// src/app/api/iso/sync/route.ts
// Fetches the ISO deliverables CSV and upserts into iso_standards_cache
// Called by the cron job, or manually via POST /api/iso/sync

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ISO Open Data — deliverables CSV
// Source: https://www.iso.org/open-data.html
const ISO_CSV_URL = 'https://isopublicstorageprod.blob.core.windows.net/opendata/_latest/iso_deliverables_metadata/csv/iso_deliverables_metadata.csv'

function hash(str: string) {
  return crypto.createHash('md5').update(str).digest('hex')
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim()); current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(req: NextRequest) {
  // Verify this is called from cron or internally
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    console.log('ISO sync: fetching CSV...')
    const res = await fetch(ISO_CSV_URL, {
      headers: { 'User-Agent': 'standards.online/1.0 (compliance platform)' }
    })

    if (!res.ok) {
      throw new Error(`ISO CSV fetch failed: ${res.status} ${res.statusText}`)
    }

    const text = await res.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) throw new Error('CSV appears empty')

    // Parse header to find column indices
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))
    console.log('ISO CSV headers:', headers)

    const idx = (name: string) => {
      const variations = [name, name.replace(/_/g, ''), name.replace(/_/g, ' ')]
      for (const v of variations) {
        const i = headers.findIndex(h => h.includes(v))
        if (i >= 0) return i
      }
      return -1
    }

    // Map likely column names from the ISO dataset
    const colRef     = idx('reference') >= 0 ? idx('reference') : idx('deliverable_ref')
    const colTitle   = idx('title') >= 0 ? idx('title') : idx('title_en')
    const colStatus  = idx('status')
    const colEdition = idx('edition')
    const colPubDate = idx('publication') >= 0 ? idx('publication') : idx('date')
    const colTC      = idx('committee') >= 0 ? idx('committee') : idx('tc_')
    const colICS     = idx('ics')

    if (colRef < 0 || colTitle < 0) {
      throw new Error(`Could not find reference/title columns. Headers: ${headers.join(', ')}`)
    }

    // Build upsert batch
    const records: any[] = []
    const changedRefs: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.length < 3) continue

      const reference = cols[colRef]?.replace(/"/g, '').trim()
      if (!reference || !reference.startsWith('ISO')) continue

      const title        = cols[colTitle]?.trim() || ''
      const status       = colStatus >= 0 ? cols[colStatus]?.trim() : ''
      const edition      = colEdition >= 0 ? cols[colEdition]?.trim() : ''
      const pubDate      = colPubDate >= 0 ? cols[colPubDate]?.trim() : ''
      const tc           = colTC >= 0 ? cols[colTC]?.trim() : ''
      const ics          = colICS >= 0 ? cols[colICS]?.trim() : ''
      const isoUrl       = `https://www.iso.org/standard/${reference.replace(/\s+/g, '-').toLowerCase()}.html`
      const newHash      = hash(`${status}|${edition}|${pubDate}`)

      records.push({
        reference,
        title,
        status,
        edition,
        publication_date: pubDate,
        tc_reference: tc,
        ics_codes: ics,
        iso_url: isoUrl,
        snapshot_hash: newHash,
        last_seen_at: new Date().toISOString(),
      })
    }

    // Detect changes by comparing hashes with existing records
    const { data: existing } = await supabase
      .from('iso_standards_cache')
      .select('reference, snapshot_hash, status, edition, publication_date')

    const existingMap = new Map(existing?.map(r => [r.reference, r]) || [])

    for (const rec of records) {
      const prev = existingMap.get(rec.reference)
      if (prev && prev.snapshot_hash !== rec.snapshot_hash) {
        changedRefs.push(rec.reference)
      }
    }

    // Deduplicate by reference (ISO CSV can contain duplicates)
    const seen = new Set<string>()
    const dedupedRecords = records.filter(r => {
      if (seen.has(r.reference)) return false
      seen.add(r.reference)
      return true
    })

    // Batch upsert in chunks of 500
    const CHUNK = 500
    for (let i = 0; i < dedupedRecords.length; i += CHUNK) {
      const chunk = dedupedRecords.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('iso_standards_cache')
        .upsert(chunk, { onConflict: 'reference' })
      if (error) throw error
    }

    // Log sync
    await supabase.from('iso_sync_meta').insert({
      records_synced: dedupedRecords.length,
      changes_found: changedRefs.length,
      synced_at: new Date().toISOString(),
    })

    console.log(`ISO sync complete: ${dedupedRecords.length} records, ${changedRefs.length} changes`)

    return NextResponse.json({
      success: true,
      records: dedupedRecords.length,
      changes: changedRefs.length,
      changedRefs: changedRefs.slice(0, 20), // preview
    })

  } catch (err: any) {
    console.error('ISO sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
