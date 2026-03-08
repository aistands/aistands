'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '../ui/Logo'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
]

export function Navbar() {
  const [dark, setDark] = useState(true)
  const [langOpen, setLangOpen] = useState(false)
  const [lang, setLang] = useState(LANGUAGES[0])
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('light', !dark)
  }, [dark])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 h-[68px] transition-all duration-300
      ${scrolled ? 'backdrop-blur-xl border-b' : ''}
      ${dark
        ? 'bg-navy/85 border-white/[0.07]'
        : 'bg-[#F4F7FB]/90 border-black/[0.07]'
      }`}
    >
      <Logo size="sm" />

      <ul className="flex items-center gap-8 list-none">
        {[['#features','Features'],['#how','How it works'],['#pricing','Pricing'],['#','About']].map(([href,label]) => (
          <li key={label}>
            <a href={href} className={`text-sm font-medium transition-colors hover:text-white ${dark ? 'text-slate-ai' : 'text-[#4a6a8a] hover:!text-navy'}`}>
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        {/* Language */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all
              ${dark
                ? 'bg-white/[0.06] border-white/[0.07] text-slate-ai hover:bg-white/10 hover:text-white'
                : 'bg-black/[0.05] border-black/[0.07] text-[#4a6a8a] hover:bg-black/10 hover:text-navy'
              }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.code.toUpperCase()}</span>
            <span className="text-[10px] opacity-60">▾</span>
          </button>
          {langOpen && (
            <div className={`absolute top-[calc(100%+8px)] right-0 rounded-xl border overflow-hidden min-w-[160px] shadow-2xl z-50
              ${dark ? 'bg-[#0e1e38] border-white/[0.07]' : 'bg-white border-black/[0.07] shadow-lg'}`}
            >
              {LANGUAGES.map(l => (
                <button key={l.code}
                  onClick={() => { setLang(l); setLangOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left
                    ${lang.code === l.code
                      ? 'text-electric-bright bg-electric/[0.07]'
                      : dark ? 'text-slate-ai hover:bg-electric/[0.08] hover:text-white' : 'text-[#4a6a8a] hover:bg-black/[0.04] hover:text-navy'
                    }`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark/light */}
        <button
          onClick={() => setDark(!dark)}
          className={`w-9 h-9 rounded-lg border flex items-center justify-center text-base transition-all
            ${dark
              ? 'bg-white/[0.06] border-white/[0.07] text-slate-ai hover:bg-white/10'
              : 'bg-black/[0.05] border-black/[0.07] text-[#4a6a8a] hover:bg-black/10'
            }`}
        >
          {dark ? '☀' : '🌙'}
        </button>

        <Link href="/auth/login" className={`text-sm font-medium px-3.5 py-2 rounded-lg transition-all
          ${dark ? 'text-slate-ai hover:text-white hover:bg-white/5' : 'text-[#4a6a8a] hover:text-navy hover:bg-black/5'}`}>
          Log in
        </Link>
        <Link href="/auth/signup" className="btn-primary text-sm">
          Get started free
        </Link>
      </div>
    </nav>
  )
}
