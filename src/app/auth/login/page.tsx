'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Logo } from '@/components/ui/Logo'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#0B1E3E'}}>
      <div className="fixed inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(30,138,255,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(30,138,255,0.03) 1px, transparent 1px)',backgroundSize:'48px 48px',maskImage:'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%)'}} />
      <div className="w-full max-w-[400px] relative">
        <div className="text-center mb-8">
          <Logo size="md" />
          <p className="text-sm text-slate-ai mt-2">Welcome back</p>
        </div>
        <div className="card p-8 rounded-2xl" style={{background:'#132952'}}>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0">Password</label>
                <Link href="/auth/reset" className="text-xs text-electric-bright hover:underline">Forgot password?</Link>
              </div>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <div className="h-px bg-white/[0.07] mb-6" />
            <p className="text-sm text-slate-ai">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-electric-bright hover:underline font-medium">Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
