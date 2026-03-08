'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ProjectsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<any[]>([])
  const [showModal, setShowModal] = useState(searchParams.get('new') === '1')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
  }

  async function handleFileSelect(f: File) {
    setFile(f)
    setLoadingSuggestions(true)
    try {
      const text = await f.text()
      const res = await fetch('/api/projects/suggest-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: text.slice(0, 2000) })
      })
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch {}
    setLoadingSuggestions(false)
  }

  async function createProject() {
    if (!name || !file) return
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileText = await file.text()

      // Store document in Supabase storage
      const filePath = `${user!.id}/${Date.now()}-${file.name}`
      await supabase.storage.from('documents').upload(filePath, file)

      // Create project record
      const { data: project } = await supabase.from('projects').insert({
        user_id: user!.id,
        name,
        file_path: filePath,
        file_name: file.name,
        document_text: fileText.slice(0, 50000), // store first 50k chars
        standard_name: suggestions[0] || file.name.replace('.pdf','').replace('.txt',''),
        query_count: 0,
        created_at: new Date().toISOString()
      }).select().single()

      if (project) router.push(`/dashboard/projects/${project.id}`)
    } catch (err) {
      console.error(err)
    }
    setCreating(false)
  }

  return (
    <div className="p-8 max-w-[1000px]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display font-black text-3xl tracking-[-0.02em] mb-1">Projects</h1>
          <p className="text-sm text-slate-ai">Each project is one standard or document you're working with.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New project
        </button>
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

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{background:'rgba(11,30,62,0.85)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-[500px] rounded-2xl p-8" style={{background:'#132952',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl">New project</h2>
              <button onClick={() => { setShowModal(false); setSuggestions([]); setFile(null); setName('') }}
                className="text-slate-ai hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
            </div>

            {/* File upload */}
            <div className="mb-5">
              <label className="label">Upload your standard</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFileSelect(f) }}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
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

            {/* Project name */}
            <div className="mb-5">
              <label className="label">Project name</label>
              <input className="input" placeholder="e.g. ISO 9001 Compliance 2026"
                value={name} onChange={e => setName(e.target.value)} />

              {/* AI suggestions */}
              {loadingSuggestions && (
                <div className="mt-2 text-xs text-slate-ai flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-electric border-t-transparent animate-spin" />
                  AI is suggesting names…
                </div>
              )}
              {suggestions.length > 0 && !loadingSuggestions && (
                <div className="mt-3">
                  <div className="text-[11px] text-slate-ai mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-electric" /> AI suggestions — click to use
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button key={s} onClick={() => setName(s)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                          ${name === s ? 'bg-electric/15 border-electric/40 text-electric-bright' : 'border-white/10 text-slate-ai hover:border-electric/30 hover:text-white'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setFile(null); setName(''); setSuggestions([]) }}
                className="btn-ghost flex-1">Cancel</button>
              <button onClick={createProject} disabled={!name || !file || creating}
                className="btn-primary flex-1">
                {creating ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
