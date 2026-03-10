import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ text: '' })

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default
      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await pdfParse(buffer)
      const raw = parsed.text || ''

      // Clean up PDF extraction noise
      const cleaned = raw
        .replace(/\.{3,}/g, '')           // remove dot leaders ........
        .replace(/^\s*\d{1,3}\s*$/gm, '') // remove standalone page numbers
        .replace(/^[\s\-_=]{0,3}$/gm, '') // remove blank/decorative lines
        .replace(/\n{3,}/g, '\n\n')        // collapse excess newlines
        .split('\n')
        .filter((line: string) => line.trim().length > 3 || line.trim() === '')
        .join('\n')
        .trim()

      return NextResponse.json({ text: cleaned })

    } else if (file.name.toLowerCase().endsWith('.rtf')) {
      const raw = await file.text()
      const cleaned = raw
        .replace(/\{\\rtf[\s\S]*?(?=\w)/, '')
        .replace(/\\[a-zA-Z]+\d*[ ]?/g, '')
        .replace(/[{}\\]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      return NextResponse.json({ text: cleaned })

    } else {
      const text = await file.text()
      return NextResponse.json({ text })
    }

  } catch (err: any) {
    console.error('Extract text error:', err)
    return NextResponse.json({ text: '', error: err.message })
  }
}
