import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { projectId, question, history, userId } = await req.json()

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

    // Build messages array
    const conversationHistory = (history || []).slice(-6).map((m: any) => ({
      role: m.role,
      content: m.content
    }))

    let response

    // If we have saved text, use it directly — fast path
    if (project.document_text && project.document_text.length > 100) {
      const messages: any[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: `Document:\n\n<document>\n${project.document_text.slice(0, 40000)}\n</document>\n\nQuestion: ${question}`
        }
      ]
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are AIstands, an expert AI assistant for standards and compliance. Answer clearly in plain English, reference clause numbers. Be precise.`,
        messages,
      })
    } else {
      // No saved text — send the PDF directly to Claude
      const { data: fileData, error: storageError } = await supabase.storage
        .from('documents')
        .download(project.file_path)

      if (storageError || !fileData) {
        return NextResponse.json({ answer: `Could not access the document. Storage error: ${storageError?.message}` })
      }

      const bytes = await fileData.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')

      const messages: any[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            } as any,
            {
              type: 'text',
              text: question
            }
          ]
        }
      ]

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are AIstands, an expert AI assistant for standards and compliance. Answer clearly in plain English, reference clause numbers. Be precise.`,
        messages,
      })

      // Save extracted knowledge for future queries
      const answer = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Also save a summary of the doc so future queries are faster
      try {
        const summaryRes = await anthropic.messages.create({
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
                text: 'Extract all text from this document preserving all clause numbers, requirements and structure. Be thorough.'
              }
            ]
          }]
        })
        const extractedText = summaryRes.content[0].type === 'text' ? summaryRes.content[0].text : ''
        if (extractedText.length > 100) {
          await supabase.from('projects').update({
            document_text: extractedText.slice(0, 50000)
          }).eq('id', projectId)
        }
      } catch (e) {
        // Non-critical — just means next query will also use PDF directly
        console.log('Background extraction failed, will retry next query')
      }

      await supabase.from('projects').update({
        query_count: (project.query_count || 0) + 1
      }).eq('id', projectId)

      return NextResponse.json({ answer })
    }

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'No response.'

    await supabase.from('projects').update({
      query_count: (project.query_count || 0) + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer })

  } catch (err: any) {
    console.error('Query error:', err.message)
    return NextResponse.json({ answer: `Error: ${err.message}` })
  }
}
