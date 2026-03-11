'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'

type Subscription = {
  id: string
  standard_ref: string
  standard_title: string
  frequency: 'weekly' | 'monthly'
  created_at: string
}

type SearchResult = {
  reference: string
  title: string
  status: string
  edition?: string
  publication_date?: string
  tc_reference?: string
  iso_url?: string
}

const topBarStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
}

export default function AlertsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [userPlan, setUserPlan] = useState('explorer')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadingSubs, setLoadingSubs] = useState(true)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [defaultFrequency, setDefaultFrequency] = useState<'weekly' | 'monthly'>('weekly')

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const isPaid = userPlan !== 'explorer'

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      const { data: profile } = await supabase
        .from('profiles').select('plan').eq('id', data.user.id).single()
      setUserPlan(profile?.plan || 'explorer')
      await loadSubscriptions(data.user.id)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setSearchResults([]); setShowResults(false); return }
    const timer = setTimeout(() => doSearch(query), 350)
    return () => clearTimeout(timer)
  }, [query])

  async function loadSubscriptions(uid: string) {
    setLoadingSubs(true)
    const res = await fetch(`/api/iso/subscriptions?userId=${uid}`)
    const data = await res.json()
    setSubscriptions(data.subscriptions || [])
    setLoadingSubs(false)
  }

  async function doSearch(q: string) {
    setSearching(true)
    try {
      const res = await fetch(`/api/iso/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
      setShowResults(true)
    } catch {}
    setSearching(false)
  }

  async function subscribe(result: SearchResult) {
    if (!userId) return
    setAdding(result.reference)
    try {
      const res = await fetch('/api/iso/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          standardRef: result.reference,
          standardTitle: result.title,
          frequency: defaultFrequency,
        }),
      })
      const data = await res.json()
      if (data.subscription) {
        setSubscriptions(s => [data.subscription, ...s.filter(x => x.standard_ref !== result.reference)])
        showToast(`Subscribed to ${result.reference}`, 'success')
        setQuery('')
        setShowResults(false)
      }
    } catch {}
    setAdding(null)
  }

  async function unsubscribe(ref: string) {
    setRemoving(ref)
    try {
      await fetch('/api/iso/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, standardRef: ref }),
      })
      setSubscriptions(s => s.filter(x => x.standard_ref !== ref))
      showToast('Subscription removed', 'success')
    } catch {}
    setRemoving(null)
  }

  async function updateFrequency(ref: string, freq: 'weekly' | 'monthly') {
    const sub = subscriptions.find(s => s.standard_ref === ref)
    if (!sub) return
    setSubscriptions(s => s.map(x => x.standard_ref === ref ? { ...x, frequency: freq } : x))
    await fetch('/api/iso/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        standardRef: ref,
        standardTitle: sub.standard_title,
        frequency: freq,
      }),
    })
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const subscribedRefs = new Set(subscriptions.map(s => s.standard_ref))
  const weeklyCount = subscriptions.filter(s => s.frequency === 'weekly').length
  const monthlyCount = subscriptions.filter(s => s.frequency === 'monthly').length

  const Spinner = ({ size = 16, light = false }: { size?: number; light?: boolean }) => (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${light ? 'rgba(255,255,255,0.25)' : 'var(--orange-border)'}`,
      borderTopColor: light ? '#fff' : 'var(--orange)',
      display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )

  // ── Paywall ──────────────────────────────────────────────────
  if (!loadingSubs && !isPaid) {
    return (
      <div style={{ padding: '48px 40px', maxWidth: '640px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px' }}>
            ISO Standard Alerts
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 300 }}>
            Get notified when standards you follow are revised, updated, or withdrawn.
          </p>
        </div>

        <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔔</div>
          <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '8px' }}>
            Available on paid plans
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 28px', fontWeight: 300, lineHeight: 1.6 }}>
            Subscribe to any ISO standard and get a digest of changes — weekly or monthly — delivered straight to your inbox.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px', margin: '0 auto 28px', textAlign: 'left' }}>
            {[
              '🔔  Subscribe to any ISO standard',
              '📬  Weekly or monthly email digests',
              '📋  Revision, withdrawal & new edition alerts',
              '✅  Covers all ISO, ISO/IEC, ISO/TR standards',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-mid)' }}>
                {f}
              </div>
            ))}
          </div>

          <a href="/dashboard/settings?upgrade=true"
            style={{ display: 'inline-block', background: 'var(--orange)', color: '#fff', padding: '12px 28px', borderRadius: '9px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
            Upgrade to Professional →
          </a>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Main view ────────────────────────────────────────────────
  return (
    <div style={{ padding: '40px', maxWidth: '820px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '6px' }}>
          ISO Standard Alerts
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 300 }}>
          Follow standards and get emailed when they're revised, updated, or withdrawn.
        </p>
      </div>

      {/* Stats row */}
      {!loadingSubs && subscriptions.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Following', value: subscriptions.length, icon: '🔔' },
            { label: 'Weekly alerts', value: weeklyCount, icon: '📅' },
            { label: 'Monthly alerts', value: monthlyCount, icon: '🗓' },
          ].map(stat => (
            <div key={stat.label} style={{ ...cardStyle, padding: '16px 20px', flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              <div>
                <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 800, fontSize: '22px', color: 'var(--text)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Add */}
      <div style={{ ...cardStyle, padding: '24px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
            Add a standard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 300 }}>
            Search by standard number (e.g. ISO 9001) or keyword (e.g. quality management)
          </p>
        </div>

        {/* Default frequency selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Alert me:</span>
          {(['weekly', 'monthly'] as const).map(f => (
            <button key={f} onClick={() => setDefaultFrequency(f)}
              style={{
                fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                background: defaultFrequency === f ? 'var(--orange-soft)' : 'var(--surface-2)',
                border: defaultFrequency === f ? '1px solid var(--orange-border)' : '1px solid var(--border)',
                color: defaultFrequency === f ? 'var(--orange-b)' : 'var(--text-muted)',
              }}>
              {f === 'weekly' ? '📅 Weekly' : '🗓 Monthly'}
            </button>
          ))}
          <span style={{ fontSize: '12px', color: 'var(--text-subtle)', marginLeft: '4px' }}>
            {defaultFrequency === 'weekly' ? 'Every Monday' : 'First of each month'}
          </span>
        </div>

        {/* Search input */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 40px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface-2)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text)', outline: 'none' }}
              placeholder="Search ISO standards…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {searching && (
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <Spinner size={14} />
              </span>
            )}
          </div>

          {/* Results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-md)', zIndex: 100, maxHeight: '360px', overflow: 'auto' }}>
              {searchResults.map((r, i) => {
                const alreadySubscribed = subscribedRefs.has(r.reference)
                const isAdding = adding === r.reference
                return (
                  <div key={r.reference}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s', cursor: alreadySubscribed ? 'default' : 'pointer' }}
                    onMouseEnter={e => !alreadySubscribed && ((e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>{r.reference}</span>
                        {r.status && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px', fontFamily: 'Epilogue, sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase',
                            background: r.status.toLowerCase().includes('publish') ? 'rgba(21,128,61,0.08)' : 'var(--surface-2)',
                            border: r.status.toLowerCase().includes('publish') ? '1px solid rgba(21,128,61,0.2)' : '1px solid var(--border)',
                            color: r.status.toLowerCase().includes('publish') ? '#15803d' : 'var(--text-muted)',
                          }}>
                            {r.status}
                          </span>
                        )}
                        {r.publication_date && (
                          <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{r.publication_date}</span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, fontWeight: 300, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                    </div>
                    {alreadySubscribed ? (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)', padding: '4px 10px', borderRadius: '6px', flexShrink: 0 }}>✓ Following</span>
                    ) : (
                      <button onClick={() => subscribe(r)} disabled={!!isAdding}
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '6px 14px', borderRadius: '7px', background: 'var(--orange)', color: '#fff', border: 'none', cursor: isAdding ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        {isAdding ? <><Spinner size={12} light /> Adding…</> : '+ Follow'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {showResults && searchResults.length === 0 && !searching && query.length >= 2 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center', zIndex: 100 }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No standards found for "{query}"</p>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: '4px 0 0' }}>Try searching by exact number, e.g. "ISO 9001" or "ISO 27001"</p>
            </div>
          )}
        </div>
      </div>

      {/* Subscriptions list */}
      <div>
        <h2 style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          Your followed standards {!loadingSubs && subscriptions.length > 0 && <span style={{ fontWeight: 300, color: 'var(--text-muted)', fontSize: '14px' }}>({subscriptions.length})</span>}
        </h2>

        {loadingSubs && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '32px 0' }}>
            <Spinner /><span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading subscriptions…</span>
          </div>
        )}

        {!loadingSubs && subscriptions.length === 0 && (
          <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>🔔</div>
            <div style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text)', marginBottom: '6px' }}>
              No standards followed yet
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '320px', margin: '0 auto', fontWeight: 300, lineHeight: 1.6 }}>
              Search above for any ISO standard to start receiving change alerts.
            </p>
          </div>
        )}

        {!loadingSubs && subscriptions.length > 0 && (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 180px 80px', gap: '16px', padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Epilogue, sans-serif' }}>
              <span>Standard</span>
              <span>Title</span>
              <span>Alert frequency</span>
              <span></span>
            </div>

            {subscriptions.map((sub, i) => (
              <div key={sub.id}
                style={{ display: 'grid', gridTemplateColumns: '120px 1fr 180px 80px', gap: '16px', padding: '14px 20px', alignItems: 'center', borderBottom: i < subscriptions.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>

                <span style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 700, fontSize: '13px', color: 'var(--text)', background: 'var(--orange-soft)', border: '1px solid var(--orange-border)', color: 'var(--orange-b)', padding: '3px 9px', borderRadius: '5px', display: 'inline-block' }}>
                  {sub.standard_ref}
                </span>

                <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.standard_title}
                </p>

                {/* Frequency toggle */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['weekly', 'monthly'] as const).map(f => (
                    <button key={f} onClick={() => updateFrequency(sub.standard_ref, f)}
                      style={{
                        fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                        background: sub.frequency === f ? 'var(--orange-soft)' : 'transparent',
                        border: sub.frequency === f ? '1px solid var(--orange-border)' : '1px solid transparent',
                        color: sub.frequency === f ? 'var(--orange-b)' : 'var(--text-muted)',
                      }}>
                      {f === 'weekly' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>

                {/* Remove */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => unsubscribe(sub.standard_ref)} disabled={removing === sub.standard_ref}
                    style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(185,28,28,0.25)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}>
                    {removing === sub.standard_ref ? <Spinner size={12} /> : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info callout */}
      <div style={{ marginTop: '28px', padding: '16px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>ℹ️</span>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: '0 0 4px', fontWeight: 500 }}>How alerts work</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, fontWeight: 300 }}>
            We sync with the <a href="https://www.iso.org/open-data.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--orange)', textDecoration: 'none' }}>ISO Open Data</a> dataset and detect changes to standard status, edition number, and publication date.
            When a change is found for a standard you follow, you'll receive an email digest on your chosen schedule.
            Alerts cover revisions, new editions, and withdrawals.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', right: '28px', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#fff', background: toast.type === 'success' ? '#15803d' : '#b91c1c', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000, fontFamily: 'DM Sans, sans-serif', transition: 'opacity 0.3s' }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
