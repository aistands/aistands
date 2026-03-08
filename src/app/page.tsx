import { Navbar } from '@/components/layout/Navbar'
import { Logo } from '@/components/ui/Logo'
import Link from 'next/link'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── HERO ── */}
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-12 pt-32 pb-20 relative overflow-hidden">
          {/* Grid bg */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(30,138,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(30,138,255,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)',
            }}
          />
          {/* Glow orbs */}
          <div className="absolute pointer-events-none" style={{ width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle, rgba(30,138,255,0.12) 0%, transparent 70%)',top:-100,left:'50%',transform:'translateX(-50%)' }} />

          <div className="badge badge-blue mb-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-electric shadow-[0_0_6px_#1E8AFF] animate-pulse" />
            Powered by Claude AI
          </div>

          <h1 className="font-display font-black text-[clamp(42px,6vw,76px)] leading-[1.04] tracking-[-0.03em] max-w-4xl mb-6" style={{letterSpacing:'-0.03em'}}>
            The AI workspace built for{' '}
            <em className="not-italic text-electric">standards professionals</em>
          </h1>

          <p className="text-[clamp(16px,2vw,19px)] font-light text-[#aac4e0] max-w-xl leading-relaxed mb-10">
            Upload your standards, ask questions in plain English, build compliance workbooks, track version changes, and generate checklists — all in one intelligent workspace.
          </p>

          <div className="flex gap-3 justify-center flex-wrap mb-16">
            <Link href="/auth/signup" className="btn-primary text-base px-8 py-3.5">
              Start for free →
            </Link>
            <a href="#how" className="btn-ghost text-base px-8 py-3.5">
              See how it works
            </a>
          </div>

          {/* App preview */}
          <div className="w-full max-w-4xl">
            <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{background:'#132952',boxShadow:'0 40px 80px rgba(0,0,0,0.4), 0 0 80px rgba(30,138,255,0.06)'}}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.07]" style={{background:'rgba(11,30,62,0.6)'}}>
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="grid" style={{gridTemplateColumns:'220px 1fr',minHeight:320}}>
                <div className="border-r border-white/[0.07] p-5">
                  <div className="text-[10px] tracking-widest uppercase text-slate-ai mb-3 px-2">Projects</div>
                  {['ISO 9001 — QMS','ISO 45001 — OHS','CE Marking'].map((p,i) => (
                    <div key={p} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm mb-1 ${i===0 ? 'bg-electric/10 text-electric-bright' : 'text-slate-ai'}`}>
                      <span>{i===0?'📋':'📁'}</span>{p}
                    </div>
                  ))}
                  <div className="h-px bg-white/[0.06] my-3" />
                  <div className="text-[10px] tracking-widest uppercase text-slate-ai mb-3 px-2">Tools</div>
                  {['🗒 Workbook','✅ Checklists','🔔 Version tracker'].map(t => (
                    <div key={t} className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-ai mb-1">{t}</div>
                  ))}
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div className="font-display font-black text-base tracking-tight">ISO 9001:2015 — AI Query</div>
                  <div className="flex items-center gap-3 rounded-lg p-3.5 border border-white/[0.07]" style={{background:'rgba(255,255,255,0.03)'}}>
                    <span className="text-sm text-slate-ai italic flex-1">"What does clause 7.2 require us to demonstrate for competence?"</span>
                    <button className="bg-electric text-white text-xs font-semibold px-3 py-1.5 rounded-md">Ask AI</button>
                  </div>
                  <div className="rounded-lg p-4 border border-electric/15" style={{background:'rgba(30,138,255,0.06)'}}>
                    <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-electric-bright mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric shadow-[0_0_6px_#1E8AFF]" />
                      AIstands response · Clause 7.2
                    </div>
                    <p className="text-sm text-[#aac4e0] leading-relaxed">Clause 7.2 requires your organisation to determine the necessary competence of persons doing work under its control, ensure they are competent, and retain documented evidence.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[['✓','Competence requirements defined for each role',true],['✓','Training records maintained and accessible',true],['','Gap analysis against current workforce competence',false]].map(([icon,text,done],i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm">
                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] flex-shrink-0 ${done ? 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-400' : 'bg-white/[0.04] border border-white/10'}`}>{icon}</div>
                        <span className={done ? 'text-[#aac4e0]' : 'text-slate-ai'}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STANDARDS BAR ── */}
        <div className="py-7 px-12 border-t border-b border-white/[0.07]">
          <p className="text-center text-[11px] tracking-[0.12em] uppercase text-slate-ai mb-5">Works with the standards you already use</p>
          <div className="flex gap-8 justify-center flex-wrap">
            {['ISO 9001','ISO 14001','ISO 45001','ISO 27001','CE Marking','FDA 21 CFR','REACH','EN Standards','BS Standards','IATF 16949'].map(s => (
              <span key={s} className="font-display font-bold text-sm text-[rgba(141,163,192,0.45)] tracking-wide hover:text-electric-bright transition-colors cursor-default">{s}</span>
            ))}
          </div>
        </div>

        {/* ── PROBLEM ── */}
        <section className="py-28 px-12 max-w-[1100px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-electric mb-5">The problem</div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] tracking-[-0.03em] leading-[1.08] mb-6">Standards work is slow,<br/>complex, and expensive.</h2>
          <p className="text-lg font-light text-[#aac4e0] leading-relaxed max-w-xl mb-16">Compliance teams spend hours manually reading documents, cross-referencing clauses, and rebuilding the same checklists. AIstands changes that.</p>
          <div className="grid grid-cols-3 gap-5">
            {[
              ['⏱','Hours of manual reading','Finding a specific requirement in a 60-page standard means reading the whole document. AIstands answers in seconds.'],
              ['🔄','Version changes go unnoticed','New standard versions can introduce critical requirement changes. Without tracking, your compliance work becomes outdated.'],
              ['💸','Consultants are expensive','Hiring consultants to interpret standards costs thousands. AIstands gives you the same intelligence at a fraction of the cost.'],
            ].map(([icon,title,desc]) => (
              <div key={title as string} className="card p-7 hover:border-electric/25 hover:bg-electric/[0.04] transition-all">
                <div className="text-3xl mb-4">{icon}</div>
                <div className="font-display font-black text-base mb-2.5">{title}</div>
                <div className="text-sm text-[#aac4e0] leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="pb-28 px-12 max-w-[1100px] mx-auto">
          <div className="mb-16">
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-electric mb-5">Features</div>
            <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] tracking-[-0.03em]">Everything you need to<br/>work with standards.</h2>
          </div>

          {[
            {
              num:'01', title:'Ask any question about your standard',
              desc:'Upload your licensed copy of any standard and ask questions in plain English. AIstands reads, understands, and explains — no clause hunting required.',
              bullets:['Plain English explanations of complex requirements','Clause-level answers grounded in your document','Ask follow-up questions in natural conversation'],
              visual: (
                <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{background:'#132952'}}>
                  <div className="px-4 py-3 border-b border-white/[0.07] text-xs text-slate-ai font-medium flex items-center gap-2" style={{background:'rgba(11,30,62,0.5)'}}>🤖 AI Query — ISO 9001:2015</div>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3 rounded-lg p-3 border border-white/[0.07]" style={{background:'rgba(255,255,255,0.03)'}}>
                      <span className="text-xs text-slate-ai italic flex-1">"What evidence do we need for an internal audit?"</span>
                      <button className="bg-electric text-white text-[11px] font-semibold px-2.5 py-1 rounded">Ask</button>
                    </div>
                    <div className="rounded-lg p-3.5 border border-electric/15" style={{background:'rgba(30,138,255,0.06)'}}>
                      <div className="text-[10px] tracking-widest uppercase text-electric-bright mb-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-electric" />AIstands · Clause 9.2</div>
                      <p className="text-xs text-[#aac4e0] leading-relaxed">Clause 9.2.2(f) requires retaining documented information as evidence of the audit programme and results, including findings and corrective actions.</p>
                    </div>
                  </div>
                </div>
              )
            },
            {
              num:'02', title:'Build structured compliance workbooks',
              desc:'Extract the requirements that matter into organised, annotatable workbooks. Your own structured reference — built with AI, owned by you.',
              bullets:['Extract and organise key requirements by clause','Add your own annotations and implementation notes','Export and share with your team'],
              reverse: true,
              visual: (
                <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{background:'#132952'}}>
                  <div className="px-4 py-3 border-b border-white/[0.07] text-xs text-slate-ai font-medium flex items-center gap-2" style={{background:'rgba(11,30,62,0.5)'}}>🗒 Workbook — ISO 45001</div>
                  <div className="p-5 flex flex-col gap-3">
                    {[['8.1.1','Plan and control processes to meet OH&S requirements.','Review with ops team — assign owner'],['8.1.3','Assess risks before implementing operational changes.','Change control procedure needs updating'],['8.2','Emergency preparedness procedures must be tested.',null]].map(([clause,text,note]) => (
                      <div key={clause as string} className="flex gap-3 p-3 rounded-lg border border-white/[0.07]" style={{background:'rgba(255,255,255,0.03)'}}>
                        <span className="text-[11px] font-semibold bg-electric/10 text-electric-bright px-2 py-0.5 rounded h-fit whitespace-nowrap">{clause}</span>
                        <div>
                          <p className="text-xs text-[#aac4e0] leading-relaxed">{text}</p>
                          {note && <p className="text-[11px] text-emerald-400/70 mt-1.5 flex items-center gap-1">✎ {note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            },
            {
              num:'03', title:'Generate compliance checklists instantly',
              desc:'Turn any standard into a structured, actionable compliance checklist in seconds. Track progress, mark items complete, and close gaps faster.',
              bullets:['Auto-generated from your uploaded standard','Track completion status across your team','Filter by clause, section, or priority'],
              visual: (
                <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{background:'#132952'}}>
                  <div className="px-4 py-3 border-b border-white/[0.07] text-xs text-slate-ai font-medium flex items-center gap-2" style={{background:'rgba(11,30,62,0.5)'}}>✅ Checklist — ISO 9001 Section 7</div>
                  <div className="p-5 flex flex-col gap-0">
                    {[[true,'Resources determined and provided (7.1)'],[true,'Competence requirements documented (7.2)'],[false,'Awareness of quality policy demonstrated (7.3)'],[false,'Communication plan established (7.4)'],[false,'Documented information controlled (7.5)']].map(([done,text],i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                        <div className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[10px] flex-shrink-0 ${done ? 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-400' : 'bg-white/[0.04] border border-white/10'}`}>{done?'✓':''}</div>
                        <span className="text-xs text-[#aac4e0]">{text as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            },
            {
              num:'04', title:'Track changes between standard versions',
              desc:'When a new version is released, AIstands identifies exactly what changed, what\'s new, and what was removed — so nothing slips through.',
              bullets:['Upload old and new versions to compare','AI flags new, changed, and removed requirements','Impact assessment for your existing workbooks'],
              reverse: true,
              visual: (
                <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{background:'#132952'}}>
                  <div className="px-4 py-3 border-b border-white/[0.07] text-xs text-slate-ai font-medium flex items-center gap-2" style={{background:'rgba(11,30,62,0.5)'}}>🔔 Version Tracker — ISO 9001</div>
                  <div className="p-5 flex flex-col gap-0">
                    {[['new','Clause 4.1','Climate change considerations now required in context of the organisation.'],['changed','Clause 6.1','Risk and opportunity language strengthened with explicit treatment requirements.'],['removed','Clause 10.3','Preventive action as a standalone requirement has been removed.']].map(([type,clause,text]) => (
                      <div key={clause as string} className="flex gap-3 py-3 border-b border-white/[0.05] last:border-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded h-fit whitespace-nowrap badge ${type==='new'?'badge-success':type==='changed'?'badge-warning':'bg-red-400/10 text-red-400 border border-red-400/20'}`}>{type}</span>
                        <div>
                          <p className="text-xs text-[#aac4e0] leading-relaxed">{text}</p>
                          <p className="text-[11px] text-slate-ai mt-1">{clause}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          ].map((f) => (
            <div key={f.num} className={`grid grid-cols-2 gap-16 items-center mb-24 ${(f as any).reverse ? 'direction-rtl' : ''}`}
              style={(f as any).reverse ? {direction:'rtl'} : {}}>
              <div style={{direction:'ltr'}}>
                <div className="font-display font-black text-[72px] leading-none tracking-[-0.04em] mb-[-16px]" style={{color:'rgba(30,138,255,0.08)'}}>{f.num}</div>
                <h3 className="font-display font-black text-2xl tracking-[-0.02em] mb-4 leading-snug">{f.title}</h3>
                <p className="text-sm font-light text-[#aac4e0] leading-relaxed mb-5">{f.desc}</p>
                <ul className="flex flex-col gap-2.5">
                  {f.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-slate-ai">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric flex-shrink-0" />{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{direction:'ltr'}}>{f.visual}</div>
            </div>
          ))}
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="py-20 px-12 border-t border-b border-white/[0.07]" style={{background:'rgba(19,41,82,0.3)'}}>
          <div className="max-w-[1100px] mx-auto">
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-electric mb-5">How it works</div>
            <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] tracking-[-0.03em] mb-16">Up and running in minutes.</h2>
            <div className="grid grid-cols-3 gap-10 relative">
              <div className="absolute top-7 pointer-events-none" style={{left:'calc(16.66% + 20px)',right:'calc(16.66% + 20px)',height:1,background:'linear-gradient(90deg, #1E8AFF, rgba(30,138,255,0.2))'}} />
              {[
                ['1','Upload your standard','Upload your licensed copy of any standard, guidance, or regulation. Your documents are private to your workspace.'],
                ['2','Ask, explore & build','Ask questions in plain English, extract requirements into your workbook, annotate with notes, and generate checklists automatically.'],
                ['3','Apply & stay current','Use workbooks and checklists to drive compliance. Get notified when standard versions change and track your transition.'],
              ].map(([num,title,desc]) => (
                <div key={num} className="flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-[14px] bg-electric flex items-center justify-center font-display font-black text-xl text-white" style={{boxShadow:'0 0 24px rgba(30,138,255,0.35)'}}>{num}</div>
                  <div className="font-display font-black text-lg tracking-tight">{title}</div>
                  <div className="text-sm font-light text-[#aac4e0] leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MORE FEATURES ── */}
        <section className="py-28 px-12 max-w-[1100px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-electric mb-5">More tools</div>
          <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] tracking-[-0.03em] mb-16">Built for every part of<br/>the compliance journey.</h2>
          <div className="grid grid-cols-3 gap-5">
            {[
              ['🔍','Gap Analysis','Describe your situation and AIstands identifies exactly where you fall short against requirements — before an auditor does.','AI-powered'],
              ['📎','Audit Preparation','A focused workspace to organise evidence clause by clause. Build a complete audit-ready picture from your workbook.','Audit-ready'],
              ['📚','Standards Library','Browse a searchable directory of standards by name, number, and sector. Discover related standards in your industry.','Discovery'],
              ['🗺','Regulation Mapping','Map standard clauses to relevant regulations. See how ISO 9001 maps to FDA 21 CFR or EN standards to UKCA requirements.','Cross-reference'],
              ['💡','Smart Project Names','Upload a standard and get instant AI-suggested project names. Accept a suggestion or type your own.','AI suggestions'],
              ['🔔','Version Alerts','Get notified when a standard you\'re tracking is updated. See what changed and what it means for your compliance work.','Stay current'],
            ].map(([icon,title,desc,tag]) => (
              <div key={title as string} className="card p-7 hover:border-electric/25 hover:bg-electric/[0.04] transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-electric to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-11 h-11 rounded-[11px] bg-electric/10 border border-electric/15 flex items-center justify-center text-xl mb-4">{icon}</div>
                <div className="font-display font-black text-base mb-2.5">{title}</div>
                <div className="text-sm text-[#aac4e0] leading-relaxed mb-4">{desc}</div>
                <span className="text-[11px] font-semibold tracking-wide uppercase text-electric-bright bg-electric/[0.08] px-2 py-1 rounded">{tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <PricingSection />

        {/* ── FINAL CTA ── */}
        <section className="py-28 px-12 text-center relative overflow-hidden border-t border-white/[0.07]">
          <div className="absolute pointer-events-none" style={{width:600,height:400,borderRadius:'50%',background:'radial-gradient(ellipse, rgba(30,138,255,0.1) 0%, transparent 70%)',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}} />
          <h2 className="font-display font-black text-[clamp(36px,5vw,60px)] tracking-[-0.03em] leading-[1.06] mb-5 relative">
            Ready to work smarter<br/>with <span className="text-electric">standards?</span>
          </h2>
          <p className="text-lg font-light text-[#aac4e0] mb-10 relative">Start for free. No credit card required. Up and running in minutes.</p>
          <Link href="/auth/signup" className="btn-primary text-base px-10 py-3.5 relative">
            Get started free →
          </Link>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="px-12 py-12 border-t border-white/[0.07]">
        <div className="max-w-[1100px] mx-auto grid gap-12" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
          <div>
            <Logo size="sm" />
            <p className="text-sm font-light text-slate-ai mt-3 leading-relaxed max-w-[240px]">Your AI workspace for standards. Built for compliance professionals.</p>
          </div>
          {[
            ['Product',['Features','Pricing','How it works','Changelog']],
            ['Company',['About','Blog','Contact','Careers']],
            ['Legal',['Privacy policy','Terms of service','Cookie policy','Security']],
          ].map(([title, links]) => (
            <div key={title as string}>
              <div className="text-xs font-semibold tracking-[0.12em] uppercase text-slate-ai mb-4">{title}</div>
              <ul className="flex flex-col gap-2.5">
                {(links as string[]).map(l => <li key={l}><a href="#" className="text-sm text-[rgba(141,163,192,0.6)] hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-[1100px] mx-auto mt-10 pt-6 border-t border-white/[0.07] flex justify-between items-center flex-wrap gap-3">
          <p className="text-xs text-[rgba(141,163,192,0.4)]">© 2026 AIstands Ltd. All rights reserved.</p>
          <div className="flex gap-5">
            {['Privacy','Terms','Cookies'].map(l => <a key={l} href="#" className="text-xs text-[rgba(141,163,192,0.4)] hover:text-slate-ai transition-colors">{l}</a>)}
          </div>
        </div>
      </footer>
    </>
  )
}

function PricingSection() {
  return (
    <section id="pricing" className="py-28 px-12 max-w-[1100px] mx-auto">
      <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-electric mb-5">Pricing</div>
      <h2 className="font-display font-black text-[clamp(32px,4vw,52px)] tracking-[-0.03em] mb-12">Simple, transparent pricing.</h2>
      <div className="grid grid-cols-3 gap-5 items-start">
        {[
          { name:'Explorer', tagline:'Try AIstands free, no card required', price:'£0', period:'/month', features:[['✓','5 AI queries per month'],['✓','1 document upload'],['✓','Basic AI summaries'],['✗','Workbooks & annotations',true],['✗','Compliance checklists',true],['✗','Version tracking',true]], cta:'Get started free', featured:false },
          { name:'Professional', tagline:'For individuals and small compliance teams', price:'£29', period:'/month', features:[['✓','100 AI queries per month'],['✓','Up to 5 documents'],['✓','5 projects'],['✓','Workbooks & annotations'],['✓','Compliance checklists'],['✓','Version tracking']], cta:'Start free trial', featured:true },
          { name:'Team', tagline:'For growing teams with multiple standards', price:'£79', period:'/month', features:[['✓','Unlimited AI queries'],['✓','Unlimited documents'],['✓','20 projects + team (5 users)'],['✓','All Professional features'],['✓','Regulation mapping'],['✓','Priority support']], cta:'Start free trial', featured:false },
        ].map(p => (
          <div key={p.name} className={`rounded-[18px] p-8 border relative ${p.featured ? 'bg-electric/[0.06] border-electric/30' : 'card'}`}
            style={p.featured ? {boxShadow:'0 0 48px rgba(30,138,255,0.08)'} : {}}>
            {p.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-electric text-white text-[11px] font-semibold px-3.5 py-1 rounded-full whitespace-nowrap">Most popular</div>}
            <div className="font-display font-black text-xl mb-1.5">{p.name}</div>
            <div className="text-sm text-slate-ai mb-7">{p.tagline}</div>
            <div className="mb-7">
              <span className="font-display font-black text-[44px] tracking-[-0.03em] leading-none">{p.price}</span>
              <span className="text-sm text-slate-ai font-light ml-1">{p.period}</span>
            </div>
            <div className="h-px bg-white/[0.07] mb-6" />
            <ul className="flex flex-col gap-3 mb-8">
              {p.features.map(([icon,text,dim]) => (
                <li key={text as string} className="flex items-start gap-2.5 text-sm">
                  <span className={`flex-shrink-0 mt-0.5 ${dim ? 'text-slate-ai/30' : icon==='✓' ? 'text-emerald-400' : 'text-slate-ai/30'}`}>{icon}</span>
                  <span className={dim ? 'opacity-30 text-[#aac4e0]' : 'text-[#aac4e0]'}>{text}</span>
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className={`w-full block text-center py-3 rounded-xl font-semibold text-sm transition-all ${p.featured ? 'btn-primary' : 'btn-ghost'}`}>
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-10 p-7 card flex items-center justify-between gap-6 flex-wrap rounded-2xl">
        <div>
          <div className="font-display font-black text-lg mb-1.5">Enterprise</div>
          <div className="text-sm text-slate-ai">SSO, API access, custom integrations, dedicated support, and volume licensing.</div>
        </div>
        <a href="mailto:hello@aistands.com" className="btn-secondary whitespace-nowrap">Contact us →</a>
      </div>
    </section>
  )
}
