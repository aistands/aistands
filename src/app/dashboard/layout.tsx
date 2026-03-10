'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { ThemeToggle } from '@/components/theme-provider'

const NAV = [
  { href: '/dashboard',          icon: '🏠', label: 'Overview' },
  { href: '/dashboard/projects', icon: '📁', label: 'Projects' },
  { href: '/dashboard/library',  icon: '📚', label: 'Standards Library' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState('Explorer')
  const [queryCount, setQueryCount] = useState(0)
  const queryLimit = plan === 'Explorer' ? 5 : plan === 'Professional' ? 100 : 9999

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, query_count')
        .eq('id', data.user.id)
        .single()
      if (profile) {
        setPlan(profile.plan || 'Explorer')
        setQueryCount(profile.query_count || 0)
      }
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)
  const usedPct = Math.min((queryCount / queryLimit) * 100, 100)

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside className="sidebar w-[228px] flex-shrink-0 flex flex-col">
        <div className="p-5 pb-4" style={{ borderBottom: '1px solid var(--sb-border)' }}>
          <a href="/dashboard" className="logo-mark sm sidebar">
            <span className="lw">standards</span>
            <span className="ld">.</span>
            <span className="lt">online</span>
          </a>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`sb-nav-item ${active ? 'active' : ''}`}>
                <span style={{ fontSize: '15px', width: '18px', textAlign: 'center' }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Plan box + sign out */}
        <div className="p-3" style={{ borderTop: '1px solid var(--sb-border)' }}>
          <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Epilogue, sans-serif' }}>Plan</span>
              <span className="badge badge-orange" style={{ fontSize: '9px' }}>{planLabel}</span>
            </div>
            {plan === 'Explorer' && (
              <>
                <div className="text-[11px] mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{queryCount} of {queryLimit} queries used</div>
                <div className="h-[3px] rounded-full mb-2.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: 'var(--orange)' }} />
                </div>
              </>
            )}
            <Link href="/pricing"
              className="block w-full text-center text-xs font-semibold py-2 rounded-lg"
              style={{ background: 'var(--orange)', color: '#fff' }}>
              Upgrade plan
            </Link>
          </div>
          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto flex flex-col" style={{ minHeight: '100vh' }}>
        {/* Top bar with theme toggle */}
        <div className="flex items-center justify-end px-8 py-3 flex-shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <ThemeToggle />
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

    </div>
  )
}
