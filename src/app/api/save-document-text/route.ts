import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

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

    if (project.document_text && project.document_text.length > 100) {
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
      // Use pdf-parse to extract text without calling Claude
      const pdfParse = (await import('pdf-parse')).default
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const parsed = await pdfParse(buffer)
      extracted = parsed.text || ''
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
