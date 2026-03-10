import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { projectId, filePath, userId } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let resolvedPath = filePath

    // If projectId provided, look up the file path
    if (projectId && !filePath) {
      const { data: project } = await supabase
        .from('projects')
        .select('file_path, user_id')
        .eq('id', projectId)
        .single()

      if (!project || project.user_id !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      resolvedPath = project.file_path
    }

    if (!resolvedPath) {
      return NextResponse.json({ error: 'No file path' }, { status: 400 })
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(resolvedPath, 3600)

    if (error || !data) {
      return NextResponse.json({ error: error?.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
