'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Logo } from '@/components/ui/Logo'

const NAV = [
  { href:'/dashboard',           icon:'🏠', label:'Overview' },
  { href:'/dashboard/projects',  icon:'📁', label:'Projects' },
  { href:'/dashboard/workbook',  icon:'🗒',  label:'Workbooks' },
  { href:'/dashboard/library',   icon:'📚', label:'Standards Library' },
  { href:'/dashboard/settings',  icon:'⚙️', label:'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState('Explorer')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth/login')
      else setUser(data.user)
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex" style={{background:'#0B1E3E'}}>
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col border-r border-white/[0.07]" style={{background:'#0e2245'}}>
        <div className="p-6 border-b border-white/[0.07]">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'bg-electric/10 text-electric-bright border border-electric/15'
                    : 'text-slate-ai hover:bg-white/[0.04] hover:text-white'
                  }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Plan badge + upgrade */}
        <div className="p-4 border-t border-white/[0.07]">
          <div className="card rounded-xl p-3.5 mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-ai font-medium">Current plan</span>
              <span className="badge badge-blue text-[10px]">{plan}</span>
            </div>
            {plan === 'Explorer' && (
              <>
                <div className="text-[11px] text-slate-ai mb-2">5 queries used / 5</div>
                <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div className="h-full bg-electric rounded-full" style={{width:'100%'}} />
                </div>
                <Link href="/pricing" className="mt-3 btn-primary text-xs py-2 w-full text-center block">Upgrade plan</Link>
              </>
            )}
          </div>
          <button onClick={signOut} className="w-full text-left text-xs text-slate-ai hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors flex items-center gap-2">
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
