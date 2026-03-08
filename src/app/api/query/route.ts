import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

// Increase timeout for PDF processing
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { projectId, question, history } = await req.json()
    const supabase = createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ answer: 'Please log in again.' })

    // Get project
    const { data: project } = await supabase
      .from('projects')
      .select('document_text, file_path, file_name, user_id, query_count')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ answer: 'Project not found.' })
    }

    let documentText = project.document_text || ''

    // If no text stored yet, extract from the stored PDF
    if (!documentText || documentText.length < 100) {
      try {
        const { data: fileData } = await supabase.storage
          .from('documents')
          .download(project.file_path)

        if (fileData && project.file_name?.toLowerCase().endsWith('.pdf')) {
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
                { type: 'text', text: 'Extract all the text from this document. Return only the text content, preserving clause numbers and structure.' }
              ]
            }]
          })

          documentText = extractRes.content[0].type === 'text' ? extractRes.content[0].text : ''

          // Save for future queries
          if (documentText.length > 100) {
            await supabase.from('projects').update({
              document_text: documentText.slice(0, 50000)
            }).eq('id', projectId)
          }
        } else if (fileData) {
          documentText = await fileData.text()
        }
      } catch (extractErr) {
        console.error('Extraction error:', extractErr)
      }
    }

    if (!documentText || documentText.length < 50) {
      return NextResponse.json({
        answer: "I wasn't able to read the document text. Please try deleting this project and re-uploading the PDF."
      })
    }

    // Query Claude with the document
    const messages: any[] = [
      ...(history || []).slice(-6).map((m: any) => ({
        role: m.role,
        content: m.content
      })),
      {
        role: 'user',
        content: `Document content:\n\n<document>\n${documentText.slice(0, 40000)}\n</document>\n\nQuestion: ${question}`
      }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are AIstands, an expert AI assistant specialising in standards, regulations and compliance documents. 
Answer questions clearly and accurately in plain English. Always reference specific clause numbers where relevant. 
Be precise — compliance professionals rely on your answers for real decisions. If you are unsure, say so honestly.`,
      messages,
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'No response generated.'

    // Increment query count
    await supabase.from('projects').update({
      query_count: (project.query_count || 0) + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer })

  } catch (err: any) {
    console.error('Query error:', err)
    return NextResponse.json({
      answer: `Something went wrong: ${err.message}. Please try again.`
    })
  }
}
