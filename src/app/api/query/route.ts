import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Extract the most relevant chunks from document text based on the question
function extractRelevantChunks(documentText: string, question: string, maxChars: number = 12000): string {
  const q = question.toLowerCase()

  // Split into paragraphs/sections
  const sections = documentText.split(/\n{2,}/).filter(s => s.trim().length > 20)

  // Score each section by relevance to the question
  const keywords = q
    .replace(/[^a-z0-9\s.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)

  const scored = sections.map(section => {
    const s = section.toLowerCase()
    let score = 0
    for (const kw of keywords) {
      if (s.includes(kw)) score += 1
      // Boost exact clause/section references like "B.10", "7.2", "clause 4"
      if (/^[a-z]?\d+[\.\d]*|^clause|^section|^annex/i.test(kw) && s.includes(kw)) score += 5
    }
    return { section, score }
  })

  // Sort by score, take top sections up to maxChars
  const top = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  let result = ''
  const used = new Set<string>()

  // Always include high-scoring sections first
  for (const { section } of top) {
    if (used.has(section)) continue
    if (result.length + section.length > maxChars) break
    result += section + '\n\n'
    used.add(section)
  }

  // If we got very little, fall back to first 8000 chars (intro/scope likely relevant)
  if (result.length < 500) {
    result = documentText.slice(0, 8000)
  }

  return result.trim()
}

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
You have been provided with relevant sections from a standards document uploaded by the user.
Answer questions clearly and accurately in plain English.
Always reference specific clause numbers when relevant.
Be precise — compliance professionals rely on your answers.
If the specific section asked about is not in the provided text, say "that section wasn't found in the extracted text — try re-uploading the document."
If using web sources, clearly label what comes from the document vs the web.`

    let answer = ''
    let needsTextSave = false

    if (project.document_text && project.document_text.length > 100) {
      // Smart chunking — only send relevant sections
      const relevantText = extractRelevantChunks(project.document_text, question)
      console.log(`Sending ${relevantText.length} chars (of ${project.document_text.length} total)`)

      const userMessage = useWebSearch
        ? `Using the document sections below AND web search, answer this question. Label sources.\n\nRelevant document sections:\n<document>\n${relevantText}\n</document>\n\nQuestion: ${question}`
        : `Relevant document sections:\n\n<document>\n${relevantText}\n</document>\n\nQuestion: ${question}`

      const requestParams: any = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages: [...conversationHistory, { role: 'user', content: userMessage }],
      }
      if (useWebSearch) {
        requestParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
      }

      const response = await anthropic.messages.create(requestParams)
      answer = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')

    } else {
      // No saved text — send PDF directly (first query only)
      needsTextSave = true

      const { data: fileData, error: storageError } = await supabase.storage
        .from('documents')
        .download(project.file_path)

      if (storageError || !fileData) {
        return NextResponse.json({ answer: `Could not access document: ${storageError?.message}` })
      }

      const bytes = await fileData.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      const requestParams: any = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
              { type: 'text', text: useWebSearch ? `Answer using the document AND web search. Label sources.\n\nQuestion: ${question}` : question }
            ]
          }
        ],
      }
      if (useWebSearch) {
        requestParams.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
      }

      const response = await anthropic.messages.create(requestParams)
      answer = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    }

    await supabase.from('projects').update({
      query_count: (project.query_count || 0) + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer, needsTextSave, webSearchUsed: useWebSearch })

  } catch (err: any) {
    console.error('Query error:', err.message)
    if (err.message?.includes('rate_limit')) {
      return NextResponse.json({ answer: 'The AI is busy right now — please wait 30 seconds and try again.' })
    }
    return NextResponse.json({ answer: `Error: ${err.message}` })
  }
}
