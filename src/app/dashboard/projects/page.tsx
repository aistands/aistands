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
    if (data) setName(data.title)
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

      setCreatingStatus('Uploading document…')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
      if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setCreating(false); return }

      setCreatingStatus('Reading document with AI… (may take 30s for large PDFs)')
      let documentText = ''
      try {
        const formData = new FormData()
        formData.append('file', file)
        const extractRes = await fetch('/api/extract-text', { method: 'POST', body: formData })
        const extractData = await extractRes.json()
        documentText = extractData.text || ''
      } catch (e) {
        console.warn('Text extraction failed:', e)
      }

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

      if (documentText.length > 100 && project) {
        await supabase.from('projects').update({ document_text: documentText }).eq('id', project.id)
      }

      if (project) router.push(`/dashboard/projects/${project.id}`)

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    }
    setCreating(false)
    setCreatingStatus('')
  }

  function closeModal() {
    setShowModal(false)
    setFile(null)
    setName('')
    setError('')
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '4px' }}>Projects</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 300 }}>Each project is one standard or document you're working with.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ New project</button>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
          <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>Create your first project</div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 28px', fontWeight: 300, lineHeight: 1.6 }}>
            Upload a standard, guidance document, or regulation and start working with it immediately using AI.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Create project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px' }}>
          {projects.map(p => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--orange-border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <span style={{ fontSize: '24px' }}>📋</span>
                  <span style={{ fontFamily: 'Epilogue, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', color: 'var(--orange-b)', padding: '2px 8px', borderRadius: '4px' }}>
                    {p.standard_name || 'Standard'}
                  </span>
                </div>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '17px', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.01em' }}>{p.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 300 }}>{p.file_name}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <span>💬 {p.query_count || 0} queries</span>
                  <span>📅 {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Today'}</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Add new card */}
          <button onClick={() => setShowModal(true)}
            style={{ background: 'var(--surface)', border: '1.5px dashed var(--border)', borderRadius: '14px', padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', transition: 'border-color 0.15s, color 0.15s', minHeight: '140px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--orange-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--orange)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}>
            <span style={{ fontSize: '28px' }}>+</span>
            <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'Epilogue, sans-serif' }}>New project</span>
          </button>
        </div>
      )}

      {/* New project modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px', background: 'rgba(11,30,62,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--text)', letterSpacing: '-0.02em' }}>New project</h2>
              {!creating && (
                <button onClick={closeModal}
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              )}
            </div>

            {/* File drop zone */}
            <div style={{ marginBottom: '18px' }}>
              <label className="label">Upload your standard</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFileSelect(f) }}
                onClick={() => !creating && document.getElementById('file-input')?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--orange)' : 'var(--border-2)'}`,
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  background: dragOver ? 'var(--orange-soft)' : 'var(--surface-2)',
                  transition: 'all 0.15s',
                  opacity: creating ? 0.5 : 1
                }}>
                <input id="file-input" type="file" style={{ display: 'none' }} accept=".pdf,.txt,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if(f) handleFileSelect(f) }} />
                {file ? (
                  <>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{file.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '28px', marginBottom: '10px' }}>⬆</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>Drop your document here</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF, TXT, DOC, DOCX supported</div>
                  </>
                )}
              </div>
            </div>

            {/* Name input */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label">Project name</label>
              <input className="input" placeholder="e.g. ISO 9001 Compliance 2026"
                value={name} onChange={e => setName(e.target.value)} disabled={creating} />
            </div>

            {/* Creating status */}
            {creating && creatingStatus && (
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--orange)', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', borderRadius: '8px', padding: '10px 14px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--orange-border)', borderTopColor: 'var(--orange)', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                {creatingStatus}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#b91c1c', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)', borderRadius: '8px', padding: '10px 14px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={closeModal} disabled={creating} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={createProject} disabled={!name || !file || creating} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                {creating ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-muted)' }}>Loading…</div>}>
      <ProjectsContent />
    </Suspense>
  )
}
