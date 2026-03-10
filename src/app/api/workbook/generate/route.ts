import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { projectId, userId } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get project
    const { data: project } = await supabase
      .from('projects')
      .select('document_text, file_path, file_name, user_id, name')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let documentText = project.document_text || ''

    // If no saved text, download and use PDF directly
    let pdfBase64 = ''
    if (!documentText || documentText.length < 100) {
      const { data: fileData } = await supabase.storage
        .from('documents')
        .download(project.file_path)
      if (fileData && project.file_name?.toLowerCase().endsWith('.pdf')) {
        const bytes = await fileData.arrayBuffer()
        pdfBase64 = Buffer.from(bytes).toString('base64')
      } else if (fileData) {
        documentText = await fileData.text()
      }
    }

    // Build message content
    const prompt = `You are a compliance expert. Analyse this standards document and extract ALL key requirements into a structured workbook.

For each requirement clause, return a JSON object with:
- clause: the clause number (e.g. "4.1", "B.10", "Annex A")
- title: short title of the clause
- requirement: the actual requirement text in plain English (1-3 sentences)
- compliance_notes: empty string (user will fill this in)

Return ONLY a valid JSON array of these objects. No preamble, no markdown, no explanation.
Extract at least 15-30 entries covering all major clauses.

Example format:
[
  {
    "clause": "4.1",
    "title": "Understanding the organisation",
    "requirement": "The organisation shall determine external and internal issues relevant to its purpose and strategic direction.",
    "compliance_notes": ""
  }
]`

    let messageContent: any[]
    if (pdfBase64) {
      messageContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: prompt }
      ]
    } else {
      messageContent = [{
        type: 'text',
        text: `Document:\n\n${documentText.slice(0, 40000)}\n\n${prompt}`
      }]
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: messageContent }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON — strip any markdown fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let entries = []
    try {
      entries = JSON.parse(clean)
    } catch (e) {
      // Try to extract JSON array from response
      const match = clean.match(/\[[\s\S]*\]/)
      if (match) entries = JSON.parse(match[0])
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Could not parse workbook entries' }, { status: 500 })
    }

    // Add project_id and user_id to each entry
    const withIds = entries.map((e: any) => ({
      project_id: projectId,
      user_id: userId,
      clause: e.clause || '',
      title: e.title || '',
      requirement: e.requirement || '',
      notes: e.compliance_notes || '',
      created_at: new Date().toISOString()
    }))

    // Delete existing entries for this project first
    await supabase.from('workbook_entries').delete().eq('project_id', projectId)

    // Insert new entries
    const { data: inserted, error: insertError } = await supabase
      .from('workbook_entries')
      .insert(withIds)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ entries: inserted, count: inserted?.length })

  } catch (err: any) {
    console.error('Workbook error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
