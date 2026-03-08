import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  console.log('=== QUERY ROUTE CALLED ===')
  
  try {
    const body = await req.json()
    const { projectId, question, history, userId } = body
    console.log('projectId:', projectId, 'userId:', userId, 'question:', question)

    if (!userId) {
      console.log('ERROR: No userId in request')
      return NextResponse.json({ answer: 'No user ID provided.' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Fetching project...')
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('document_text, file_path, file_name, user_id, query_count')
      .eq('id', projectId)
      .single()

    if (projectError) {
      console.log('Project error:', projectError.message)
      return NextResponse.json({ answer: `Project error: ${projectError.message}` })
    }
    if (!project) {
      console.log('Project not found')
      return NextResponse.json({ answer: 'Project not found.' })
    }
    console.log('Project found, file:', project.file_name, 'text length:', project.document_text?.length || 0)

    let documentText = project.document_text || ''

    if (!documentText || documentText.length < 100) {
      console.log('No document text, downloading from storage...')
      const { data: fileData, error: storageError } = await supabase.storage
        .from('documents')
        .download(project.file_path)

      if (storageError) {
        console.log('Storage error:', storageError.message)
        return NextResponse.json({ answer: `Storage error: ${storageError.message}` })
      }

      if (!fileData) {
        console.log('No file data returned')
        return NextResponse.json({ answer: 'Could not download the document.' })
      }

      console.log('File downloaded, size:', fileData.size)

      if (project.file_name?.toLowerCase().endsWith('.pdf')) {
        console.log('Extracting text from PDF via Claude...')
        const bytes = await fileData.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        console.log('Base64 length:', base64.length)

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
        console.log('Extracted text length:', documentText.length)

        if (documentText.length > 100) {
          await supabase.from('projects').update({
            document_text: documentText.slice(0, 50000)
          }).eq('id', projectId)
          console.log('Saved extracted text to project')
        }
      } else {
        documentText = await fileData.text()
        console.log('Plain text length:', documentText.length)
      }
    }

    if (!documentText || documentText.length < 50) {
      console.log('Still no document text after extraction')
      return NextResponse.json({ answer: 'Could not read the document content. Please re-upload the PDF.' })
    }

    console.log('Querying Claude with document text length:', documentText.length)

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
      system: `You are AIstands, an expert AI assistant specialising in standards, regulations and compliance documents. Answer questions clearly and accurately in plain English. Always reference specific clause numbers where relevant. Be precise — compliance professionals rely on your answers. If unsure, say so honestly.`,
      messages,
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'No response generated.'
    console.log('Got answer, length:', answer.length)

    await supabase.from('projects').update({
      query_count: (project.query_count || 0) + 1
    }).eq('id', projectId)

    return NextResponse.json({ answer })

  } catch (err: any) {
    console.log('CAUGHT ERROR:', err.message, err.stack)
    return NextResponse.json({ answer: `Error: ${err.message}` })
  }
}
