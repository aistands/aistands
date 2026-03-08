import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { queryDocument } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { projectId, question, history, language } = await req.json()
    const supabase = createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get project and document text
    const { data: project } = await supabase
      .from('projects')
      .select('document_text, user_id')
      .eq('id', projectId)
      .single()

    if (!project || project.user_id !== user.id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Check usage limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, query_count_month')
      .eq('id', user.id)
      .single()

    const limits: Record<string, number> = { free: 5, professional: 100, team: -1 }
    const plan = profile?.plan || 'free'
    const limit = limits[plan]
    const used = profile?.query_count_month || 0

    if (limit !== -1 && used >= limit) {
      return NextResponse.json({
        error: 'Monthly query limit reached. Please upgrade your plan.',
        limitReached: true
      }, { status: 429 })
    }

    const answer = await queryDocument({
      question,
      documentText: project.document_text,
      conversationHistory: history,
      language,
    })

    // Increment usage
    await supabase.from('profiles')
      .update({ query_count_month: used + 1 })
      .eq('id', user.id)

    // Save query to history
    await supabase.from('query_history').insert({
      user_id: user.id,
      project_id: projectId,
      question,
      answer,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ answer })
  } catch (err) {
    console.error('Query error:', err)
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 })
  }
}
