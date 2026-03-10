'use client'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-provider'

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" className="logo-mark" style={{ fontSize: '21px' }}>
            <span className="lw">standards</span>
            <span className="ld">.</span>
            <span className="lt">online</span>
          </a>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>Features</a>
            <a href="#pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>Pricing</a>
            <a href="#about" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>About</a>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <ThemeToggle />
            <Link href="/auth/login" className="btn-ghost">Sign in</Link>
            <Link href="/auth/signup" className="btn-primary">Start free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '90px 48px 80px', display: 'grid', gridTemplateColumns: '1fr 460px', gap: '72px', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* bg glow */}
        <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(232,99,26,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: 'Epilogue, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--orange)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '22px' }}>
            <span style={{ width: '5px', height: '5px', background: 'var(--orange)', borderRadius: '50%' }} />
            AI compliance workspace
          </div>

          <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '54px', lineHeight: 1.06, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '22px' }}>
            The smarter way<br />
            to work with{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--orange)' }}>standards</em>
          </h1>

          <p style={{ fontSize: '16px', color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: '440px', marginBottom: '12px', fontWeight: 300 }}>
            Upload your licensed documents. Query them with AI. Build audit-ready workbooks. Everything compliance professionals need — in one place.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '34px', fontSize: '12px', color: 'var(--text-muted)' }}>
            A fraction of the cost of
            {['BSOL', 'Accuris', 'ASTM Compass'].map(s => (
              <span key={s} style={{ background: 'var(--navy-soft)', border: '1px solid var(--navy-border)', color: 'var(--navy)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: 'Epilogue, sans-serif' }}>{s}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <Link href="/auth/signup" className="btn-primary" style={{ fontSize: '15px', padding: '15px 32px', borderRadius: '10px' }}>Start free trial →</Link>
            <a href="#pricing" className="btn-ghost" style={{ fontSize: '15px', padding: '15px 26px', borderRadius: '10px' }}>See pricing</a>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--orange)', fontWeight: 700 }}>✓</span> No credit card required · Cancel anytime
          </p>
        </div>

        {/* Hero right — chat card */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Float top */}
          <div style={{ position: 'absolute', top: '-20px', right: '-24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '11px 14px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', zIndex: 2 }}>
            <div style={{ width: '28px', height: '28px', background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.15)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>✅</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Clause 8.1 — Compliant</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>ISO 9001:2015</div>
            </div>
          </div>

          {/* Chat card */}
          <div className="card" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ background: 'var(--navy)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Epilogue, sans-serif', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📄 ANSI/AAMI CN27:2023
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(232,99,26,0.2)', border: '1px solid rgba(232,99,26,0.3)', color: '#F57332', fontFamily: 'Epilogue, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>AI Query</div>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--orange)', color: '#fff', fontSize: '12.5px', lineHeight: 1.55, padding: '10px 14px', borderRadius: '10px', borderBottomRightRadius: '3px', alignSelf: 'flex-end', maxWidth: '90%' }}>
                What evidence does an auditor need for clause B.4?
              </div>
              <div style={{ background: 'var(--surface-2)', color: 'var(--text)', fontSize: '12.5px', lineHeight: 1.55, padding: '10px 14px', borderRadius: '10px', borderBottomLeftRadius: '3px', border: '1px solid var(--border)', alignSelf: 'flex-start', maxWidth: '90%' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: '4px', fontFamily: 'Epilogue, sans-serif' }}>standards.online</div>
                For clause B.4 auditors expect documented test procedures, calibration records, and signed-off reports with traceability to the device family.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', alignItems: 'center' }}>
              <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: 'var(--text-subtle)', fontFamily: 'DM Sans, sans-serif' }}>Ask another question…</div>
              <div style={{ width: '32px', height: '32px', background: 'var(--orange)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', flexShrink: 0 }}>→</div>
            </div>
          </div>

          {/* Float bottom */}
          <div style={{ position: 'absolute', bottom: '14px', left: '-36px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '11px 14px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', zIndex: 2 }}>
            <div style={{ width: '28px', height: '28px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🎯</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Audit checklist ready</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>47 items · 12 green</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { icon: '🤖', title: 'AI Document Query', desc: 'Ask questions in plain English. Get precise answers from your own licensed standard.' },
            { icon: '📚', title: 'Standards Library', desc: 'Store all your licensed documents securely and access them from anywhere.' },
            { icon: '🗒', title: 'Compliance Workbook', desc: 'Clause-by-clause tracking with evidence references and compliance status.' },
            { icon: '🎯', title: 'Audit Readiness', desc: 'Auto-generated auditor questions with RAG status for every requirement.' },
          ].map((f, i) => (
            <div key={f.title} style={{ padding: '32px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '38px', height: '38px', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VS TABLE */}
      <section style={{ padding: '64px 48px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '34px', letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '8px', color: 'var(--text)' }}>
            Why <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--orange)' }}>standards.online</em>?
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '36px', fontWeight: 300 }}>Built for consultants and small teams who don't need enterprise pricing</p>
          <div className="card" style={{ borderRadius: '14px', overflow: 'hidden' }}>
            {[
              { label: '', so: <span style={{ fontFamily: 'Epilogue, sans-serif', fontSize: '14px' }}><b>standards</b><span style={{ color: 'var(--orange-b)' }}>.</span><span style={{ fontWeight: 300 }}>online</span></span>, bsol: 'BSOL', acc: 'Accuris', astm: 'ASTM Compass', hdr: true },
              { label: 'AI document query', so: '✓ Included', bsol: '✕', acc: '✕', astm: '✕' },
              { label: 'Compliance workbook', so: '✓ Included', bsol: '✕', acc: '✕', astm: '✕' },
              { label: 'Bring your own documents', so: '✓ Yes', bsol: 'Subscription only', acc: 'Subscription only', astm: 'Subscription only' },
              { label: 'Starting price', so: '✓ £29/mo', bsol: '£80+/mo', acc: '£100+/mo', astm: '£80+/mo' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', background: row.hdr ? 'var(--navy)' : 'transparent' }}>
                <div style={{ padding: '13px 20px', fontSize: '13px', fontWeight: row.hdr ? 700 : 500, color: row.hdr ? 'transparent' : 'var(--text)' }}>{row.label}</div>
                {[row.so, row.bsol, row.acc, row.astm].map((cell, j) => (
                  <div key={j} style={{ padding: '13px 20px', fontSize: row.hdr && j > 0 ? '10px' : '13px', color: row.hdr ? (j === 0 ? '#fff' : 'rgba(255,255,255,0.35)') : (j === 0 ? 'var(--orange)' : 'var(--text-muted)'), background: j === 0 && !row.hdr ? 'rgba(232,99,26,0.04)' : j === 0 && row.hdr ? 'rgba(232,99,26,0.15)' : 'transparent', fontFamily: row.hdr && j > 0 ? 'Epilogue, sans-serif' : 'inherit', fontWeight: row.hdr && j > 0 ? 700 : 'inherit', textTransform: row.hdr && j > 0 ? 'uppercase' as const : 'none' as const, letterSpacing: row.hdr && j > 0 ? '0.08em' : 0 }}>
                    {typeof cell === 'string' && cell.startsWith('✕') ? <span style={{ color: 'var(--border-2)' }}>✕</span> : cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '64px 48px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '34px', letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '8px', color: 'var(--text)' }}>
            Simple, <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--orange)' }}>honest</em> pricing
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '40px', fontWeight: 300 }}>No hidden fees. No per-document charges. Just a flat monthly rate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              { tier: 'Explorer', price: '£0', per: 'Free forever', feats: ['5 AI queries per month', '1 document stored', 'Basic workbook'], featured: false },
              { tier: 'Professional', price: '£29', per: 'per month · save 20% annually', feats: ['100 AI queries', '5 documents stored', 'Full workbook + audit checklist'], featured: true },
              { tier: 'Team', price: '£79', per: 'per month · 5 seats included', feats: ['Unlimited AI queries', 'Unlimited documents', '5 team members'], featured: false },
            ].map(p => (
              <div key={p.tier} style={{ background: p.featured ? 'var(--orange)' : 'var(--surface)', border: `1.5px solid ${p.featured ? 'var(--orange)' : 'var(--border)'}`, borderRadius: '16px', padding: '28px' }}>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: p.featured ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginBottom: '14px' }}>{p.tier}</div>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '44px', letterSpacing: '-0.04em', color: p.featured ? '#fff' : 'var(--text)', lineHeight: 1, marginBottom: '4px' }}>{p.price}</div>
                <div style={{ fontSize: '13px', color: p.featured ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginBottom: '22px' }}>{p.per}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {p.feats.map(f => (
                    <div key={f} style={{ fontSize: '13px', color: p.featured ? 'rgba(255,255,255,0.85)' : 'var(--text-mid)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: p.featured ? 'rgba(255,255,255,0.9)' : 'var(--orange)', fontWeight: 800, fontSize: '12px' }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 48px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" className="logo-mark sm">
            <span className="lw">standards</span>
            <span className="ld">.</span>
            <span className="lt">online</span>
          </a>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>© 2025 standards.online · Built for compliance professionals</p>
          <ThemeToggle />
        </div>
      </footer>

    </div>
  )
}
