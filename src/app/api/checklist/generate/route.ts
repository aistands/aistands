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

    // Return cached checklist if already generated
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

    // Keep prompt compact to stay within timeout
    const prompt = `You are a lead auditor. Create an audit readiness checklist from this standards document.

For each clause return a JSON object with ONLY these fields (keep values short):
- clause: clause number e.g. "4.1"
- requirement: max 10 words describing what is required
- audit_question: one short auditor question e.g. "Is there documented evidence of X?"
- status: "red"

Cover all clauses including annexes. Return ONLY a JSON array, no markdown.`

    const messageContent: any[] = pdfBase64
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } } as any,
          { type: 'text', text: prompt }
        ]
      : [{ type: 'text', text: `Document:\n\n${documentText.slice(0, 120000)}\n\n${prompt}` }]

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

    // Delete old entries and insert new
    await supabase.from('checklist_items').delete().eq('project_id', projectId)
    const { data: inserted, error: insertError } = await supabase
      .from('checklist_items')
      .insert(records)
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ items: inserted, count: inserted?.length })

  } catch (err: any) {
    console.error('Checklist error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
