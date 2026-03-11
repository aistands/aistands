'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

type Tab = 'query' | 'document' | 'workbook' | 'checklist' | 'versions'
type Message = { role: 'user' | 'assistant'; content: string; webSearch?: boolean }
type WorkbookEntry = {
  id?: string
  clause: string
  title: string
  requirement: string
  status: 'not_started' | 'in_progress' | 'compliant' | 'not_applicable'
  evidence: string
  notes: string
  project_id?: string
  user_id?: string
}
type ImportSuggestion = {
  clause: string
  title: string
  requirement: string
  selected: boolean
}

const STATUS_OPTIONS = [
  { value: 'not_started',    label: 'Not started'    },
  { value: 'in_progress',    label: 'In progress'    },
  { value: 'compliant',      label: 'Compliant'      },
  { value: 'not_applicable', label: 'Not applicable' },
]

function statusSelectStyle(value: string): React.CSSProperties {
  switch (value) {
    case 'compliant':      return { background: 'rgba(21,128,61,0.08)',  border: '1px solid rgba(21,128,61,0.22)',  color: '#15803d' }
    case 'in_progress':    return { background: 'rgba(180,83,9,0.08)',   border: '1px solid rgba(180,83,9,0.22)',   color: '#b45309' }
    default:               return { background: 'var(--surface-2)',      border: '1px solid var(--border)',         color: 'var(--text-muted)' }
  }
}

const topBarStyle: React.CSSProperties = { background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }
const dividerStyle: React.CSSProperties = { width: '1px', height: '16px', background: 'var(--border)' }
const clauseBadgeStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700,
  background: 'var(--orange-soft)', border: '1px solid var(--orange-border)',
  color: 'var(--orange-b)', padding: '2px 8px', borderRadius: '5px',
  fontFamily: 'Epilogue, sans-serif',
}

