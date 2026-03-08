import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ text: '' })

    // Plain text files
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      return NextResponse.json({ text })
    }

    // PDFs — extract in chunks to avoid timeout
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      // If file is large (>1MB), just extract key sections
      const isLarge = file.size > 1000000

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: isLarge ? 3000 : 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            } as any,
            {
              type: 'text',
              text: isLarge
                ? 'This is a large standards document. Extract the most important content: all clause numbers and their titles, key requirements (shall statements), and any definitions. Preserve clause numbering. Be thorough but focus on requirements.'
                : 'Extract all text from this document. Return only the text content, preserving clause numbers and structure.'
            }
          ]
        }]
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      return NextResponse.json({ text })
    }

    // Fallback
    try {
      const text = await file.text()
      return NextResponse.json({ text })
    } catch {
      return NextResponse.json({ text: '' })
    }

  } catch (err: any) {
    console.error('Extract text error:', err)
    return NextResponse.json({ text: '', error: err.message })
  }
}
