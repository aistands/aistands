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
  { value: 'not_started',    label: 'Not started',    color: 'text-slate-ai',      bg: 'bg-white/[0.04]',        border: 'border-white/10' },
  { value: 'in_progress',    label: 'In progress',    color: 'text-amber-400',     bg: 'bg-amber-400/10',        border: 'border-amber-400/30' },
  { value: 'compliant',      label: 'Compliant',      color: 'text-emerald-400',   bg: 'bg-emerald-400/10',      border: 'border-emerald-400/30' },
  { value: 'not_applicable', label: 'Not applicable', color: 'text-slate-ai',      bg: 'bg-white/[0.06]',        border: 'border-white/10' },
]

function statusStyle(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0]
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

  // Workbook state
  const [workbookEntries, setWorkbookEntries] = useState<WorkbookEntry[]>([])
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WorkbookEntry | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importSuggestions, setImportSuggestions] = useState<ImportSuggestion[]>([])
  const [loadingImport, setLoadingImport] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [newEntry, setNewEntry] = useState<WorkbookEntry>({
    clause: '', title: '', requirement: '',
    status: 'not_started', evidence: '', notes: ''
  })

  // Checklist state
  const [checklist, setChecklist] = useState<any[]>([])
  const [generatingChecklist, setGeneratingChecklist] = useState(false)

  const isPdf = project?.file_name?.toLowerCase().endsWith('.pdf')
  const isPaidPlan = userPlan !== 'explorer'

  useEffect(() => {
    loadProject()
    loadWorkbook()
    loadChecklist()
    loadConversation()
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

  // ── Workbook functions ──────────────────────────────────────

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
    setShowAddEntry(false)
    setEditingEntry(null)
    setSavingEntry(false)
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
    setEditingEntry(entry)
    setNewEntry({ ...entry })
    setShowAddEntry(true)
  }

  async function loadImportSuggestions() {
    setLoadingImport(true)
    setShowImport(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/workbook/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, userId: user?.id })
      })
      const data = await res.json()
      if (data.suggestions) {
        setImportSuggestions(data.suggestions.map((s: any) => ({ ...s, selected: true })))
      }
    } catch (e: any) {
      alert('Failed to load suggestions: ' + e.message)
    }
    setLoadingImport(false)
  }

  async function importSelected() {
    const selected = importSuggestions.filter(s => s.selected)
    if (!selected.length) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const records = selected.map(s => ({
      project_id: id, user_id: user.id,
      clause: s.clause, title: s.title, requirement: s.requirement,
      status: 'not_started', evidence: '', notes: '',
      created_at: new Date().toISOString()
    }))

    const { data } = await supabase.from('workbook_entries').insert(records).select()
    setWorkbookEntries(e => [...e, ...(data || [])])
    setShowImport(false)
    setImportSuggestions([])
  }

  // ── Query functions ──────────────────────────────────────

  async function sendQuery() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: question }])
    setLoading(true)
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
      if (data.items) {
        setChecklist(data.items)
      } else {
        alert('Failed to generate checklist: ' + (data.error || 'Unknown error'))
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
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

  if (!project) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-electric border-t-transparent animate-spin" />
    </div>
  )

  // ── Split view ──────────────────────────────────────────────
  if (splitView) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
          <Link href="/dashboard/projects" className="text-slate-ai hover:text-white transition-colors text-sm">← Projects</Link>
          <div className="w-px h-4 bg-white/10" />
          <div>
            <h1 className="font-display font-black text-base tracking-tight leading-none">{project.name}</h1>
            <p className="text-xs text-slate-ai mt-0.5">{project.file_name}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-emerald-400/70 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Split view
            </span>
            <button onClick={() => setSplitView(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-ai hover:text-white hover:border-white/20 transition-all">
              Exit split view
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-white/[0.07] flex flex-col">
            <div className="px-4 py-2 border-b border-white/[0.07]">
              <span className="text-xs font-medium text-slate-ai">📄 {project.file_name}</span>
            </div>
            <div className="flex-1 overflow-hidden bg-[#0a1628]">
              {documentUrl
                ? <iframe src={documentUrl} className="w-full h-full border-0" title="Document viewer" />
                : <div className="flex items-center justify-center h-full">
                    <button onClick={loadDocumentUrl} disabled={loadingPdf} className="btn-primary flex items-center gap-2">
                      {loadingPdf ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Loading…</> : '📄 Load document'}
                    </button>
                  </div>
              }
            </div>
          </div>
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && <div className="w-7 h-7 rounded-lg bg-electric/15 border border-electric/20 flex items-center justify-center text-xs flex-shrink-0 mt-1">🤖</div>}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user' ? 'bg-electric text-white rounded-tr-sm' : 'bg-white/[0.04] border border-white/[0.07] text-[#aac4e0] rounded-tl-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-electric/15 border border-electric/20 flex items-center justify-center text-xs">🤖</div>
                  <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" style={{animationDelay:'0ms'}} />
                    <span className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" style={{animationDelay:'150ms'}} />
                    <span className="w-1.5 h-1.5 rounded-full bg-electric animate-bounce" style={{animationDelay:'300ms'}} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-white/[0.07] flex gap-2" style={{background:'#0e2245'}}>
              <input className="input flex-1 text-sm" placeholder="Ask about your standard…"
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuery()} />
              <button onClick={sendQuery} disabled={!input.trim() || loading} className="btn-primary px-5 text-sm">Send</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main layout ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-4 px-8 py-5 border-b border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
        <Link href="/dashboard/projects" className="text-slate-ai hover:text-white transition-colors text-sm">← Projects</Link>
        <div className="w-px h-4 bg-white/10" />
        <div>
          <h1 className="font-display font-black text-lg tracking-tight leading-none">{project.name}</h1>
          <p className="text-xs text-slate-ai mt-0.5">{project.file_name}</p>
        </div>
        <span className="badge badge-blue text-[10px] ml-auto">{project.standard_name}</span>
      </div>

      <div className="flex gap-1 px-8 py-3 border-b border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'document') loadDocumentUrl() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-electric/10 text-electric-bright border border-electric/20' : 'text-slate-ai hover:text-white hover:bg-white/[0.04]'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">

        {/* ── AI QUERY TAB ── */}
        {tab === 'query' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-8 flex flex-col gap-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                  <div className="text-4xl">🤖</div>
                  <div>
                    <div className="font-display font-bold text-xl mb-2">Ask anything about {project.name}</div>
                    <p className="text-sm text-slate-ai max-w-sm">Ask questions in plain English. AIstands answers from your document.</p>
                  </div>
                  {isPdf && (
                    <button onClick={() => { setSplitView(true); loadDocumentUrl() }}
                      className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-electric/20 text-electric-bright hover:bg-electric/10 transition-all">
                      <span>⬛</span> Open split view — read & ask side by side
                    </button>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {["What are the main requirements?","Which clauses are mandatory?","What evidence do I need?","Summarise clause 7","How do auditors assess this?"].map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className="text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-ai hover:border-electric/30 hover:text-white transition-all">{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && <div className="w-8 h-8 rounded-lg bg-electric/15 border border-electric/20 flex items-center justify-center text-sm flex-shrink-0 mt-1">🤖</div>}
                  <div className="max-w-[80%] flex flex-col gap-1">
                    {m.role === 'assistant' && m.webSearch && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/70 mb-1"><span>🌐</span> Web sources included</div>
                    )}
                    <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === 'user' ? 'bg-electric text-white rounded-tr-sm' : 'bg-white/[0.04] border border-white/[0.07] text-[#aac4e0] rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-electric/15 border border-electric/20 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                  <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-2">
                    {useWebSearch && <span className="text-xs text-emerald-400/70 mr-1">🌐 Searching web…</span>}
                    <span className="w-2 h-2 rounded-full bg-electric animate-bounce" style={{animationDelay:'0ms'}} />
                    <span className="w-2 h-2 rounded-full bg-electric animate-bounce" style={{animationDelay:'150ms'}} />
                    <span className="w-2 h-2 rounded-full bg-electric animate-bounce" style={{animationDelay:'300ms'}} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="p-6 border-t border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setUseWebSearch(!useWebSearch)}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
                    ${useWebSearch ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400' : 'bg-white/[0.04] border-white/10 text-slate-ai hover:border-white/20 hover:text-white'}`}>
                  <span>🌐</span>
                  <span>{useWebSearch ? 'Web search ON' : 'Web search OFF'}</span>
                  <span className={`w-7 h-4 rounded-full transition-all relative ${useWebSearch ? 'bg-emerald-400' : 'bg-white/20'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${useWebSearch ? 'left-3.5' : 'left-0.5'}`} />
                  </span>
                </button>
                <span className="text-xs text-slate-ai">{useWebSearch ? 'Answers combine your document + live web sources' : 'Answers from your document only'}</span>
                {isPdf && messages.length > 0 && (
                  <button onClick={() => { setSplitView(true); loadDocumentUrl() }}
                    className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-ai hover:border-electric/30 hover:text-electric-bright transition-all flex items-center gap-1.5">
                    <span>⬛</span> Split view
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <input className="input flex-1" placeholder="Ask a question about your standard…"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuery()} />
                <button onClick={sendQuery} disabled={!input.trim() || loading} className="btn-primary px-6">Send</button>
              </div>
            </div>
          </div>
        )}

        {/* ── DOCUMENT TAB ── */}
        {tab === 'document' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-8 py-3 border-b border-white/[0.07] flex-shrink-0">
              <span className="text-sm text-slate-ai">📄 {project.file_name}</span>
              {isPdf && (
                <button onClick={() => { setSplitView(true); loadDocumentUrl() }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-electric/20 text-electric-bright hover:bg-electric/10 transition-all flex items-center gap-1.5">
                  <span>⬛</span> Open with AI chat
                </button>
              )}
            </div>
            <div className="flex-1 overflow-hidden bg-[#0a1628]">
              {loadingPdf
                ? <div className="flex items-center justify-center h-full gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-electric border-t-transparent animate-spin" />
                    <span className="text-sm text-slate-ai">Loading document…</span>
                  </div>
                : documentUrl
                  ? isPdf
                    ? <iframe src={documentUrl} className="w-full h-full border-0" title="Document viewer" />
                    : <div className="flex items-center justify-center h-full flex-col gap-4">
                        <p className="text-sm text-slate-ai">Preview not available for this file type.</p>
                        <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">Download file</a>
                      </div>
                  : <div className="flex items-center justify-center h-full flex-col gap-4">
                      <div className="text-4xl">📄</div>
                      <p className="text-sm text-slate-ai">Click below to load your document</p>
                      <button onClick={loadDocumentUrl} className="btn-primary">Load document</button>
                    </div>
              }
            </div>
          </div>
        )}

        {/* ── WORKBOOK TAB ── */}
        {tab === 'workbook' && (
          <div className="p-8">

            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-display font-bold text-xl tracking-tight">Workbook</h2>
                <p className="text-sm text-slate-ai mt-1">
                  {workbookEntries.length > 0
                    ? `${progressCount} of ${workbookEntries.length} clauses addressed`
                    : 'Build your compliance workbook clause by clause'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadImportSuggestions}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-electric/20 text-electric-bright hover:bg-electric/10 transition-all">
                  ✨ Import from AI
                </button>
                <button onClick={() => { setEditingEntry(null); setNewEntry({ clause: '', title: '', requirement: '', status: 'not_started', evidence: '', notes: '' }); setShowAddEntry(true) }}
                  className="btn-primary">
                  + Add entry
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {workbookEntries.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-ai mb-2">
                  <span>{completedCount} compliant · {workbookEntries.filter(e=>e.status==='in_progress').length} in progress · {workbookEntries.filter(e=>e.status==='not_started').length} not started</span>
                  <span>{workbookEntries.length} total entries</span>
                </div>
                <div className="h-2 bg-white/[0.07] rounded-full overflow-hidden flex gap-0.5">
                  <div className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{width:`${(completedCount/workbookEntries.length)*100}%`}} />
                  <div className="h-full bg-amber-400 rounded-full transition-all"
                    style={{width:`${(workbookEntries.filter(e=>e.status==='in_progress').length/workbookEntries.length)*100}%`}} />
                </div>
              </div>
            )}

            {/* Empty state */}
            {workbookEntries.length === 0 && (
              <div className="card rounded-2xl p-16 text-center mb-6">
                <div className="text-4xl mb-4">🗒</div>
                <div className="font-display font-bold text-xl mb-3">Your workbook is empty</div>
                <p className="text-sm text-slate-ai mb-2 max-w-sm mx-auto">Add entries manually for full control, or let AI suggest entries from your document that you can review and approve.</p>
                <div className="flex gap-3 justify-center mt-6">
                  <button onClick={loadImportSuggestions}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-electric/20 text-electric-bright hover:bg-electric/10 transition-all">
                    ✨ Import from AI
                  </button>
                  <button onClick={() => setShowAddEntry(true)} className="btn-primary">+ Add entry manually</button>
                </div>
              </div>
            )}

            {/* Entries table */}
            {workbookEntries.length > 0 && (
              <div className="card rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[80px_1fr_160px_1fr] gap-4 px-6 py-3 border-b border-white/[0.07] text-xs font-semibold text-slate-ai uppercase tracking-wider">
                  <span>Clause</span>
                  <span>Requirement</span>
                  <span>Status</span>
                  <span>Notes / Evidence</span>
                </div>
                {workbookEntries.map((entry, i) => (
                  <div key={entry.id}
                    className={`grid grid-cols-[80px_1fr_160px_1fr] gap-4 px-6 py-4 items-start
                      ${i !== workbookEntries.length - 1 ? 'border-b border-white/[0.07]' : ''}
                      hover:bg-white/[0.02] transition-colors group`}>

                    {/* Clause */}
                    <div>
                      <span className="text-xs font-semibold bg-electric/10 text-electric-bright px-2 py-1 rounded border border-electric/15">
                        {entry.clause}
                      </span>
                    </div>

                    {/* Requirement */}
                    <div>
                      {entry.title && <div className="text-xs font-semibold text-white mb-1">{entry.title}</div>}
                      <p className="text-sm text-[#aac4e0] leading-relaxed">{entry.requirement}</p>
                    </div>

                    {/* Status dropdown */}
                    <div>
                      <select
                        value={entry.status}
                        onChange={e => updateEntryField(entry.id!, 'status', e.target.value)}
                        className={`text-xs px-3 py-1.5 rounded-lg border appearance-none cursor-pointer w-full
                          ${statusStyle(entry.status).bg} ${statusStyle(entry.status).border} ${statusStyle(entry.status).color}`}>
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="flex items-start gap-2">
                      <textarea
                        className="input text-xs flex-1 py-1.5 resize-none overflow-hidden leading-relaxed"
                        placeholder="Add notes or evidence reference…"
                        defaultValue={entry.notes}
                        rows={1}
                        onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px" }}
                        onBlur={e => updateEntryField(entry.id!, "notes", e.target.value)}
                      />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => startEdit(entry)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-ai hover:text-white transition-all text-xs">✎</button>
                        <button onClick={() => deleteEntry(entry.id!)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-400/10 text-slate-ai hover:text-red-400 transition-all text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add / Edit entry modal */}
            {showAddEntry && (
              <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{background:'rgba(11,30,62,0.9)',backdropFilter:'blur(8px)'}}>
                <div className="w-full max-w-[560px] rounded-2xl p-8" style={{background:'#132952',border:'1px solid rgba(255,255,255,0.1)'}}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display font-black text-lg">{editingEntry ? 'Edit entry' : 'Add workbook entry'}</h3>
                    <button onClick={() => { setShowAddEntry(false); setEditingEntry(null) }}
                      className="text-slate-ai hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Clause number</label>
                        <input className="input" placeholder="e.g. 4.1, B.10" value={newEntry.clause}
                          onChange={e => setNewEntry(x => ({...x, clause: e.target.value}))} />
                      </div>
                      <div>
                        <label className="label">Title</label>
                        <input className="input" placeholder="Clause title" value={newEntry.title}
                          onChange={e => setNewEntry(x => ({...x, title: e.target.value}))} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Requirement</label>
                      <textarea className="input min-h-[80px] resize-none" placeholder="The requirement text…"
                        value={newEntry.requirement} onChange={e => setNewEntry(x => ({...x, requirement: e.target.value}))} />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input" value={newEntry.status}
                        onChange={e => setNewEntry(x => ({...x, status: e.target.value as any}))}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Notes / Evidence</label>
                      <textarea className="input min-h-[60px] resize-none" placeholder="Evidence reference, notes, action owner…"
                        value={newEntry.notes} onChange={e => setNewEntry(x => ({...x, notes: e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowAddEntry(false); setEditingEntry(null) }} className="btn-ghost flex-1">Cancel</button>
                    <button onClick={saveEntry} disabled={!newEntry.clause || !newEntry.requirement || savingEntry} className="btn-primary flex-1">
                      {savingEntry ? 'Saving…' : editingEntry ? 'Save changes' : 'Add entry'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Import modal */}
            {showImport && (
              <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{background:'rgba(11,30,62,0.9)',backdropFilter:'blur(8px)'}}>
                <div className="w-full max-w-[700px] rounded-2xl flex flex-col max-h-[80vh]" style={{background:'#132952',border:'1px solid rgba(255,255,255,0.1)'}}>
                  <div className="flex justify-between items-center p-8 pb-4 flex-shrink-0">
                    <div>
                      <h3 className="font-display font-black text-lg">Import from AI</h3>
                      <p className="text-sm text-slate-ai mt-1">Review and select which entries to add to your workbook</p>
                    </div>
                    <button onClick={() => { setShowImport(false); setImportSuggestions([]) }}
                      className="text-slate-ai hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
                  </div>

                  {loadingImport ? (
                    <div className="flex items-center justify-center py-16 gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-electric border-t-transparent animate-spin" />
                      <span className="text-sm text-slate-ai">AI is reading your document…</span>
                    </div>
                  ) : (
                    <>
                      <div className="px-8 py-3 border-y border-white/[0.07] flex items-center gap-4 flex-shrink-0">
                        <span className="text-xs text-slate-ai">{importSuggestions.filter(s=>s.selected).length} of {importSuggestions.length} selected</span>
                        <button onClick={() => setImportSuggestions(s => s.map(x => ({...x, selected: true})))}
                          className="text-xs text-electric-bright hover:underline">Select all</button>
                        <button onClick={() => setImportSuggestions(s => s.map(x => ({...x, selected: false})))}
                          className="text-xs text-slate-ai hover:text-white">Deselect all</button>
                      </div>
                      <div className="overflow-auto flex-1 p-8 pt-4 flex flex-col gap-3">
                        {importSuggestions.map((s, i) => (
                          <div key={i}
                            onClick={() => setImportSuggestions(prev => prev.map((x, j) => j === i ? {...x, selected: !x.selected} : x))}
                            className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all
                              ${s.selected ? 'border-electric/30 bg-electric/[0.06]' : 'border-white/[0.07] hover:border-white/15'}`}>
                            <div className={`w-5 h-5 rounded-[5px] flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 transition-all
                              ${s.selected ? 'bg-electric/20 border border-electric/40 text-electric-bright' : 'bg-white/[0.04] border border-white/10'}`}>
                              {s.selected ? '✓' : ''}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold bg-electric/10 text-electric-bright px-2 py-0.5 rounded border border-electric/15">{s.clause}</span>
                                {s.title && <span className="text-xs font-semibold text-white">{s.title}</span>}
                              </div>
                              <p className="text-sm text-[#aac4e0] leading-relaxed">{s.requirement}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-8 pt-4 border-t border-white/[0.07] flex gap-3 flex-shrink-0">
                        <button onClick={() => { setShowImport(false); setImportSuggestions([]) }} className="btn-ghost flex-1">Cancel</button>
                        <button onClick={importSelected}
                          disabled={importSuggestions.filter(s=>s.selected).length === 0}
                          className="btn-primary flex-1">
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

        {/* ── CHECKLIST TAB ── */}
        {tab === 'checklist' && (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-display font-bold text-xl tracking-tight">Audit Readiness Checklist</h2>
                <p className="text-sm text-slate-ai mt-1">
                  {checklist.length > 0
                    ? `${checklist.filter(i=>i.status==='green').length} green · ${checklist.filter(i=>i.status==='amber').length} amber · ${checklist.filter(i=>i.status==='red').length} red`
                    : 'Generated once from your standard — free to load after that'}
                </p>
              </div>
              {checklist.length === 0 && (
                <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary">
                  {generatingChecklist ? 'Generating…' : '✨ Generate checklist'}
                </button>
              )}
              {checklist.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-ai">
                  <span>Generated once · updates save automatically</span>
                </div>
              )}
            </div>

            {/* RAG progress bar */}
            {checklist.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-ai mb-2">
                  <span>{checklist.filter(i=>i.status==='green').length} ready · {checklist.filter(i=>i.status==='amber').length} in progress · {checklist.filter(i=>i.status==='red').length} not started</span>
                  <span>{checklist.length} total items</span>
                </div>
                <div className="h-2 bg-white/[0.07] rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-400 transition-all" style={{width:`${(checklist.filter(i=>i.status==='green').length/checklist.length)*100}%`}} />
                  <div className="h-full bg-amber-400 transition-all" style={{width:`${(checklist.filter(i=>i.status==='amber').length/checklist.length)*100}%`}} />
                  <div className="h-full bg-red-400 transition-all" style={{width:`${(checklist.filter(i=>i.status==='red').length/checklist.length)*100}%`}} />
                </div>
              </div>
            )}

            {/* Empty state */}
            {checklist.length === 0 && !generatingChecklist && (
              <div className="card rounded-2xl p-16 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <div className="font-display font-bold text-xl mb-3">Audit Readiness Checklist</div>
                <p className="text-sm text-slate-ai mb-2 max-w-md mx-auto">AIstands will read your standard and generate a checklist of auditor questions — the kind an assessor would actually ask.</p>
                <p className="text-xs text-slate-ai/60 mb-6 max-w-sm mx-auto">Generated once and saved permanently. You fill in responsible persons, evidence references, and RAG status as you prepare.</p>
                <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary">
                  {generatingChecklist ? <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Generating checklist…</span> : '✨ Generate audit checklist'}
                </button>
              </div>
            )}

            {generatingChecklist && (
              <div className="card rounded-2xl p-16 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-electric border-t-transparent animate-spin mx-auto mb-4" />
                <div className="font-display font-bold text-lg mb-2">Generating your audit checklist…</div>
                <p className="text-sm text-slate-ai">AIstands is reading your standard and writing auditor questions. This takes about 30 seconds and only happens once.</p>
              </div>
            )}

            {/* Checklist table */}
            {checklist.length > 0 && (
              <div className="card rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="grid gap-4 px-6 py-3 border-b border-white/[0.07] text-xs font-semibold text-slate-ai uppercase tracking-wider"
                  style={{gridTemplateColumns:'70px 1fr 100px 160px 160px'}}>
                  <span>Clause</span>
                  <span>Auditor question</span>
                  <span>Status</span>
                  <span>Responsible</span>
                  <span>Evidence ref</span>
                </div>
                {checklist.map((item, i) => (
                  <div key={item.id}
                    className={`grid gap-4 px-6 py-4 items-start transition-colors hover:bg-white/[0.02]
                      ${i !== checklist.length - 1 ? 'border-b border-white/[0.07]' : ''}`}
                    style={{gridTemplateColumns:'70px 1fr 100px 160px 160px'}}>

                    {/* Clause */}
                    <div className="pt-0.5">
                      <span className="text-xs font-semibold bg-electric/10 text-electric-bright px-2 py-1 rounded border border-electric/15">
                        {item.clause}
                      </span>
                    </div>

                    {/* Audit question */}
                    <div>
                      <p className="text-xs text-slate-ai mb-1">{item.requirement}</p>
                      <p className="text-sm text-white font-medium leading-snug">{item.audit_question}</p>
                    </div>

                    {/* RAG status */}
                    <div>
                      <select
                        value={item.status || 'red'}
                        onChange={e => {
                          const val = e.target.value
                          setChecklist(c => c.map(x => x.id === item.id ? {...x, status: val} : x))
                          supabase.from('checklist_items').update({ status: val }).eq('id', item.id)
                        }}
                        className={`text-xs px-2 py-1.5 rounded-lg border appearance-none cursor-pointer w-full font-semibold
                          ${item.status === 'green' ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400' :
                            item.status === 'amber' ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' :
                            'bg-red-400/10 border-red-400/30 text-red-400'}`}>
                        <option value="red">🔴 Not ready</option>
                        <option value="amber">🟡 In progress</option>
                        <option value="green">🟢 Ready</option>
                      </select>
                    </div>

                    {/* Responsible person */}
                    <input
                      className="input text-xs py-1.5"
                      placeholder="Name / role…"
                      defaultValue={item.responsible_person}
                      onBlur={e => {
                        supabase.from('checklist_items').update({ responsible_person: e.target.value }).eq('id', item.id)
                        setChecklist(c => c.map(x => x.id === item.id ? {...x, responsible_person: e.target.value} : x))
                      }}
                    />

                    {/* Evidence reference */}
                    <input
                      className="input text-xs py-1.5"
                      placeholder="Doc ref, link…"
                      defaultValue={item.evidence_ref}
                      onBlur={e => {
                        supabase.from('checklist_items').update({ evidence_ref: e.target.value }).eq('id', item.id)
                        setChecklist(c => c.map(x => x.id === item.id ? {...x, evidence_ref: e.target.value} : x))
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ── VERSIONS TAB ── */}
        {tab === 'versions' && (
          <div className="p-8">
            <h2 className="font-display font-bold text-xl tracking-tight mb-2">Version Tracking</h2>
            <p className="text-sm text-slate-ai mb-8">Upload a newer version of this standard to compare what changed.</p>
            <div className="card rounded-2xl p-10 text-center">
              <div className="text-4xl mb-4">🔔</div>
              <div className="font-display font-bold text-lg mb-3">Compare standard versions</div>
              <p className="text-sm text-slate-ai mb-6 max-w-sm mx-auto">Upload a newer version and AIstands will identify every new, changed, and removed requirement.</p>
              <button className="btn-primary">Upload newer version</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
