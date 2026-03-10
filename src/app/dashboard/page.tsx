'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

export default function DashboardPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [queryCount, setQueryCount] = useState(0)
  const [plan, setPlan] = useState('Explorer')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUser(data.user)
      const { data: profile } = await supabase.from('profiles').select('plan, query_count').eq('id', data.user.id).single()
      if (profile) { setPlan(profile.plan || 'Explorer'); setQueryCount(profile.query_count || 0) }
      const { data: projs } = await supabase.from('projects').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(5)
      setProjects(projs || [])
    })
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''
  const queryLimit = plan === 'Explorer' ? 5 : plan === 'professional' ? 100 : 9999
  const remaining = Math.max(queryLimit - queryCount, 0)

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '4px' }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 300 }}>
          {projects.length} active project{projects.length !== 1 ? 's' : ''} · {remaining} quer{remaining !== 1 ? 'ies' : 'y'} remaining
        </p>
      </div>

      {/* Quick tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '36px' }}>
        {[
          { href: '/dashboard/projects?new=1', icon: '➕', label: 'New project', sub: 'Upload a standard', accent: true },
          { href: '/dashboard/library',        icon: '📚', label: 'Standards Library', sub: `${projects.length} standards stored`, accent: false },
          { href: '/dashboard/projects',       icon: '📁', label: 'All Projects', sub: `${projects.length} active`, accent: false },
        ].map(t => (
          <Link key={t.href} href={t.href} style={{ background: 'var(--surface)', border: `1px solid ${t.accent ? 'var(--orange-border)' : 'var(--border)'}`, borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--orange-border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = t.accent ? 'var(--orange-border)' : 'var(--border)')}>
            <div style={{ width: '38px', height: '38px', background: t.accent ? 'var(--orange-soft)' : 'var(--navy-soft)', border: `1px solid ${t.accent ? 'var(--orange-border)' : 'var(--navy-border)'}`, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>{t.icon}</div>
            <div>
              <div style={{ fontFamily: 'Epilogue, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent projects */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.02em', color: 'var(--text)' }}>Recent projects</h2>
        <Link href="/dashboard/projects" style={{ fontSize: '13px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📂</div>
          <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '8px', color: 'var(--text)' }}>No projects yet</div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 300 }}>Upload your first standard to get started.</p>
          <Link href="/dashboard/projects?new=1" className="btn-primary">+ New project</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {projects.map(p => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ width: '38px', height: '38px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em', color: 'var(--text)', marginBottom: '3px' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
                  <span>{p.file_name}</span>
                  <span>Updated {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', border: '1px solid', fontFamily: 'Epilogue, sans-serif', letterSpacing: '0.02em', whiteSpace: 'nowrap', color: '#b45309', borderColor: 'rgba(180,83,9,0.2)', background: 'rgba(180,83,9,0.06)' }}>
                In progress
              </div>
              <div style={{ color: 'var(--text-subtle)', fontSize: '18px' }}>›</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
