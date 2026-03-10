'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

type Standard = {
  id: string
  title: string
  reference: string
  version: string
  year: string
  category: string
  file_name: string
  file_path: string
  file_size: number
  notes: string
  created_at: string
}

const CATEGORIES = [
  'Quality Management',
  'Medical Devices',
  'Food Safety',
  'Environmental',
  'Health & Safety',
  'Information Security',
  'Energy Management',
  'Automotive',
  'Aerospace',
  'Construction',
  'Other',
]

export default function LibraryPage() {
  const supabase = createClient()
  const [standards, setStandards] = useState<Standard[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState({
    title: '', reference: '', version: '', year: '',
    category: 'Quality Management', notes: ''
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => { loadLibrary() }, [])

  async function loadLibrary() {
    setLoading(true)
    const { data } = await supabase
      .from('standards_library')
      .select('*')
      .order('created_at', { ascending: false })
    setStandards(data || [])
    setLoading(false)
  }

  async function handleFileSelect(f: File) {
    setFile(f)
    setError('')
    // Auto-fill title from filename if empty
    if (!form.title) {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      setForm(x => ({ ...x, title: name }))
    }
  }

  async function uploadStandard() {
    if (!file || !form.title) return
    setUploading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); setUploading(false); return }

      setUploadStatus('Uploading file…')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/library/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)
      if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setUploading(false); return }

      setUploadStatus('Saving to library…')
      const { error: insertError } = await supabase
        .from('standards_library')
        .insert({
          user_id: user.id,
          title: form.title,
          reference: form.reference,
          version: form.version,
          year: form.year,
          category: form.category,
          notes: form.notes,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          created_at: new Date().toISOString()
        })

      if (insertError) { setError(`Failed to save: ${insertError.message}`); setUploading(false); return }

      await loadLibrary()
      setShowModal(false)
      setFile(null)
      setForm({ title: '', reference: '', version: '', year: '', category: 'Quality Management', notes: '' })

    } catch (err: any) {
      setError(err.message)
    }
    setUploading(false)
    setUploadStatus('')
  }

  async function deleteStandard(standard: Standard) {
    if (!confirm(`Delete "${standard.title}" from your library?`)) return
    await supabase.storage.from('documents').remove([standard.file_path])
    await supabase.from('standards_library').delete().eq('id', standard.id)
    setStandards(s => s.filter(x => x.id !== standard.id))
  }

  async function createProject(standard: Standard) {
    // Navigate to projects page with pre-filled data
    window.location.href = `/dashboard/projects?from_library=${standard.id}`
  }

  async function viewDocument(standard: Standard) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const res = await fetch('/api/document-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: standard.file_path, userId: user.id })
    })
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
  }

  const filtered = standards.filter(s => {
    const matchSearch = !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.reference.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'All' || s.category === filterCategory
    return matchSearch && matchCat
  })

  const categories = ['All', ...Array.from(new Set(standards.map(s => s.category).filter(Boolean)))]

  function formatSize(bytes: number) {
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-display font-black text-3xl tracking-[-0.02em] mb-1">Standards Library</h1>
          <p className="text-sm text-slate-ai">Your personal library of uploaded standards. Upload once, use across any project.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add standard</button>
      </div>

      {/* Search + filter */}
      {standards.length > 0 && (
        <div className="flex gap-3 mb-6">
          <input
            className="input flex-1 max-w-sm"
            placeholder="Search by title or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filterCategory === cat
                    ? 'bg-electric/10 border-electric/30 text-electric-bright'
                    : 'border-white/10 text-slate-ai hover:border-white/20 hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {standards.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Standards stored', value: standards.length },
            { label: 'Categories', value: new Set(standards.map(s => s.category).filter(Boolean)).size },
            { label: 'Total size', value: formatSize(standards.reduce((a, s) => a + (s.file_size || 0), 0)) },
          ].map(stat => (
            <div key={stat.label} className="card rounded-xl p-4">
              <div className="font-display font-black text-2xl mb-1">{stat.value}</div>
              <div className="text-xs text-slate-ai">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && standards.length === 0 && (
        <div className="card rounded-2xl p-16 text-center">
          <div className="text-5xl mb-5">📚</div>
          <div className="font-display font-bold text-xl mb-3">Your library is empty</div>
          <p className="text-sm text-slate-ai max-w-sm mx-auto mb-8">
            Upload your licensed standards here and access them across all your projects. No more hunting through folders or re-uploading the same file.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Add your first standard</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-electric border-t-transparent animate-spin" />
        </div>
      )}

      {/* Library grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(standard => (
            <div key={standard.id} className="card rounded-xl p-5 hover:border-electric/20 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📄</span>
                  {standard.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-ai">
                      {standard.category}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => viewDocument(standard)}
                    title="View document"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-ai hover:text-white transition-all text-xs">
                    👁
                  </button>
                  <button onClick={() => deleteStandard(standard)}
                    title="Delete"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-400/10 text-slate-ai hover:text-red-400 transition-all text-xs">
                    ✕
                  </button>
                </div>
              </div>

              <div className="font-display font-bold text-base mb-1 leading-snug group-hover:text-electric-bright transition-colors">
                {standard.title}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-ai mb-3">
                {standard.reference && <span>📋 {standard.reference}</span>}
                {standard.version && <span>v{standard.version}</span>}
                {standard.year && <span>📅 {standard.year}</span>}
                <span>💾 {formatSize(standard.file_size || 0)}</span>
              </div>

              {standard.notes && (
                <p className="text-xs text-slate-ai mb-3 line-clamp-2">{standard.notes}</p>
              )}

              <div className="border-t border-white/[0.07] pt-3 mt-1">
                <button onClick={() => createProject(standard)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-electric/20 text-electric-bright hover:bg-electric/10 transition-all flex items-center justify-center gap-2">
                  <span>+</span> Create project from this standard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {search && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-ai">No standards match your search.</div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{background:'rgba(11,30,62,0.9)',backdropFilter:'blur(8px)'}}>
          <div className="w-full max-w-[560px] rounded-2xl p-8 max-h-[90vh] overflow-auto" style={{background:'#132952',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display font-black text-xl">Add to library</h2>
              {!uploading && (
                <button onClick={() => { setShowModal(false); setFile(null); setError('') }}
                  className="text-slate-ai hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
              )}
            </div>

            {/* File drop zone */}
            <div className="mb-5">
              <label className="label">Document file</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFileSelect(f) }}
                onClick={() => !uploading && document.getElementById('lib-file-input')?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all
                  ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${dragOver ? 'border-electric bg-electric/10' : 'border-white/20 hover:border-electric/50 hover:bg-electric/5'}`}>
                <input id="lib-file-input" type="file" className="hidden" accept=".pdf,.txt,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if(f) handleFileSelect(f) }} />
                {file ? (
                  <div>
                    <div className="text-2xl mb-1">📄</div>
                    <div className="text-sm font-medium text-white">{file.name}</div>
                    <div className="text-xs text-slate-ai mt-0.5">{formatSize(file.size)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl mb-2">⬆</div>
                    <div className="text-sm font-medium text-white mb-1">Drop your standard here</div>
                    <div className="text-xs text-slate-ai">PDF, TXT, DOC, DOCX</div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="label">Title <span className="text-red-400">*</span></label>
                <input className="input" placeholder="e.g. ISO 9001:2015 Quality Management" disabled={uploading}
                  value={form.title} onChange={e => setForm(x => ({...x, title: e.target.value}))} />
              </div>
              <div>
                <label className="label">Reference number</label>
                <input className="input" placeholder="e.g. ISO 9001" disabled={uploading}
                  value={form.reference} onChange={e => setForm(x => ({...x, reference: e.target.value}))} />
              </div>
              <div>
                <label className="label">Version / Edition</label>
                <input className="input" placeholder="e.g. 2015" disabled={uploading}
                  value={form.version} onChange={e => setForm(x => ({...x, version: e.target.value}))} />
              </div>
              <div>
                <label className="label">Year published</label>
                <input className="input" placeholder="e.g. 2015" disabled={uploading}
                  value={form.year} onChange={e => setForm(x => ({...x, year: e.target.value}))} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" disabled={uploading}
                  value={form.category} onChange={e => setForm(x => ({...x, category: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="Any notes about this standard, scope, amendments…" disabled={uploading}
                  value={form.notes} onChange={e => setForm(x => ({...x, notes: e.target.value}))} />
              </div>
            </div>

            {uploading && uploadStatus && (
              <div className="mb-4 flex items-center gap-3 text-sm text-electric-bright bg-electric/[0.06] border border-electric/15 rounded-lg px-4 py-3">
                <span className="w-4 h-4 rounded-full border-2 border-electric border-t-transparent animate-spin flex-shrink-0" />
                {uploadStatus}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setFile(null); setError('') }}
                disabled={uploading} className="btn-ghost flex-1">Cancel</button>
              <button onClick={uploadStandard} disabled={!file || !form.title || uploading} className="btn-primary flex-1">
                {uploading ? 'Uploading…' : 'Add to library'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
