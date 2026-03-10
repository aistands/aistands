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
      .select('document_text, file_path, file_name, user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ success: false })
    }

    // Already has text — nothing to do
    if (project.document_text && project.document_text.length > 100) {
      return NextResponse.json({ success: true, alreadySaved: true })
    }

    // Download and extract
    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(project.file_path)

    if (storageError || !fileData) {
      return NextResponse.json({ success: false, error: storageError?.message })
    }

    const bytes = await fileData.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const extractRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          } as any,
          {
            type: 'text',
            text: 'Extract all text from this document preserving all clause numbers, titles and requirements. Be thorough.'
          }
        ]
      }]
    })

    const extracted = extractRes.content[0].type === 'text' ? extractRes.content[0].text : ''

    if (extracted.length > 100) {
      await supabase.from('projects').update({
        document_text: extracted.slice(0, 50000)
      }).eq('id', projectId)
      return NextResponse.json({ success: true, textLength: extracted.length })
    }

    return NextResponse.json({ success: false, error: 'No text extracted' })

  } catch (err: any) {
    console.error('Save text error:', err.message)
    return NextResponse.json({ success: false, error: err.message })
  }
}
