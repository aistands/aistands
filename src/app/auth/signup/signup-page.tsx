'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Logo } from '@/components/ui/Logo'

export default function SignupPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) { setError(error.message); setLoading(false) }
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#0B1E3E'}}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">✉️</div>
        <Logo size="sm" />
        <h2 className="font-display font-black text-2xl mt-6 mb-3">Check your email</h2>
        <p className="text-sm text-[#8DA3C0] leading-relaxed">
          We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.
        </p>
        <Link href="/auth/login" className="btn-secondary mt-6 inline-block">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#0B1E3E'}}>
      <div className="fixed inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(30,138,255,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(30,138,255,0.03) 1px, transparent 1px)',backgroundSize:'48px 48px',maskImage:'radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%)'}} />
      <div className="w-full max-w-[420px] relative">
        <div className="text-center mb-8">
          <Logo size="md" />
          <p className="text-sm text-[#8DA3C0] mt-2">Your AI workspace for standards</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[['5','Free queries'],['1','Free project'],['∞','Standards supported']].map(([val,label]) => (
            <div key={label} className="card rounded-xl p-3 text-center">
              <div className="font-display font-black text-xl text-electric">{val}</div>
              <div className="text-[11px] text-[#8DA3C0] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-8" style={{background:'#132952',border:'1px solid rgba(255,255,255,0.07)'}}>
          <form onSubmit={handleSignup} className="flex flex-col gap-5">
            <div>
              <label className="label">Full name</label>
              <input className="input" type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Work email</label>
              <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required />
            </div>
            {error && <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
            <p className="text-[11px] text-[#8DA3C0] text-center">
              By signing up you agree to our <Link href="/terms" className="text-electric-bright hover:underline">Terms</Link> and <Link href="/privacy" className="text-electric-bright hover:underline">Privacy Policy</Link>
            </p>
          </form>
          <div className="mt-6 text-center">
            <div className="h-px bg-white/[0.07] mb-6" />
            <p className="text-sm text-[#8DA3C0]">Already have an account? <Link href="/auth/login" className="text-electric-bright hover:underline font-medium">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
