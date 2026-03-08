import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { projectId, question, history, language } = await req.json()
    const supabase = createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('document_text, file_path, file_name, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (project.user_id !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let documentText = project.document_text || ''

    // If no text was extracted yet, fetch the file from storage and extract now
    if (!documentText || documentText.length < 100) {
      const { data: fileData } = await supabase.storage.from('documents').download(project.file_path)
      if (fileData) {
        const isPdf = project.file_name?.toLowerCase().endsWith('.pdf')
        if (isPdf) {
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
                { type: 'text', text: 'Extract all text content from this document. Return only the text.' }
              ]
            }]
          })
          documentText = extractRes.content[0].type === 'text' ? extractRes.content[0].text : ''
        } else {
          documentText = await fileData.text()
        }

        // Save extracted text back to project
        if (documentText) {
          await supabase.from('projects').update({
            document_text: documentText.slice(0, 50000)
          }).eq('id', projectId)
        }
      }
    }

    if (!documentText) {
      return NextResponse.json({ answer: "I couldn't read the document text. Please try re-uploading your file." })
    }

    // Build conversation history
    const messages: any[] = [
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: `Here is the standard/document:\n\n<document>\n${documentText.slice(0, 40000)}\n</document>\n\nQuestion: ${question}`
      }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are AIstands, an expert AI assistant specialising in standards, regulations and compliance. 
Answer questions clearly and accurately, referencing specific clause numbers where relevant. 
Be precise — compliance professionals rely on your answers. If unsure, say so honestly.`,
      messages,
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : ''

    // Update query count
    await supabase.from('projects').update({
      query_count: (project as any).query_count + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer })

  } catch (err: any) {
    console.error('Query error:', err)
    return NextResponse.json({ answer: `Error: ${err.message}` })
  }
}
