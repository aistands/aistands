import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, question, history, userId } = body

    // If userId is passed directly from client, use service role to bypass auth
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userError || !userData?.user) {
      return NextResponse.json({ answer: 'Authentication failed. Please log out and log in again.' })
    }

    // Get project
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('document_text, file_path, file_name, user_id, query_count')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== userId) {
      return NextResponse.json({ answer: 'Project not found.' })
    }

    let documentText = project.document_text || ''

    // If no text stored yet, extract from the stored PDF
    if (!documentText || documentText.length < 100) {
      try {
        const { data: fileData } = await supabaseAdmin.storage
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

          if (documentText.length > 100) {
            await supabaseAdmin.from('projects').update({
              document_text: documentText.slice(0, 50000)
            }).eq('id', projectId)
          }
        } else if (fileData) {
          documentText = await fileData.text()
        }
      } catch (extractErr: any) {
        console.error('Extraction error:', extractErr)
        return NextResponse.json({ answer: `PDF extraction failed: ${extractErr.message}` })
      }
    }

    if (!documentText || documentText.length < 50) {
      return NextResponse.json({
        answer: "I wasn't able to read the document. Please delete this project and re-upload the PDF."
      })
    }

    // Query Claude
    const messages: any[] = [
      ...(history || []).slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: `Document:\n\n<document>\n${documentText.slice(0, 40000)}\n</document>\n\nQuestion: ${question}`
      }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are AIstands, an expert AI assistant specialising in standards, regulations and compliance documents. 
Answer questions clearly and accurately in plain English. Always reference specific clause numbers where relevant. 
Be precise — compliance professionals rely on your answers. If unsure, say so honestly.`,
      messages,
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'No response generated.'

    await supabaseAdmin.from('projects').update({
      query_count: (project.query_count || 0) + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer })

  } catch (err: any) {
    console.error('Query error:', err)
    return NextResponse.json({ answer: `Something went wrong: ${err.message}` })
  }
}
