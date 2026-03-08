import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ text: '' })

    // For text files
    if (file.type === 'text/plain') {
      const text = await file.text()
      return NextResponse.json({ text })
    }

    // For PDFs — send to Anthropic to extract text via vision
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'pdfs-2024-09-25',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                }
              },
              {
                type: 'text',
                text: 'Extract and return all the text content from this document. Return only the text, no commentary.'
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      return NextResponse.json({ text })
    }

    // Fallback for other file types
    const text = await file.text()
    return NextResponse.json({ text })

  } catch (err) {
    console.error('Text extraction error:', err)
    return NextResponse.json({ text: '' })
  }
}
