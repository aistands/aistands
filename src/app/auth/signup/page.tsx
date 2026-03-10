'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { ThemeToggle } from '@/components/theme-provider'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSignup() {
    if (!email || !password || !name) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Epilogue, sans-serif', fontSize: '20px', letterSpacing: '-0.03em', lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: 'var(--text)' }}>standards</span>
            <span style={{ fontWeight: 800, color: 'var(--orange)' }}>.</span>
            <span style={{ fontWeight: 300, color: 'var(--text)' }}>online</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px' }}>
              Start for free
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 300 }}>
              No credit card required · Cancel anytime
            </p>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--shadow-md)' }}>

            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>✉️</div>
                <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>Check your email</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 300 }}>
                  We've sent a confirmation link to <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{email}</strong>. Click it to activate your account.
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '13px', color: '#b91c1c' }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: '18px' }}>
                  <label className="label">Full name</label>
                  <input className="input" type="text" placeholder="Jane Smith" value={name}
                    onChange={e => setName(e.target.value)} autoComplete="name" />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="you@company.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label className="label">Password</label>
                  <input className="input" type="password" placeholder="Min. 8 characters" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    autoComplete="new-password" />
                </div>

                <button onClick={handleSignup}
                  disabled={!email || !password || !name || loading}
                  style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', padding: '13px', borderRadius: '9px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: (!email || !password || !name || loading) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? (
                    <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Creating account…</>
                  ) : 'Create free account'}
                </button>

                <div style={{ borderTop: '1px solid var(--border)', marginTop: '24px', paddingTop: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link href="/auth/login" style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                  </p>
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
