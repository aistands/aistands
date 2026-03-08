import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateChecklist } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { projectId, section, language } = await req.json()
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects').select('document_text').eq('id', projectId).single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await generateChecklist({ documentText: project.document_text, section, language })
  return NextResponse.json(result)
}
