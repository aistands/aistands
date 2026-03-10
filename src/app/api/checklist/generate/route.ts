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

    const { data: project } = await supabase
      .from('projects')
      .select('document_text, file_path, file_name, user_id, name')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if checklist already exists — return existing if so
    const { data: existing } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', projectId)
      .order('clause')

    if (existing && existing.length > 0) {
      return NextResponse.json({ items: existing, cached: true })
    }

    let documentText = project.document_text || ''
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

    const prompt = `You are a lead auditor preparing an audit readiness checklist for this standards document.

For each major clause and requirement, create an audit readiness question that a compliance manager can use to assess their preparedness.

Return ONLY a valid JSON array. Each item must have:
- clause: the clause number (e.g. "4.1", "B.10")
- requirement: one sentence describing what the clause requires
- audit_question: a specific question phrased as an auditor would ask it (e.g. "Can you demonstrate documented evidence of...?", "Is there a documented procedure for...?", "Who is the designated responsible person for...?")
- responsible_person: empty string
- evidence_ref: empty string  
- status: "red"

Generate 20-40 items covering all major clauses. No preamble, no markdown, just the JSON array.`

    const messageContent: any[] = pdfBase64
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: prompt }
        ]
      : [{ type: 'text', text: `Document:\n\n${documentText.slice(0, 40000)}\n\n${prompt}` }]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: messageContent }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let items = []
    try {
      items = JSON.parse(clean)
    } catch {
      const match = clean.match(/\[[\s\S]*\]/)
      if (match) items = JSON.parse(match[0])
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Could not generate checklist' }, { status: 500 })
    }

    const records = items.map((item: any) => ({
      project_id: projectId,
      user_id: userId,
      clause: item.clause || '',
      requirement: item.requirement || '',
      audit_question: item.audit_question || '',
      responsible_person: '',
      evidence_ref: '',
      status: 'red',
      completed: false,
      created_at: new Date().toISOString()
    }))

    // Save permanently
    const { data: inserted, error: insertError } = await supabase
      .from('checklist_items')
      .insert(records)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ items: inserted, count: inserted?.length })

  } catch (err: any) {
    console.error('Checklist error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
