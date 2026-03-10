'use client'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

function ProjectsContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(searchParams.get('new') === '1' || !!searchParams.get('from_library'))
  const libraryStandardId = searchParams.get('from_library') || ''
  const [creating, setCreating] = useState(false)
  const [creatingStatus, setCreatingStatus] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
    if (libraryStandardId) loadLibraryStandard(libraryStandardId)
  }, [])

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
  }

  async function loadLibraryStandard(id: string) {
    const { data } = await supabase.from('standards_library').select('*').eq('id', id).single()
    if (data) {
      setName(data.title)
    }
  }

  async function handleFileSelect(f: File) {
    setFile(f)
    setError('')
  }

  async function createProject() {
    if (!name || !file) return
    setCreating(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setError('Not logged in'); setCreating(false); return }

      // Step 1 — Upload file to Supabase storage
      setCreatingStatus('Uploading document…')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
      if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setCreating(false); return }

      // Step 2 — Extract text via API (Claude reads the PDF)
      setCreatingStatus('Reading document with AI… (may take 30s for large PDFs)')
      let documentText = ''
      try {
        const formData = new FormData()
        formData.append('file', file)
        const extractRes = await fetch('/api/extract-text', { method: 'POST', body: formData })
        const extractData = await extractRes.json()
        documentText = extractData.text || ''
        console.log('Extracted text length:', documentText.length)
      } catch (e) {
        console.warn('Text extraction failed:', e)
      }

      // Step 3 — Create project with text included
      setCreatingStatus('Saving project…')
      const { data: project, error: insertError } = await supabase.from('projects').insert({
        user_id: user.id,
        name,
        file_path: filePath,
        file_name: file.name,
        document_text: documentText,
        standard_name: name,
        query_count: 0,
        created_at: new Date().toISOString()
      }).select().single()

      if (insertError) { setError(`Failed to save: ${insertError.message}`); setCreating(false); return }

      // Step 4 — If we got text, verify it saved by doing a quick update
      if (documentText.length > 100 && project) {
        const { error: updateError } = await supabase.from('projects')
          .update({ document_text: documentText })
          .eq('id', project.id)
        if (updateError) console.warn('Update failed:', updateError.message)
        else console.log('Document text saved successfully')
      }

      if (project) router.push(`/dashboard/projects/${project.id}`)

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    }
    setCreating(false)
    setCreatingStatus('')
  }

  return (
    <div className="p-8 max-w-[1000px]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display font-black text-3xl tracking-[-0.02em] mb-1">Projects</h1>
          <p className="text-sm text-slate-ai">Each project is one standard or document you're working with.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ New project</button>
      </div>

      {projects.length === 0 ? (
        <div className="card rounded-2xl p-16 text-center">
          <div className="text-5xl mb-5">📂</div>
          <div className="font-display font-bold text-xl mb-3">Create your first project</div>
          <p className="text-sm text-slate-ai max-w-sm mx-auto mb-8">Upload a standard, guidance document, or regulation and start working with it immediately using AI.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Create project</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}
              className="card rounded-xl p-6 hover:border-electric/25 hover:bg-electric/[0.03] transition-all group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">📋</span>
                <span className="badge badge-blue text-[10px]">{p.standard_name}</span>
              </div>
              <div className="font-display font-bold text-lg mb-1.5 group-hover:text-electric-bright transition-colors">{p.name}</div>
              <div className="text-sm text-slate-ai mb-4">{p.file_name}</div>
              <div className="flex gap-4 text-xs text-slate-ai border-t border-white/[0.07] pt-4">
                <span>💬 {p.query_count || 0} queries</span>
                <span>📅 {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Today'}</span>
              </div>
            </Link>
          ))}
          <button onClick={() => setShowModal(true)}
            className="card rounded-xl p-6 border-dashed hover:border-electric/40 transition-all flex flex-col items-center justify-center gap-3 text-slate-ai hover:text-white">
            <span className="text-3xl">+</span>
            <span className="text-sm font-medium">New project</span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{background:'rgba(11,30,62,0.85)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-[500px] rounded-2xl p-8" style={{background:'#132952',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl">New project</h2>
              {!creating && (
                <button onClick={() => { setShowModal(false); setFile(null); setName(''); setError('') }}
                  className="text-slate-ai hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
              )}
            </div>

            <div className="mb-5">
              <label className="label">Upload your standard</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFileSelect(f) }}
                onClick={() => !creating && document.getElementById('file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all
                  ${creating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${dragOver ? 'border-electric bg-electric/10' : 'border-white/20 hover:border-electric/50 hover:bg-electric/5'}`}
              >
                <input id="file-input" type="file" className="hidden" accept=".pdf,.txt,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if(f) handleFileSelect(f) }} />
                {file ? (
                  <div>
                    <div className="text-2xl mb-2">📄</div>
                    <div className="text-sm font-medium text-white">{file.name}</div>
                    <div className="text-xs text-slate-ai mt-1">{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-3">⬆</div>
                    <div className="text-sm font-medium text-white mb-1">Drop your document here</div>
                    <div className="text-xs text-slate-ai">PDF, TXT, DOC, DOCX supported</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-5">
              <label className="label">Project name</label>
              <input className="input" placeholder="e.g. ISO 9001 Compliance 2026"
                value={name} onChange={e => setName(e.target.value)} disabled={creating} />
            </div>

            {creating && creatingStatus && (
              <div className="mb-4 flex items-center gap-3 text-sm text-electric-bright bg-electric/[0.06] border border-electric/15 rounded-lg px-4 py-3">
                <span className="w-4 h-4 rounded-full border-2 border-electric border-t-transparent animate-spin flex-shrink-0" />
                {creatingStatus}
              </div>
            )}

            {error && <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setFile(null); setName(''); setError('') }}
                disabled={creating} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createProject} disabled={!name || !file || creating} className="btn-primary flex-1">
                {creating ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-ai">Loading…</div>}>
      <ProjectsContent />
    </Suspense>
  )
}
