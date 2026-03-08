'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [queryCount, setQueryCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadProjects()
  }, [])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4)
    setProjects(data || [])
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-[1000px]">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display font-black text-3xl tracking-[-0.02em] mb-1">{greeting}, {firstName}</h1>
        <p className="text-sm text-slate-ai">Here's your AIstands workspace.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { href:'/dashboard/projects?new=1', icon:'➕', label:'New project', color:'bg-electric/10 border-electric/20 hover:bg-electric/15' },
          { href:'/dashboard/projects',        icon:'📁', label:'My projects', color:'card hover:border-electric/20' },
          { href:'/dashboard/workbook',         icon:'🗒',  label:'Workbooks',   color:'card hover:border-electric/20' },
          { href:'/dashboard/library',          icon:'📚', label:'Standards library', color:'card hover:border-electric/20' },
        ].map(({ href, icon, label, color }) => (
          <Link key={label} href={href} className={`${color} border rounded-xl p-5 flex flex-col gap-3 transition-all group`}>
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-white group-hover:text-electric-bright transition-colors">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display font-bold text-lg tracking-tight">Recent projects</h2>
          <Link href="/dashboard/projects" className="text-sm text-electric-bright hover:underline">View all →</Link>
        </div>
        {projects.length === 0 ? (
          <div className="card rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">📂</div>
            <div className="font-display font-bold text-lg mb-2">No projects yet</div>
            <p className="text-sm text-slate-ai mb-6">Upload your first standard to get started.</p>
            <Link href="/dashboard/projects?new=1" className="btn-primary">Create first project</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {projects.map(p => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}
                className="card rounded-xl p-5 hover:border-electric/25 hover:bg-electric/[0.03] transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xl">📋</span>
                  <span className="badge badge-blue text-[10px]">{p.standard_name || 'Standard'}</span>
                </div>
                <div className="font-display font-bold text-base mb-1.5 group-hover:text-electric-bright transition-colors">{p.name}</div>
                <div className="text-xs text-slate-ai">{p.query_count || 0} queries · {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB') : 'Today'}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="card rounded-2xl p-6">
        <h2 className="font-display font-bold text-base mb-5 tracking-tight">This month's usage</h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label:'AI Queries', used: queryCount, total: 5, unit:'queries' },
            { label:'Projects',   used: projects.length, total: 1, unit:'projects' },
            { label:'Documents',  used: 0, total: 1, unit:'uploads' },
          ].map(({ label, used, total, unit }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-ai">{label}</span>
                <span className="font-medium">{used} / {total === -1 ? '∞' : total}</span>
              </div>
              <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full bg-electric rounded-full transition-all" style={{width: total === -1 ? '10%' : `${Math.min((used/total)*100,100)}%`}} />
              </div>
              <div className="text-[11px] text-slate-ai mt-1">{unit}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-white/[0.07] flex justify-between items-center">
          <p className="text-sm text-slate-ai">On the <span className="text-white font-medium">Explorer</span> free plan</p>
          <Link href="/pricing" className="btn-primary text-sm py-2">Upgrade for more</Link>
        </div>
      </div>
    </div>
  )
}