export default function ProjectPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [project, setProject] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('query')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useWebSearch, setUseWebSearch] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [userPlan, setUserPlan] = useState<string>('explorer')
  const [documentUrl, setDocumentUrl] = useState<string>('')
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [splitView, setSplitView] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [workbookEntries, setWorkbookEntries] = useState<WorkbookEntry[]>([])
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WorkbookEntry | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importSuggestions, setImportSuggestions] = useState<ImportSuggestion[]>([])
  const [loadingImport, setLoadingImport] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [newEntry, setNewEntry] = useState<WorkbookEntry>({
    clause: '', title: '', requirement: '', status: 'not_started', evidence: '', notes: ''
  })

  const [checklist, setChecklist] = useState<any[]>([])
  const [generatingChecklist, setGeneratingChecklist] = useState(false)

  const isPdf = project?.file_name?.toLowerCase().endsWith('.pdf')
  const isPaidPlan = userPlan !== 'explorer'

  useEffect(() => {
    loadProject(); loadWorkbook(); loadChecklist(); loadConversation()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', data.user.id).single()
        setUserPlan(profile?.plan || 'explorer')
      }
    })
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadProject() {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(data)
  }
  async function loadConversation() {
    const { data } = await supabase.from('query_history').select('*').eq('project_id', id).order('created_at', { ascending: true }).limit(50)
    if (data && data.length > 0) {
      setMessages(data.flatMap((row: any) => [
        { role: 'user' as const, content: row.question },
        { role: 'assistant' as const, content: row.answer, webSearch: row.web_search_used }
      ]))
    }
  }
  async function loadWorkbook() {
    const { data } = await supabase.from('workbook_entries').select('*').eq('project_id', id).order('clause')
    setWorkbookEntries(data || [])
  }
  async function loadChecklist() {
    const { data } = await supabase.from('checklist_items').select('*').eq('project_id', id).order('created_at')
    setChecklist(data || [])
  }
  async function loadDocumentUrl() {
    if (documentUrl) return
    setLoadingPdf(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/document-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, userId: user.id })
      })
      const data = await res.json()
      if (data.url) setDocumentUrl(data.url)
    } catch {}
    setLoadingPdf(false)
  }

  async function saveEntry() {
    if (!newEntry.clause || !newEntry.requirement) return
    setSavingEntry(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const record = { ...newEntry, project_id: id, user_id: user.id }
    if (editingEntry?.id) {
      const { data } = await supabase.from('workbook_entries').update(record).eq('id', editingEntry.id).select().single()
      setWorkbookEntries(e => e.map(x => x.id === editingEntry.id ? data : x))
    } else {
      const { data } = await supabase.from('workbook_entries').insert(record).select().single()
      setWorkbookEntries(e => [...e, data])
    }
    setNewEntry({ clause: '', title: '', requirement: '', status: 'not_started', evidence: '', notes: '' })
    setShowAddEntry(false); setEditingEntry(null); setSavingEntry(false)
  }
  async function deleteEntry(entryId: string) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('workbook_entries').delete().eq('id', entryId)
    setWorkbookEntries(e => e.filter(x => x.id !== entryId))
  }
  async function updateEntryField(entryId: string, field: string, value: string) {
    await supabase.from('workbook_entries').update({ [field]: value }).eq('id', entryId)
    setWorkbookEntries(e => e.map(x => x.id === entryId ? { ...x, [field]: value } : x))
  }
  function startEdit(entry: WorkbookEntry) {
    setEditingEntry(entry); setNewEntry({ ...entry }); setShowAddEntry(true)
  }
  async function loadImportSuggestions() {
    setLoadingImport(true); setShowImport(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/workbook/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, userId: user?.id })
      })
      const data = await res.json()
      if (data.suggestions) setImportSuggestions(data.suggestions.map((s: any) => ({ ...s, selected: true })))
    } catch (e: any) { alert('Failed to load suggestions: ' + e.message) }
    setLoadingImport(false)
  }
  async function importSelected() {
    const selected = importSuggestions.filter(s => s.selected)
    if (!selected.length) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const records = selected.map(s => ({
      project_id: id, user_id: user.id, clause: s.clause, title: s.title,
      requirement: s.requirement, status: 'not_started', evidence: '', notes: '',
      created_at: new Date().toISOString()
    }))
    const { data } = await supabase.from('workbook_entries').insert(records).select()
    setWorkbookEntries(e => [...e, ...(data || [])])
    setShowImport(false); setImportSuggestions([])
  }

  async function sendQuery() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput(''); setMessages(m => [...m, { role: 'user', content: question }]); setLoading(true)
    try {
      const res = await fetch('/api/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, question, history: messages, userId, useWebSearch: useWebSearch && isPaidPlan && !!project?.document_text })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.answer, webSearch: data.webSearchUsed }])
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await supabase.from('query_history').insert({
          project_id: id, user_id: currentUser.id, question,
          answer: data.answer, web_search_used: data.webSearchUsed || false,
          created_at: new Date().toISOString()
        })
      }
      if (data.needsTextSave) {
        fetch('/api/save-document-text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: id, userId })
        }).catch(() => {})
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  async function generateChecklist() {
    setGeneratingChecklist(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/checklist/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, userId: user?.id })
      })
      const data = await res.json()
      if (data.items) setChecklist(data.items)
      else alert('Failed to generate checklist: ' + (data.error || 'Unknown error'))
    } catch (e: any) { alert('Error: ' + e.message) }
    setGeneratingChecklist(false)
  }

  async function toggleCheck(item: any) {
    setChecklist(c => c.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))
    await supabase.from('checklist_items').update({ completed: !item.completed }).eq('id', item.id)
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'query',     label: 'AI Query',  icon: '🤖' },
    { key: 'document',  label: 'Document',  icon: '📄' },
    { key: 'workbook',  label: 'Workbook',  icon: '🗒'  },
    { key: 'checklist', label: 'Checklist', icon: '✅'  },
    { key: 'versions',  label: 'Versions',  icon: '🔔'  },
  ]

  const completedCount = workbookEntries.filter(e => e.status === 'compliant').length
  const naCount = workbookEntries.filter(e => e.status === 'not_applicable').length
  const progressCount = completedCount + naCount

  const Spinner = ({ size = 18 }: { size?: number }) => (
    <span style={{ width: size, height: size, borderRadius: '50%', border: '2px solid var(--orange-border)', borderTopColor: 'var(--orange)', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
  )

  if (!project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '12px' }}>
      <Spinner size={24} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Split view ───────────────────────────────────────────────
  if (splitView) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ ...topBarStyle, display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 24px' }}>
          <Link href="/dashboard/projects" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>← Projects</Link>
          <div style={dividerStyle} />
          <div>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>{project.name}</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{project.file_name}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#15803d' }} />Split view
            </span>
            <button onClick={() => setSplitView(false)}
              style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Exit split view
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: '50%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📄 {project.file_name}</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', background: 'var(--surface-2)' }}>
              {documentUrl
                ? <iframe src={documentUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document viewer" />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <button onClick={loadDocumentUrl} disabled={loadingPdf} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {loadingPdf ? <><Spinner size={14} />Loading…</> : '📄 Load document'}
                    </button>
                  </div>
              }
            </div>
          </div>
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>🤖</div>}
                  <div style={{ maxWidth: '85%', background: m.role === 'user' ? 'var(--orange)' : 'var(--surface)', border: m.role === 'user' ? 'none' : '1px solid var(--border)', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', padding: '10px 14px', fontSize: '13px', lineHeight: 1.6, color: m.role === 'user' ? '#fff' : 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🤖</div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 3px', padding: '10px 14px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0,150,300].map(d => <span key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--orange)', display: 'inline-block', animation: `bounce 1s ${d}ms infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: '8px' }}>
              <input className="input" style={{ flex: 1, fontSize: '13px' }} placeholder="Ask about your standard…"
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuery()} />
              <button onClick={sendQuery} disabled={!input.trim() || loading} className="btn-primary" style={{ padding: '0 20px', fontSize: '13px' }}>Send</button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes bounce{0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)}}`}</style>
      </div>
    )
  }

  // ── Main layout ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <div style={{ ...topBarStyle, display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 32px' }}>
        <Link href="/dashboard/projects" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>← Projects</Link>
        <div style={dividerStyle} />
        <div>
          <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>{project.name}</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{project.file_name}</p>
        </div>
        <span style={{ ...clauseBadgeStyle, marginLeft: 'auto' }}>{project.standard_name}</span>
      </div>

      <div style={{ ...topBarStyle, display: 'flex', gap: '4px', padding: '8px 32px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'document') loadDocumentUrl() }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: tab === t.key ? '1px solid var(--orange-border)' : '1px solid transparent', background: tab === t.key ? 'var(--orange-soft)' : 'transparent', color: tab === t.key ? 'var(--orange-b)' : 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* ── AI QUERY ── */}
        {tab === 'query' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px' }}>🤖</div>
                  <div>
                    <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Ask anything about {project.name}</div>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '360px', fontWeight: 300 }}>Ask questions in plain English. Get answers directly from your document.</p>
                  </div>
                  {isPdf && (
                    <button onClick={() => { setSplitView(true); loadDocumentUrl() }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '9px 18px', borderRadius: '9px', border: '1px solid var(--orange-border)', color: 'var(--orange)', background: 'var(--orange-soft)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      ⬛ Open split view — read &amp; ask side by side
                    </button>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '520px' }}>
                    {["What are the main requirements?","Which clauses are mandatory?","What evidence do I need?","Summarise clause 7","How do auditors assess this?"].map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--orange-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--orange)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>🤖</div>}
                  <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {m.role === 'assistant' && m.webSearch && <div style={{ fontSize: '11px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>🌐 Web sources included</div>}
                    <div style={{ background: m.role === 'user' ? 'var(--orange)' : 'var(--surface)', border: m.role === 'user' ? 'none' : '1px solid var(--border)', borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px', padding: '12px 18px', fontSize: '14px', lineHeight: 1.65, color: m.role === 'user' ? '#fff' : 'var(--text)', whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 3px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {useWebSearch && <span style={{ fontSize: '12px', color: '#15803d', marginRight: '4px' }}>🌐 Searching web…</span>}
                    {[0,150,300].map(d => <span key={d} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--orange)', display: 'inline-block', animation: `bounce 1s ${d}ms infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <button onClick={() => setUseWebSearch(!useWebSearch)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px', border: useWebSearch ? '1px solid rgba(21,128,61,0.25)' : '1px solid var(--border)', background: useWebSearch ? 'rgba(21,128,61,0.07)' : 'var(--surface-2)', color: useWebSearch ? '#15803d' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  🌐 <span>{useWebSearch ? 'Web search ON' : 'Web search OFF'}</span>
                  <span style={{ width: '26px', height: '14px', borderRadius: '7px', background: useWebSearch ? '#15803d' : 'var(--border-2)', position: 'relative', display: 'inline-block', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: useWebSearch ? '14px' : '2px' }} />
                  </span>
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{useWebSearch ? 'Answers combine your document + live web sources' : 'Answers from your document only'}</span>
                {isPdf && messages.length > 0 && (
                  <button onClick={() => { setSplitView(true); loadDocumentUrl() }}
                    style={{ marginLeft: 'auto', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'DM Sans, sans-serif' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--orange-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--orange)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}>
                    ⬛ Split view
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="input" style={{ flex: 1 }} placeholder="Ask a question about your standard…"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuery()} />
                <button onClick={sendQuery} disabled={!input.trim() || loading} className="btn-primary" style={{ padding: '0 28px' }}>Send</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DOCUMENT ── */}
        {tab === 'document' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📄 {project.file_name}</span>
              {isPdf && (
                <button onClick={() => { setSplitView(true); loadDocumentUrl() }}
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--orange-border)', color: 'var(--orange)', background: 'var(--orange-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'DM Sans, sans-serif' }}>
                  ⬛ Open with AI chat
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', background: 'var(--surface-2)' }}>
              {loadingPdf
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}><Spinner /><span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading document…</span></div>
                : documentUrl
                  ? isPdf
                    ? <iframe src={documentUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Document viewer" />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Preview not available for this file type.</p>
                        <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">Download file</a>
                      </div>
                  : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ fontSize: '40px' }}>📄</div>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click below to load your document</p>
                      <button onClick={loadDocumentUrl} className="btn-primary">Load document</button>
                    </div>
              }
            </div>
          </div>
        )}

        {/* ── WORKBOOK ── */}
        {tab === 'workbook' && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '4px' }}>Workbook</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 300 }}>{workbookEntries.length > 0 ? `${progressCount} of ${workbookEntries.length} clauses addressed` : 'Build your compliance workbook clause by clause'}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={loadImportSuggestions} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--orange-border)', color: 'var(--orange)', background: 'var(--orange-soft)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  ✨ Import from AI
                </button>
                <button onClick={() => { setEditingEntry(null); setNewEntry({ clause: '', title: '', requirement: '', status: 'not_started', evidence: '', notes: '' }); setShowAddEntry(true) }} className="btn-primary">
                  + Add entry
                </button>
              </div>
            </div>

            {workbookEntries.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>{completedCount} compliant · {workbookEntries.filter(e=>e.status==='in_progress').length} in progress · {workbookEntries.filter(e=>e.status==='not_started').length} not started</span>
                  <span>{workbookEntries.length} total entries</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', background: '#15803d', width: `${(completedCount/workbookEntries.length)*100}%`, transition: 'width 0.3s' }} />
                  <div style={{ height: '100%', background: '#b45309', width: `${(workbookEntries.filter(e=>e.status==='in_progress').length/workbookEntries.length)*100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {workbookEntries.length === 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗒</div>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>Your workbook is empty</div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 24px', fontWeight: 300, lineHeight: 1.6 }}>Add entries manually for full control, or let AI suggest entries from your document that you can review and approve.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={loadImportSuggestions} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--orange-border)', color: 'var(--orange)', background: 'var(--orange-soft)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>✨ Import from AI</button>
                  <button onClick={() => setShowAddEntry(true)} className="btn-primary">+ Add entry manually</button>
                </div>
              </div>
            )}

            {workbookEntries.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px 1fr', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Epilogue, sans-serif' }}>
                  <span>Clause</span><span>Requirement</span><span>Status</span><span>Notes / Evidence</span>
                </div>
                {workbookEntries.map((entry, i) => (
                  <div key={entry.id}
                    style={{ display: 'grid', gridTemplateColumns: '80px 1fr 160px 1fr', gap: '16px', padding: '16px 24px', alignItems: 'start', borderBottom: i !== workbookEntries.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                    <div style={{ paddingTop: '2px' }}><span style={clauseBadgeStyle}>{entry.clause}</span></div>
                    <div>
                      {entry.title && <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{entry.title}</div>}
                      <p style={{ fontSize: '13px', color: 'var(--text-mid)', lineHeight: 1.55 }}>{entry.requirement}</p>
                    </div>
                    <select value={entry.status} onChange={e => updateEntryField(entry.id!, 'status', e.target.value)}
                      style={{ ...statusSelectStyle(entry.status), fontSize: '12px', padding: '6px 10px', borderRadius: '7px', appearance: 'none', cursor: 'pointer', width: '100%', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <textarea className="input" style={{ fontSize: '12px', flex: 1, padding: '6px 10px', resize: 'none', overflow: 'hidden', lineHeight: 1.55 }}
                        placeholder="Add notes or evidence reference…" defaultValue={entry.notes} rows={1}
                        onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
                        onBlur={e => updateEntryField(entry.id!, 'notes', e.target.value)} />
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => startEdit(entry)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>✎</button>
                        <button onClick={() => deleteEntry(entry.id!)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(185,28,28,0.25)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit modal */}
            {showAddEntry && (
              <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px', background: 'rgba(11,30,62,0.6)', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: '100%', maxWidth: '560px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.02em' }}>{editingEntry ? 'Edit entry' : 'Add workbook entry'}</h3>
                    <button onClick={() => { setShowAddEntry(false); setEditingEntry(null) }} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div><label className="label">Clause number</label><input className="input" placeholder="e.g. 4.1, B.10" value={newEntry.clause} onChange={e => setNewEntry(x => ({...x, clause: e.target.value}))} /></div>
                      <div><label className="label">Title</label><input className="input" placeholder="Clause title" value={newEntry.title} onChange={e => setNewEntry(x => ({...x, title: e.target.value}))} /></div>
                    </div>
                    <div><label className="label">Requirement</label><textarea className="input" style={{ minHeight: '80px', resize: 'none' }} placeholder="The requirement text…" value={newEntry.requirement} onChange={e => setNewEntry(x => ({...x, requirement: e.target.value}))} /></div>
                    <div><label className="label">Status</label>
                      <select className="input" value={newEntry.status} onChange={e => setNewEntry(x => ({...x, status: e.target.value as any}))}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div><label className="label">Notes / Evidence</label><textarea className="input" style={{ minHeight: '60px', resize: 'none' }} placeholder="Evidence reference, notes, action owner…" value={newEntry.notes} onChange={e => setNewEntry(x => ({...x, notes: e.target.value}))} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                    <button onClick={() => { setShowAddEntry(false); setEditingEntry(null) }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                    <button onClick={saveEntry} disabled={!newEntry.clause || !newEntry.requirement || savingEntry} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      {savingEntry ? 'Saving…' : editingEntry ? 'Save changes' : 'Add entry'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Import modal */}
            {showImport && (
              <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px', background: 'rgba(11,30,62,0.6)', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: '100%', maxWidth: '700px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px 16px', flexShrink: 0 }}>
                    <div>
                      <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '18px', color: 'var(--text)', letterSpacing: '-0.02em' }}>Import from AI</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 300 }}>Review and select which entries to add to your workbook</p>
                    </div>
                    <button onClick={() => { setShowImport(false); setImportSuggestions([]) }} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                  </div>
                  {loadingImport ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '12px' }}>
                      <Spinner /><span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>AI is reading your document…</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '12px 32px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{importSuggestions.filter(s=>s.selected).length} of {importSuggestions.length} selected</span>
                        <button onClick={() => setImportSuggestions(s => s.map(x => ({...x, selected: true})))} style={{ fontSize: '12px', color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Select all</button>
                        <button onClick={() => setImportSuggestions(s => s.map(x => ({...x, selected: false})))} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Deselect all</button>
                      </div>
                      <div style={{ overflow: 'auto', flex: 1, padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {importSuggestions.map((s, i) => (
                          <div key={i} onClick={() => setImportSuggestions(prev => prev.map((x, j) => j === i ? {...x, selected: !x.selected} : x))}
                            style={{ display: 'flex', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: s.selected ? '1px solid var(--orange-border)' : '1px solid var(--border)', background: s.selected ? 'var(--orange-soft)' : 'var(--surface-2)', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: s.selected ? '1px solid var(--orange-border)' : '1px solid var(--border)', background: s.selected ? 'var(--orange-soft)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--orange)', flexShrink: 0, marginTop: '2px' }}>
                              {s.selected ? '✓' : ''}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={clauseBadgeStyle}>{s.clause}</span>
                                {s.title && <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{s.title}</span>}
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-mid)', lineHeight: 1.55 }}>{s.requirement}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', flexShrink: 0 }}>
                        <button onClick={() => { setShowImport(false); setImportSuggestions([]) }} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                        <button onClick={importSelected} disabled={importSuggestions.filter(s=>s.selected).length === 0} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                          Add {importSuggestions.filter(s=>s.selected).length} entries to workbook
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {tab === 'checklist' && (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '4px' }}>Audit Readiness Checklist</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 300 }}>
                  {checklist.length > 0
                    ? `${checklist.filter(i=>i.status==='green').length} green · ${checklist.filter(i=>i.status==='amber').length} amber · ${checklist.filter(i=>i.status==='red').length} red`
                    : 'Generated once from your standard — free to load after that'}
                </p>
              </div>
              {checklist.length === 0 && <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary">{generatingChecklist ? 'Generating…' : '✨ Generate checklist'}</button>}
              {checklist.length > 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generated once · updates save automatically</span>}
            </div>

            {checklist.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>{checklist.filter(i=>i.status==='green').length} ready · {checklist.filter(i=>i.status==='amber').length} in progress · {checklist.filter(i=>i.status==='red').length} not started</span>
                  <span>{checklist.length} total items</span>
                </div>
                <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', background: '#15803d', width: `${(checklist.filter(i=>i.status==='green').length/checklist.length)*100}%`, transition: 'width 0.3s' }} />
                  <div style={{ height: '100%', background: '#b45309', width: `${(checklist.filter(i=>i.status==='amber').length/checklist.length)*100}%`, transition: 'width 0.3s' }} />
                  <div style={{ height: '100%', background: '#b91c1c', width: `${(checklist.filter(i=>i.status==='red').length/checklist.length)*100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {checklist.length === 0 && !generatingChecklist && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎯</div>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>Audit Readiness Checklist</div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 8px', fontWeight: 300, lineHeight: 1.6 }}>standards.online will read your standard and generate a checklist of auditor questions — the kind an assessor would actually ask.</p>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', maxWidth: '380px', margin: '0 auto 28px' }}>Generated once and saved permanently. Fill in responsible persons, evidence references, and RAG status as you prepare.</p>
                <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {generatingChecklist ? <><Spinner size={14} />Generating checklist…</> : '✨ Generate audit checklist'}
                </button>
              </div>
            )}

            {generatingChecklist && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><Spinner size={32} /></div>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>Generating your audit checklist…</div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 300 }}>Reading your standard and writing auditor questions. This takes about 30 seconds and only happens once.</p>
              </div>
            )}

            {checklist.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gap: '16px', padding: '12px 24px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Epilogue, sans-serif', gridTemplateColumns: '70px 1fr 110px 160px 160px' }}>
                  <span>Clause</span><span>Auditor question</span><span>Status</span><span>Responsible</span><span>Evidence ref</span>
                </div>
                {checklist.map((item, i) => (
                  <div key={item.id}
                    style={{ display: 'grid', gap: '16px', padding: '16px 24px', alignItems: 'start', borderBottom: i !== checklist.length - 1 ? '1px solid var(--border)' : 'none', gridTemplateColumns: '70px 1fr 110px 160px 160px', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                    <div style={{ paddingTop: '2px' }}><span style={clauseBadgeStyle}>{item.clause}</span></div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.requirement}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>{item.audit_question}</p>
                    </div>
                    <select value={item.status || 'red'}
                      onChange={e => { const val = e.target.value; setChecklist(c => c.map(x => x.id === item.id ? {...x, status: val} : x)); supabase.from('checklist_items').update({ status: val }).eq('id', item.id) }}
                      style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '7px', appearance: 'none', cursor: 'pointer', width: '100%', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                        ...(item.status === 'green' ? { background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.22)', color: '#15803d' }
                          : item.status === 'amber' ? { background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.22)', color: '#b45309' }
                          : { background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.22)', color: '#b91c1c' }) }}>
                      <option value="red">🔴 Not ready</option>
                      <option value="amber">🟡 In progress</option>
                      <option value="green">🟢 Ready</option>
                    </select>
                    <input className="input" style={{ fontSize: '12px', padding: '6px 10px' }} placeholder="Name / role…" defaultValue={item.responsible_person}
                      onBlur={e => { supabase.from('checklist_items').update({ responsible_person: e.target.value }).eq('id', item.id); setChecklist(c => c.map(x => x.id === item.id ? {...x, responsible_person: e.target.value} : x)) }} />
                    <input className="input" style={{ fontSize: '12px', padding: '6px 10px' }} placeholder="Doc ref, link…" defaultValue={item.evidence_ref}
                      onBlur={e => { supabase.from('checklist_items').update({ evidence_ref: e.target.value }).eq('id', item.id); setChecklist(c => c.map(x => x.id === item.id ? {...x, evidence_ref: e.target.value} : x)) }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VERSIONS ── */}
        {tab === 'versions' && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '6px' }}>Version Tracking</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 300 }}>Upload a newer version of this standard to compare what changed.</p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔔</div>
              <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>Compare standard versions</div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 24px', fontWeight: 300, lineHeight: 1.6 }}>Upload a newer version and standards.online will identify every new, changed, and removed requirement.</p>
              <button className="btn-primary">Upload newer version</button>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes bounce{0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)}}`}</style>
    </div>
  )
}
