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

    const prompt = `You are a compliance expert. Analyse this standards document and extract ALL clauses and requirements into a structured list.

Be EXHAUSTIVE — include every clause, sub-clause and requirement. Do not skip anything.

Return ONLY a valid JSON array. Each item must have:
- clause: clause number exactly as written (e.g. "4.1", "B.10.3", "Annex A")
- title: the clause title
- requirement: the full requirement text, word for word from the document

Return at least 30 entries. No preamble, no markdown fences, just the JSON array.`

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

    let suggestions = []
    try {
      suggestions = JSON.parse(clean)
    } catch {
      const match = clean.match(/\[[\s\S]*\]/)
      if (match) suggestions = JSON.parse(match[0])
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ error: 'Could not parse suggestions' }, { status: 500 })
    }

    // Return as suggestions only — user reviews before saving
    return NextResponse.json({ suggestions })

  } catch (err: any) {
    console.error('Workbook suggest error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
