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
      .select('document_text, file_path, file_name, user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ success: false })
    }

    if (project.document_text && project.document_text.length > 500) {
      return NextResponse.json({ success: true, alreadySaved: true })
    }

    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(project.file_path)

    if (storageError || !fileData) {
      return NextResponse.json({ success: false, error: storageError?.message })
    }

    let extracted = ''

    if (project.file_name?.toLowerCase().endsWith('.pdf')) {
      // Use Claude to extract clean structured text from PDF
      const bytes = await fileData.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            } as any,
            {
              type: 'text',
              text: `Extract the full text content of this standards document. 
Rules:
- Preserve all clause numbers exactly (e.g. 4.1, B.10, Annex A)
- Keep section titles and headings
- Keep all requirement text word for word
- Skip table of contents, page numbers, headers/footers, and dot leaders (.........)
- Use double newlines between sections
- Do not summarise — extract the actual text`
            }
          ]
        }]
      })

      extracted = response.content[0].type === 'text' ? response.content[0].text : ''

    } else if (project.file_name?.toLowerCase().endsWith('.rtf')) {
      // Strip RTF formatting tags to get plain text
      const raw = await fileData.text()
      extracted = raw
        .replace(/\{\\rtf[^}]*\}/g, '')
        .replace(/\\[a-z]+\d*\s?/g, '')
        .replace(/[{}]/g, '')
        .replace(/\\\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    } else {
      extracted = await fileData.text()
    }

    if (extracted.length > 100) {
      await supabase.from('projects').update({
        document_text: extracted
      }).eq('id', projectId)
      return NextResponse.json({ success: true, textLength: extracted.length })
    }

    return NextResponse.json({ success: false, error: 'No text extracted' })

  } catch (err: any) {
    console.error('Save text error:', err.message)
    return NextResponse.json({ success: false, error: err.message })
  }
}
