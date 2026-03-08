'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

type Tab = 'query' | 'workbook' | 'checklist' | 'versions'
type Message = { role: 'user' | 'assistant'; content: string; webSearch?: boolean }

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
  const [workbookEntries, setWorkbookEntries] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [generatingChecklist, setGeneratingChecklist] = useState(false)
  const [generatingWorkbook, setGeneratingWorkbook] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProject()
    loadWorkbook()
    loadChecklist()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || ''))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadProject() {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(data)
  }
  async function loadWorkbook() {
    const { data } = await supabase.from('workbook_entries').select('*').eq('project_id', id).order('created_at')
    setWorkbookEntries(data || [])
  }
  async function loadChecklist() {
    const { data } = await supabase.from('checklist_items').select('*').eq('project_id', id).order('created_at')
    setChecklist(data || [])
  }

  async function sendQuery() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, question, history: messages, userId, useWebSearch })
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.answer, webSearch: data.webSearchUsed }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  async function generateWorkbook() {
    setGeneratingWorkbook(true)
    const res = await fetch('/api/workbook/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id })
    })
    const data = await res.json()
    if (data.entries) {
      const { data: inserted } = await supabase.from('workbook_entries').insert(
        data.entries.map((e: any) => ({ ...e, project_id: id, id: undefined }))
      ).select()
      setWorkbookEntries(inserted || [])
    }
    setGeneratingWorkbook(false)
  }

  async function generateChecklist() {
    setGeneratingChecklist(true)
    const res = await fetch('/api/checklist/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id })
    })
    const data = await res.json()
    if (data.items) {
      const { data: inserted } = await supabase.from('checklist_items').insert(
        data.items.map((i: any) => ({ ...i, project_id: id, id: undefined }))
      ).select()
      setChecklist(inserted || [])
    }
    setGeneratingChecklist(false)
  }

  async function toggleCheck(item: any) {
    setChecklist(c => c.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i))
    await supabase.from('checklist_items').update({ completed: !item.completed }).eq('id', item.id)
  }

  async function updateNote(entryId: string, notes: string) {
    await supabase.from('workbook_entries').update({ notes }).eq('id', entryId)
    setWorkbookEntries(e => e.map(x => x.id === entryId ? { ...x, notes } : x))
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'query',     label: 'AI Query',  icon: '🤖' },
    { key: 'workbook',  label: 'Workbook',  icon: '🗒'  },
    { key: 'checklist', label: 'Checklist', icon: '✅'  },
    { key: 'versions',  label: 'Versions',  icon: '🔔'  },
  ]

  if (!project) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-electric border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
        <Link href="/dashboard/projects" className="text-slate-ai hover:text-white transition-colors text-sm">← Projects</Link>
        <div className="w-px h-4 bg-white/10" />
        <div>
          <h1 className="font-display font-black text-lg tracking-tight leading-none">{project.name}</h1>
          <p className="text-xs text-slate-ai mt-0.5">{project.file_name}</p>
        </div>
        <span className="badge badge-blue text-[10px] ml-auto">{project.standard_name}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-8 py-3 border-b border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-electric/10 text-electric-bright border border-electric/20' : 'text-slate-ai hover:text-white hover:bg-white/[0.04]'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">

        {/* AI QUERY TAB */}
        {tab === 'query' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-8 flex flex-col gap-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                  <div className="text-4xl">🤖</div>
                  <div>
                    <div className="font-display font-bold text-xl mb-2">Ask anything about {project.name}</div>
                    <p className="text-sm text-slate-ai max-w-sm">Ask questions in plain English. AIstands answers from your document — optionally enhanced with web sources.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {["What are the main requirements?","Which clauses are mandatory?","What evidence do I need?","Summarise clause 7","How do auditors assess this?"].map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className="text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-ai hover:border-electric/30 hover:text-white transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-electric/15 border border-electric/20 flex items-center justify-center text-sm flex-shrink-0 mt-1">🤖</div>
                  )}
                  <div className="max-w-[80%] flex flex-col gap-1">
                    {m.role === 'assistant' && m.webSearch && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/70 mb-1">
                        <span>🌐</span> Web sources included
                      </div>
                    )}
                    <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === 'user'
                        ? 'bg-electric text-white rounded-tr-sm'
                        : 'bg-white/[0.04] border border-white/[0.07] text-[#aac4e0] rounded-tl-sm'
                      }`}>
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

            {/* Input area with web search toggle */}
            <div className="p-6 border-t border-white/[0.07] flex-shrink-0" style={{background:'#0e2245'}}>
              {/* Web search toggle */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
                    ${useWebSearch
                      ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                      : 'bg-white/[0.04] border-white/10 text-slate-ai hover:border-white/20 hover:text-white'
                    }`}
                >
                  <span>🌐</span>
                  <span>{useWebSearch ? 'Web search ON' : 'Web search OFF'}</span>
                  <span className={`w-7 h-4 rounded-full transition-all relative ${useWebSearch ? 'bg-emerald-400' : 'bg-white/20'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${useWebSearch ? 'left-3.5' : 'left-0.5'}`} />
                  </span>
                </button>
                <span className="text-xs text-slate-ai">
                  {useWebSearch ? 'Answers combine your document + live web sources' : 'Answers from your document only'}
                </span>
              </div>

              <div className="flex gap-3">
                <input
                  className="input flex-1"
                  placeholder="Ask a question about your standard…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendQuery()}
                />
                <button onClick={sendQuery} disabled={!input.trim() || loading} className="btn-primary px-6">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKBOOK TAB */}
        {tab === 'workbook' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-display font-bold text-xl tracking-tight">Workbook</h2>
                <p className="text-sm text-slate-ai mt-1">Extracted requirements with your annotations</p>
              </div>
              <button onClick={generateWorkbook} disabled={generatingWorkbook} className="btn-primary">
                {generatingWorkbook ? 'Generating…' : workbookEntries.length ? 'Regenerate' : '✨ Generate workbook'}
              </button>
            </div>
            {workbookEntries.length === 0 ? (
              <div className="card rounded-2xl p-16 text-center">
                <div className="text-4xl mb-4">🗒</div>
                <div className="font-display font-bold text-xl mb-3">No workbook entries yet</div>
                <p className="text-sm text-slate-ai mb-6">Generate a workbook and AIstands will extract all key requirements from your standard.</p>
                <button onClick={generateWorkbook} disabled={generatingWorkbook} className="btn-primary">
                  {generatingWorkbook ? 'Generating…' : '✨ Generate workbook'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {workbookEntries.map(e => (
                  <div key={e.id} className="card rounded-xl p-5 hover:border-electric/20 transition-all">
                    <div className="flex gap-4">
                      <span className="text-xs font-semibold bg-electric/10 text-electric-bright px-2.5 py-1 rounded h-fit whitespace-nowrap border border-electric/15 mt-0.5">{e.clause}</span>
                      <div className="flex-1">
                        <div className="font-display font-bold text-sm mb-1.5">{e.title}</div>
                        <p className="text-sm text-[#aac4e0] leading-relaxed mb-3">{e.requirement}</p>
                        <div className="relative">
                          <span className="text-[11px] text-emerald-400/70 absolute left-3 top-2.5">✎</span>
                          <input className="input text-xs pl-7 py-2 bg-emerald-400/[0.04] border-emerald-400/20 focus:border-emerald-400/40"
                            placeholder="Add your annotation…" defaultValue={e.notes}
                            onBlur={ev => updateNote(e.id, ev.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {tab === 'checklist' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-display font-bold text-xl tracking-tight">Compliance Checklist</h2>
                <p className="text-sm text-slate-ai mt-1">
                  {checklist.length > 0 ? `${checklist.filter(i=>i.completed).length} of ${checklist.length} complete` : 'Auto-generated from your standard'}
                </p>
              </div>
              <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary">
                {generatingChecklist ? 'Generating…' : checklist.length ? 'Regenerate' : '✨ Generate checklist'}
              </button>
            </div>
            {checklist.length > 0 && (
              <div className="mb-6 h-2 bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full bg-electric rounded-full transition-all"
                  style={{width:`${(checklist.filter(i=>i.completed).length/checklist.length)*100}%`}} />
              </div>
            )}
            {checklist.length === 0 ? (
              <div className="card rounded-2xl p-16 text-center">
                <div className="text-4xl mb-4">✅</div>
                <div className="font-display font-bold text-xl mb-3">No checklist yet</div>
                <p className="text-sm text-slate-ai mb-6">Generate a checklist and AIstands will turn your standard into actionable items.</p>
                <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary">
                  {generatingChecklist ? 'Generating…' : '✨ Generate checklist'}
                </button>
              </div>
            ) : (
              <div className="card rounded-2xl overflow-hidden">
                {checklist.map((item, i) => (
                  <div key={item.id}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors ${i!==checklist.length-1?'border-b border-white/[0.07]':''}`}
                    onClick={() => toggleCheck(item)}>
                    <div className={`w-5 h-5 rounded-[5px] flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 transition-all
                      ${item.completed ? 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-400' : 'bg-white/[0.04] border border-white/10'}`}>
                      {item.completed ? '✓' : ''}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed ${item.completed ? 'line-through text-slate-ai' : 'text-[#aac4e0]'}`}>{item.requirement}</p>
                      {item.clause && <p className="text-xs text-slate-ai mt-1">Clause {item.clause}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VERSIONS TAB */}
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
