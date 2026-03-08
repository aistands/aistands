import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { projectId, question, history, userId, useWebSearch } = await req.json()

    if (!userId) return NextResponse.json({ answer: 'Please refresh the page and try again.' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: project } = await supabase
      .from('projects')
      .select('document_text, file_path, file_name, user_id, query_count')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ answer: 'Project not found.' })
    }

    const conversationHistory = (history || []).slice(-4).map((m: any) => ({
      role: m.role,
      content: m.content
    }))

    const system = `You are AIstands, an expert AI assistant for standards and compliance professionals.

Your job:
- Answer questions clearly and accurately in plain English
- Always reference specific clause numbers from the document when relevant
- Be precise — compliance professionals rely on your answers for real decisions
- If using web sources, clearly distinguish between what the document says vs external guidance
- If unsure about something, say so honestly${useWebSearch ? `
- When using web search, prioritise official sources: standards bodies (ISO, BSI, ANSI), certification bodies (UKAS, IAQG), government regulators, and established quality/compliance organisations
- Always make clear which parts of your answer come from the uploaded document vs web sources` : ''}`

    let answer = ''

    if (project.document_text && project.document_text.length > 100) {
      // Fast path — use saved text
      const userMessage = useWebSearch
        ? `Using the document below AND web search for supporting guidance, answer this question. Clearly label what comes from the document vs web sources.\n\nDocument:\n<document>\n${project.document_text.slice(0, 25000)}\n</document>\n\nQuestion: ${question}`
        : `Document:\n\n<document>\n${project.document_text.slice(0, 30000)}\n</document>\n\nQuestion: ${question}`

      const messages: any[] = [
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ]

      const requestParams: any = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages,
      }

      if (useWebSearch) {
        requestParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
      }

      const response = await anthropic.messages.create(requestParams)
      answer = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')

    } else {
      // No saved text — send PDF directly
      const { data: fileData, error: storageError } = await supabase.storage
        .from('documents')
        .download(project.file_path)

      if (storageError || !fileData) {
        return NextResponse.json({ answer: `Could not access document: ${storageError?.message}` })
      }

      const bytes = await fileData.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      const userContent: any[] = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        {
          type: 'text',
          text: useWebSearch
            ? `Answer this question using both the document above AND web search for supporting guidance. Clearly label what comes from the document vs web sources.\n\nQuestion: ${question}`
            : question
        }
      ]

      const requestParams: any = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages: [
          ...conversationHistory,
          { role: 'user', content: userContent }
        ],
      }

      if (useWebSearch) {
        requestParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
      }

      const response = await anthropic.messages.create(requestParams)
      answer = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')

      // Background text extraction after delay
      setTimeout(async () => {
        try {
          const extractRes = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
                { type: 'text', text: 'Extract all text from this document preserving clause numbers and requirements.' }
              ]
            }]
          })
          const extracted = extractRes.content[0].type === 'text' ? extractRes.content[0].text : ''
          if (extracted.length > 100) {
            await supabase.from('projects').update({
              document_text: extracted.slice(0, 50000)
            }).eq('id', projectId)
          }
        } catch (e) {
          console.log('Background extraction skipped')
        }
      }, 10000)
    }

    await supabase.from('projects').update({
      query_count: (project.query_count || 0) + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer, webSearchUsed: useWebSearch })

  } catch (err: any) {
    console.error('Query error:', err.message)
    if (err.message?.includes('rate_limit')) {
      return NextResponse.json({ answer: 'The AI is busy right now. Please wait 30 seconds and try again.' })
    }
    return NextResponse.json({ answer: `Error: ${err.message}` })
  }
}
