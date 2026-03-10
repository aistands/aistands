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
      const pdfParse = (await import('pdf-parse')).default
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const parsed = await pdfParse(buffer)
      const raw = parsed.text || ''

      extracted = raw
        .replace(/\.{3,}/g, '')
        .replace(/^\s*\d{1,3}\s*$/gm, '')
        .replace(/^[\s\-_=]{0,3}$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .filter((line: string) => line.trim().length > 3 || line.trim() === '')
        .join('\n')
        .trim()

    } else if (project.file_name?.toLowerCase().match(/\.rtf$/)) {
      const raw = await fileData.text()
      extracted = raw
        .replace(/\{\\rtf[\s\S]*?(?=\w)/, '')
        .replace(/\\[a-zA-Z]+\d*[ ]?/g, '')
        .replace(/[{}\\]/g, '')
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
