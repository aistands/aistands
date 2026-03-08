import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateWorkbookEntries } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { projectId, language } = await req.json()
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects').select('document_text').eq('id', projectId).single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await generateWorkbookEntries({ documentText: project.document_text, language })
  return NextResponse.json(result)
}
