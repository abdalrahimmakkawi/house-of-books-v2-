import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Admin bypass configuration
const ADMIN_EMAILS = ['abdalrahimmakkawi@gmail.com']
export const isAdminUser = (email: string) => ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase().trim())
// Admin bypass function available for future rate limiting bypasses

// ── Constants ──────────────────────────────────────────────────────
const G   = "#c9a84c"
const GL  = "#e8c97a"
const GD  = "rgba(201,168,76,0.08)"
const GB  = "rgba(201,168,76,0.18)"
const BG  = "#06050a"
const TX  = "#e8e4d9"
const TM  = "rgba(232,228,217,0.45)"
const GRN = "#4ac878"
const RED = "#f05555"
const SF  = "rgba(255,255,255,0.03)"
const HISTORY_KEY = "hob_agent_history"

// ── Books ──────────────────────────────────────────────────────────
const BOOKS = [
  { id:"1", title:"Atomic Habits",            author:"James Clear",       cover:"https://covers.openlibrary.org/b/id/10523163-M.jpg", category:"Self-Help",    summary:"A practical guide to building good habits using the 1% rule and four laws of behavior change.", insights:["Make it obvious, attractive, easy, and satisfying","Identity-based habits beat outcome-based ones","The 2-minute rule: start with less than 2 minutes","Environment design matters more than motivation","Track habits to maintain streaks"] },
  { id:"2", title:"Sapiens",                   author:"Yuval Noah Harari", cover:"https://covers.openlibrary.org/b/id/8739161-M.jpg",  category:"History",      summary:"A sweeping history of humankind from the Stone Age to the modern era.", insights:["The Cognitive Revolution gave humans unique storytelling ability","Shared myths enable large-scale cooperation","Agriculture may have been history's biggest fraud","Capitalism and science dominate modernity","Happiness hasn't increased proportionally with progress"] },
  { id:"3", title:"Deep Work",                 author:"Cal Newport",       cover:"https://covers.openlibrary.org/b/id/7984916-M.jpg",  category:"Productivity", summary:"An argument for focused, distraction-free work and how to cultivate this increasingly rare ability.", insights:["Deep work is becoming rarer and more valuable","Schedule every minute deliberately","Embrace boredom — train focus like a muscle","Quit social media unless it provides outsized value","Work in 90-minute focused blocks"] },
  { id:"4", title:"Meditations",               author:"Marcus Aurelius",   cover:"https://covers.openlibrary.org/b/id/9254401-M.jpg",  category:"Philosophy",   summary:"Personal reflections of Roman Emperor Marcus Aurelius on Stoic philosophy.", insights:["You have power over your mind, not outside events","The obstacle is the way","Live each day as if it were your last","Focus only on what is in your control","Act for the common good without seeking recognition"] },
  { id:"5", title:"The Psychology of Money",  author:"Morgan Housel",     cover:"https://covers.openlibrary.org/b/id/10494183-M.jpg", category:"Finance",      summary:"Timeless lessons on wealth, greed, and happiness.", insights:["Getting wealthy and staying wealthy require different skills","Compounding works in finance and in life","Save money even without a reason","Your personal history colors your decisions","Wealth is what you don't spend — it's invisible"] },
  { id:"6", title:"Man's Search for Meaning", author:"Viktor Frankl",     cover:"https://covers.openlibrary.org/b/id/8271495-M.jpg",  category:"Psychology",   summary:"A Holocaust survivor's account and logotherapy — finding meaning as the primary human drive.", insights:["Meaning can be found even in unavoidable suffering","Everything can be taken except choosing your response","Love is the ultimate goal","Suffering ceases when it finds meaning","Don't aim for success — the more you aim the more you miss"] },
]

// ── Competitors ────────────────────────────────────────────────────
const COMPETITORS = [
  { id:"blinkist",       name:"Blinkist",       emoji:"📘", tagline:"5000+ book summaries in 15 min",           pricing:"$15.99/mo", visitors:"~10M/mo",  rating:"4.6★", strengths:["Huge library 5000+","Audio blinks","Strong brand","Mobile apps","Offline mode"],            weaknesses:["No AI chat","Generic summaries","No community","Expensive","No gamification","Shallow summaries"], differentiator:"Speed — get the idea fast" },
  { id:"getabstract",    name:"getAbstract",    emoji:"📋", tagline:"Business book summaries, enterprise focus",  pricing:"$19.99/mo", visitors:"~2M/mo",   rating:"3.8★", strengths:["Strong B2B sales","PDF summaries","Corporate training","Wide business coverage"],         weaknesses:["Zero AI features","Outdated UI","Very expensive","Only business books","No mobile","No community"],    differentiator:"Enterprise contracts" },
  { id:"shortform",      name:"Shortform",      emoji:"📖", tagline:"In-depth book analysis, not just summaries", pricing:"$24.99/mo", visitors:"~800K/mo", rating:"No app", strengths:["Very detailed analysis","Critiques included","Chapter-by-chapter","Serious learners"],  weaknesses:["No AI chat","No community","Most expensive","Small library","Web only","No gamification"],        differentiator:"Depth over speed" },
  { id:"goodreads",      name:"Goodreads",      emoji:"🌐", tagline:"World's largest book community, 150M users",  pricing:"Free",      visitors:"~90M/mo",  rating:"4.0★", strengths:["Massive community 150M","Social graph","Book tracking","Amazon integration","Free"],  weaknesses:["No summaries","Zero AI","Terrible UI","Amazon neglect","No learning features"],                   differentiator:"Network effects" },
  { id:"readingraphics", name:"Readingraphics", emoji:"🎨", tagline:"Visual infographic book summaries",           pricing:"$19/mo",    visitors:"~200K/mo", rating:"N/A",  strengths:["Unique visual format","Good for visual learners","Memorable summaries"],                weaknesses:["Very small library","No AI","No community","Niche appeal","No mobile app"],                        differentiator:"Infographic format" },
]

// ── 8 Business Agents ─────────────────────────────────────────────
const BUSINESS_AGENTS = [
  {
    id: "growth",
    icon: "🚀",
    label: "Growth Advisor",
    desc: "Get a specific 90-day growth plan based on your current metrics",
    color: GRN,
    placeholder: "Describe your current situation: users, MRR, biggest challenge, main channel…",
    suggestions: [
      "I have 500 free users and $0 MRR. How do I get to $1000 MRR in 90 days?",
      "What's the highest leverage thing I can do this week to grow?",
      "How do I convert free users to paid without being pushy?",
      "Which acquisition channel should I focus on with a $100/month budget?",
    ],
    systemPrompt: `You are a growth advisor who has helped 50+ bootstrapped SaaS founders reach $10K MRR. You specialize in book apps, EdTech, and subscription products.

House of Books context:
- AI-powered book summaries + AI chat per book + community
- 210+ books, 5 languages, PWA, reading progress, streaks
- Pricing: $14.99/month or $119/year ($9.99/month equivalent)
- Built by a solo developer, lean and fast-moving
- Competitors: Blinkist ($15.99, no AI), Shortform ($24.99, no AI), Goodreads (free, no summaries)
- Key differentiator: ONLY platform combining AI chat per book + community + progress tracking

Be brutally specific. Give real tactics, real channels, real numbers. No generic advice. When someone gives you their metrics, diagnose exactly what's wrong and what to fix first.`
  },
  {
    id: "revenue",
    icon: "💰",
    label: "Revenue Analyst",
    desc: "Analyze your MRR, churn, LTV and get specific fixes",
    color: G,
    placeholder: "Share your numbers: free users, paid users, MRR, churn rate, CAC…",
    suggestions: [
      "Free users: 500, paid: 0, MRR: $0. What's wrong and how do I fix it?",
      "I have 20 paid users at $14.99 but 8% monthly churn. How do I fix churn?",
      "Should I focus on getting more free users or converting existing ones?",
      "What's a realistic MRR target for month 3 of a book summary app?",
    ],
    systemPrompt: `You are a SaaS revenue analyst specializing in subscription EdTech products. You understand unit economics, conversion funnels, and churn reduction deeply.

House of Books context:
- Pricing: $14.99/month or $119/year
- Free tier: 63 books + 3 AI chats
- Premium: 210+ books, unlimited AI, community, PDF export, notes
- Key metrics to optimize: free→paid conversion (target 4-6%), monthly churn (target <3%), LTV:CAC (target >5x)

When given metrics, calculate LTV, LTV:CAC ratio, payback period, and net MRR. Then give the 3 most impactful fixes ranked by revenue impact. Be specific with expected outcomes.`
  },
  {
    id: "pricing",
    icon: "🏷️",
    label: "Pricing Strategist",
    desc: "Optimize your pricing tiers, positioning and messaging",
    color: "#7eb8f7",
    placeholder: "Ask about pricing strategy, tier structure, or how to position vs competitors…",
    suggestions: [
      "Should I raise from $14.99 to $19.99 now or wait for more users?",
      "How should I structure the Pro vs Premium tier features?",
      "What's the best way to announce a price increase to existing users?",
      "How do I justify $14.99 vs Blinkist's $15.99 when we have fewer books?",
    ],
    systemPrompt: `You are a SaaS pricing expert who has advised 100+ subscription products. You understand pricing psychology, tier design, and how to communicate value.

House of Books current pricing:
- Monthly: $14.99/month
- Yearly: $119/year ($9.99/month equivalent — "pay 10 months get 12")
- Planned two tiers: Pro ($14.99) and Premium ($24.99 with advanced AI features)
- Competitors: Blinkist $15.99, Shortform $24.99, getAbstract $19.99

The AI analysis recommends raising to $19.99 eventually. Current strategy: establish at $14.99 with first 100 customers, then raise with testimonials and social proof.

Give specific price recommendations with reasoning. Include messaging copy when relevant.`
  },
  {
    id: "marketing",
    icon: "📣",
    label: "Marketing Copywriter",
    desc: "Writes real copy — landing pages, emails, ads, social posts",
    color: "#c87efa",
    placeholder: "What copy do you need? Landing page hero, email subject, ad headline, tweet…",
    suggestions: [
      "Write a landing page hero section that converts vs Blinkist",
      "Write 5 tweet templates about AI book chat that would go viral",
      "Write a 5-email welcome sequence to convert free users to paid",
      "Write Google ad copy targeting 'Blinkist alternative' searches",
    ],
    systemPrompt: `You are an expert SaaS copywriter who specializes in EdTech and subscription products. You write copy that converts — not generic marketing speak.

House of Books details:
- Tagline territory: "AI that reads books with you" / "The book app that actually talks back"
- Key differentiator: AI chat per book (ask any question, get expert answers instantly)
- Target: curious professionals 25-40, self-improvement readers, lifelong learners
- Price: $14.99/month or $9.99/month billed annually
- Free tier: 63 books + 3 AI chats to experience the product
- Tone: intellectual but warm, premium but accessible, confident not arrogant

When writing copy: lead with the transformation not the feature. Focus on "chat with any book's ideas" as the hero feature. Make Blinkist look passive and old by comparison.`
  },
  {
    id: "product",
    icon: "⚙️",
    label: "Product Strategist",
    desc: "Roadmap prioritization, feature decisions, what to build next",
    color: "#fa9e7e",
    placeholder: "Ask about what to build next, feature prioritization, or product decisions…",
    suggestions: [
      "What's the single most important feature to build in the next 30 days?",
      "Should I add audio summaries or focus on growing the book library first?",
      "How do I design the Premium tier features to justify $24.99?",
      "What features would make users stick around for 12+ months?",
    ],
    systemPrompt: `You are a product strategist who specializes in consumer subscription apps and EdTech. You think in terms of retention, activation, and monetization.

House of Books current features:
✅ Built: AI chat per book, community discussions, reading groups, progress tracking, streaks, daily quotes, shelf management, notes (premium), PDF export (premium), recommendations, search inside summaries, 6 themes, ambient music, 5 languages, PWA, referral system, 7-day trial

🔲 Planned/missing: audio summaries, more books (100 being added), Stripe payments, Capacitor Android app, social features, leaderboard

Prioritize features by: retention impact, conversion impact, differentiation value, build complexity. Be specific about what to build first and why. Consider the solo developer constraint.`
  },
  {
    id: "retention",
    icon: "🔄",
    label: "Churn & Retention",
    desc: "Reduce churn, win back users, improve long-term retention",
    color: "#f07e7e",
    placeholder: "Describe your churn situation or ask about retention strategies…",
    suggestions: [
      "My churn is 8% monthly. What are the top 3 fixes?",
      "What should a win-back email say to a user who cancelled?",
      "How do I identify users who are about to churn before they do?",
      "What in-app features most reduce churn for book apps?",
    ],
    systemPrompt: `You are a retention specialist who has reduced churn for 30+ SaaS products. You understand the psychology of cancellation and what keeps users engaged long-term.

House of Books churn context:
- AI analysis flagged 5% monthly churn as too high (target: <3%)
- Retention levers available: reading streaks, daily quotes, community, shelf progress, recommendations
- High-churn risk signals: user hasn't opened app in 7 days, finished all free books but not upgraded, streak broken
- Premium features that should create lock-in: notes, shelf, progress data, community connections

Give specific, implementable churn reduction tactics. Include email copy, in-app message copy, or feature suggestions where relevant. Prioritize by impact.`
  },
  {
    id: "competitor",
    icon: "⚔️",
    label: "Competitor Analysis",
    desc: "Deep analysis of Blinkist, Shortform, Goodreads and positioning strategy",
    color: RED,
    placeholder: "Select competitors above and ask for strategic analysis…",
    suggestions: [
      "Analyze all selected competitors and find our biggest opportunity",
      "How should we position our $14.99 price vs Blinkist's $15.99?",
      "What feature gaps exist that we can fill before Blinkist does?",
      "Which competitor is the biggest threat and how do we defend?",
    ],
    isCompetitor: true, // special flag — shows competitor cards
    systemPrompt: `You are a sharp startup strategist and market analyst specializing in EdTech, book apps, and subscription businesses.

House of Books:
✦ AI summaries + deep AI chat per book (DeepSeek-powered, ~$0 cost)
✦ 210+ curated books across 10 categories
✦ 5 languages including Arabic RTL
✦ Community: book discussions, reading groups, private chat
✦ Reading progress, streaks, daily quotes, personalized AI recommendations
✦ PDF export, notes, shelf management (premium)
✦ Pricing: $14.99/month or $119/year — competitive with Blinkist, much cheaper than Shortform
✦ Two tiers planned: Pro ($14.99) and Premium ($24.99 with advanced AI)
✦ PWA + mobile-ready, beautiful UI with ambient music
✦ Built by a solo developer — lean, fast-moving, no VC overhead

Be a trusted advisor. Sharp, specific, actionable. No hedging. Real opinions.`
  },
  {
    id: "seo",
    icon: "🔍",
    label: "SEO & Content",
    desc: "SEO strategy, blog topics, keywords, content that ranks and converts",
    color: "#7ed4f7",
    placeholder: "Ask about SEO strategy, blog ideas, keywords, or content that drives signups…",
    suggestions: [
      "What are the top 10 keywords I should rank for?",
      "Write an SEO title and meta description for the homepage",
      "What blog posts would drive the most organic traffic to a book app?",
      "How do I rank for 'Blinkist alternative' searches?",
    ],
    systemPrompt: `You are an SEO and content strategist specializing in SaaS and EdTech. You understand both technical SEO and conversion-focused content.

House of Books SEO context:
- Domain: house-of-books-gamma.vercel.app (new, no authority yet)
- Dynamic sitemap at /api/sitemap with all 210+ book URLs
- React SPA — Google can crawl but individual book pages need server-side rendering for full SEO value
- Target keywords: book summaries, AI book summaries, Blinkist alternative, book summary app, read smarter
- Content opportunity: each of the 210+ books is a potential SEO page
- Competitor gap: Blinkist/Shortform don't have AI chat — "AI that chats about books" is an unclaimed keyword cluster

Give specific keywords with estimated volume, content ideas with titles, and technical SEO recommendations. Prioritize quick wins for a new domain.`
  },
]

// ── History helpers ────────────────────────────────────────────────
function saveHistory(agentId: string, label: string, messages: any[]) {
  try {
    const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
    const entry = {
      id: Date.now(),
      agentId,
      label,
      messages,
      ts: new Date().toISOString(),
      preview: messages.filter((m: any) => m.role === "assistant").slice(-1)[0]?.content?.slice(0, 120) || ""
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, 60)))
  } catch {}
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") }
  catch { return [] }
}

// ── API call ───────────────────────────────────────────────────────
async function callAI(messages: any[], systemPrompt: string) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt })
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.content || "No response."
}

// ── Sub-components ─────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", gap:4, padding:"3px 0" }}>
      {[0,1,2].map(i=>(
        <motion.div key={i} style={{ width:6, height:6, borderRadius:"50%", background:G }}
          animate={{ y:[0,-5,0], opacity:[0.4,1,0.4] }}
          transition={{ duration:0.8, repeat:Infinity, delay:i*0.18 }}/>
      ))}
    </div>
  )
}

function MsgBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user"
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:.2 }}
      style={{ display:"flex", justifyContent:isUser?"flex-end":"flex-start", gap:8, alignItems:"flex-start" }}>
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg," + G + ",#7a4c10)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>✦</div>
      )}
      <div style={{ maxWidth:"82%", padding:"10px 13px", background:isUser?"rgba(201,168,76,0.1)":SF, border:"1px solid " + (isUser?"rgba(201,168,76,0.25)":GB), borderRadius:isUser?"12px 12px 3px 12px":"12px 12px 12px 3px", fontSize:13, lineHeight:1.72, color:isUser?TX:"rgba(232,228,217,0.88)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {msg.content}
      </div>
    </motion.div>
  )
}

function InputArea({ taRef, value, onChange, onSend, loading, placeholder }: any) {
  return (
    <div style={{ padding:"10px 12px", borderTop:"1px solid " + GB, display:"flex", gap:8, alignItems:"flex-end", flexShrink:0, background:"rgba(8,8,14,0.7)" }}>
      <textarea ref={taRef} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
        disabled={loading}
        onKeyDown={(e: any) => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); onSend() } }}
        onFocus={(e: any) => e.target.style.borderColor="rgba(201,168,76,0.5)"}
        onBlur={(e: any) => e.target.style.borderColor=GB}
        style={{ flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid " + GB, borderRadius:10, padding:"10px 13px", color:TX, fontSize:13, outline:"none", resize:"none", fontFamily:"Georgia,serif", lineHeight:1.5, minHeight:44, maxHeight:140, transition:"border-color .2s" }}
      />
      <button onClick={onSend} disabled={!value.trim()||loading}
        style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:value.trim()&&!loading?"linear-gradient(135deg," + G + "," + GL + ")":"rgba(255,255,255,0.05)", border:"none", cursor:value.trim()&&!loading?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", opacity:value.trim()&&!loading?1:0.35 }}>
        {loading
          ? <motion.div style={{ width:14, height:14, border:"2px solid " + G, borderTopColor:"transparent", borderRadius:"50%" }} animate={{ rotate:360 }} transition={{ duration:.8, repeat:Infinity, ease:"linear" }}/>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={value.trim()?"#06050a":G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        }
      </button>
    </div>
  )
}

function CompCard({ comp, selected, onToggle }: any) {
  const isOn = selected.some((c: any) => c.id===comp.id)
  return (
    <motion.div layout whileHover={{ y:-1 }} onClick={()=>onToggle(comp)}
      style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", border:"1px solid " + (isOn?G:GB), background:isOn?GD:SF, transition:"all .2s", position:"relative" }}>
      {isOn && <div style={{ position:"absolute", top:7, right:7, width:15, height:15, borderRadius:"50%", background:G, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:BG, fontWeight:800 }}>✓</div>}
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
        <span style={{ fontSize:16 }}>{comp.emoji}</span>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:TX }}>{comp.name}</div>
          <div style={{ fontSize:9, color:TM }}>{comp.visitors} · {comp.rating}</div>
        </div>
      </div>
      <div style={{ fontSize:9, color:TM, marginBottom:5, lineHeight:1.4 }}>{comp.tagline}</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:5 }}>
        <span style={{ fontSize:7.5, background:"rgba(74,200,120,0.1)", color:GRN, padding:"2px 5px", borderRadius:3 }}>+{comp.strengths[0]}</span>
        <span style={{ fontSize:7.5, background:"rgba(240,80,80,0.1)", color:RED, padding:"2px 5px", borderRadius:3 }}>−{comp.weaknesses[0]}</span>
      </div>
      <div style={{ fontSize:10, color:G, fontWeight:600 }}>{comp.pricing}</div>
    </motion.div>
  )
}

// ── History Panel ──────────────────────────────────────────────────
function HistoryPanel({ onClose, onRestore }: any) {
  const [history, setHistory] = useState(loadHistory())
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<number|null>(null)

  const filtered = history.filter((h: any) =>
    h.label.toLowerCase().includes(search.toLowerCase()) ||
    (h.preview||"").toLowerCase().includes(search.toLowerCase()) ||
    (h.agentId||"").toLowerCase().includes(search.toLowerCase())
  )

  const deleteEntry = (id: number) => {
    const updated = history.filter((h: any) => h.id!==id)
    setHistory(updated)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    if (expanded===id) setExpanded(null)
  }

  const clearAll = () => {
    if (!confirm("Clear all agent history?")) return
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }

  const agentLabel = (id: string) => BUSINESS_AGENTS.find(a=>a.id===id)?.label || (id==="books"?"Book Chat":id)
  const agentIcon  = (id: string) => BUSINESS_AGENTS.find(a=>a.id===id)?.icon || (id==="books"?"📚":"✦")

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(14px)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>
      <motion.div initial={{ scale:.95, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:.95 }}
        style={{ background:"#0d0d12", border:"1px solid " + GB, borderRadius:14, width:"100%", maxWidth:800, maxHeight:"88vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>

        <div style={{ padding:"16px 20px", borderBottom:"1px solid " + GB, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", color:G, fontWeight:700 }}>📋 Agent History</div>
            <div style={{ fontSize:10, color:TM, marginTop:2 }}>{history.length} saved conversations across all agents · persists across sessions</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {history.length>0 && <button onClick={clearAll} style={{ padding:"4px 11px", background:"transparent", border:"1px solid rgba(240,85,85,0.3)", color:RED, borderRadius:6, fontSize:9, cursor:"pointer", letterSpacing:".06em", textTransform:"uppercase" }}>Clear All</button>}
            <button onClick={onClose} style={{ padding:"4px 11px", background:"transparent", border:"1px solid " + GB, color:TM, borderRadius:6, fontSize:9, cursor:"pointer", letterSpacing:".06em", textTransform:"uppercase" }}>✕ Close</button>
          </div>
        </div>

        <div style={{ padding:"10px 20px", borderBottom:"1px solid " + GB, flexShrink:0 }}>
          <input value={search} onChange={(e: any)=>setSearch(e.target.value)} placeholder="Search all conversations…"
            style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid " + GB, borderRadius:7, padding:"7px 12px", color:TX, fontSize:12, outline:"none", fontFamily:"Georgia,serif" }}
            onFocus={(e: any)=>e.target.style.borderColor=G} onBlur={(e: any)=>e.target.style.borderColor=GB}/>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"12px 20px" }}>
          {filtered.length===0
            ? <div style={{ textAlign:"center", padding:"3rem", color:TM, fontSize:13 }}>
                {history.length===0 ? "No conversations yet. Start chatting with any agent — they all auto-save." : "No results found."}
              </div>
            : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filtered.map((entry: any) => (
                  <div key={entry.id} style={{ background:SF, border:"1px solid " + (expanded===entry.id?G:GB), borderRadius:10, overflow:"hidden", transition:"border-color .2s" }}>
                    <div style={{ padding:"11px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
                      onClick={()=>setExpanded(expanded===entry.id?null:entry.id)}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{agentIcon(entry.agentId)}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:TX, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.label}</div>
                        <div style={{ fontSize:9, color:TM, marginTop:2 }}>
                          {agentLabel(entry.agentId)} · {new Date(entry.ts).toLocaleDateString()} {new Date(entry.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                        </div>
                        {entry.preview && <div style={{ fontSize:10, color:"rgba(232,228,217,0.3)", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.preview}…</div>}
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        <button onClick={(e: any)=>{ e.stopPropagation(); onRestore(entry); onClose() }}
                          style={{ padding:"4px 10px", background:GD, border:"1px solid " + GB, color:G, borderRadius:5, fontSize:9, cursor:"pointer", letterSpacing:".06em", textTransform:"uppercase" }}>
                          Restore
                        </button>
                        <button onClick={(e: any)=>{ e.stopPropagation(); deleteEntry(entry.id) }}
                          style={{ padding:"4px 8px", background:"transparent", border:`1px solid rgba(240,85,85,0.2)`, color:RED, borderRadius:5, fontSize:9, cursor:"pointer" }}>✕</button>
                        <span style={{ fontSize:11, color:TM }}>{expanded===entry.id?"▲":"▼"}</span>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expanded===entry.id && (
                        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
                          style={{ borderTop:"1px solid " + GB, padding:"12px 16px", maxHeight:300, overflow:"auto" }}>
                          {entry.messages.filter((m: any)=>m.role==="assistant").map((m: any,i: number)=>(
                            <div key={i} style={{ fontSize:12, color:"rgba(232,228,217,0.8)", lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:i<entry.messages.filter((x: any)=>x.role==="assistant").length-1?12:0 }}>
                              {m.content}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
          }
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Chat Panel (shared by all agents) ─────────────────────────────
function AgentChat({ agent, selComps, onToggleComp }: any) {
  const welcomeMsg = agent.id==="books"
    ? "Hello! I'm your House of Books AI literary companion.\n\nSelect a book above to focus on it, or ask me anything about books — analysis, recommendations, reading plans, ideas across disciplines.\n\nWhat would you like to explore?"
    : `${agent.icon} ${agent.label} ready.\n\n${agent.desc}\n\nTry one of the suggestions below or ask me anything.` 

  const [messages, setMessages] = useState([{ role:"assistant", content:welcomeMsg, ts:0 }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [selBook, setSelBook] = useState<any>(null)
  const [mode, setMode] = useState("chat")
  const endRef  = useRef<any>(null)
  const taRef   = useRef<any>(null)

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}) }, [messages, loading])
  useEffect(()=>{ if(taRef.current){ taRef.current.style.height="44px"; taRef.current.style.height=Math.min(taRef.current.scrollHeight,140)+"px" } }, [input])

  // Reset when switching agents
  useEffect(()=>{
    setMessages([{ role:"assistant", content:welcomeMsg, ts:0 }])
    setInput(""); setSelBook(null); setMode("chat")
  }, [agent.id])

  const send = useCallback(async(text?: string) => {
    const c = (text||input).trim()
    if (!c||loading) return
    setInput("")
    const prefix = agent.id==="books" ? ({analyze:"Analyze in depth, exploring all themes and implications: ",recommend:"Give specific book recommendations based on: ",plan:"Create a detailed reading plan or study guide for: ",chat:""}[mode]||"") : ""

    let sysPrompt = agent.systemPrompt
    // For competitor agent, append selected competitor data
    if (agent.isCompetitor && selComps.length>0) {
      sysPrompt += `\n\nSELECTED COMPETITORS TO ANALYZE:\n${selComps.map((c: any)=>`### ${c.name} (${c.pricing}, ${c.visitors})\nTagline: ${c.tagline}\nDifferentiator: ${c.differentiator}\nStrengths: ${c.strengths.join(", ")}\nWeaknesses: ${c.weaknesses.join(", ")}`).join("\n\n")}` 
    }
    // For book chat, append book context
    if (agent.id==="books" && selBook) {
      sysPrompt += `\n\nCurrently focused on: "${selBook.title}" by ${selBook.author}\nSummary: ${selBook.summary}\nKey Insights: ${selBook.insights.map((ins: string,i: number)=>`${i+1}. ${ins}`).join(" | ")}` 
    }

    // Set loading steps
    setLoadingStep('🌐 Gathering live news & trends...')
    setTimeout(() => setLoadingStep('⚡ Analyzing with DeepSeek AI...'), 2000)

    const userMsg = { role:"user", content:prefix+c, ts:Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const reply = await callAI(next.map(m=>({role:m.role,content:m.content})), sysPrompt)
      const updated = [...next, { role:"assistant", content:reply, ts:Date.now() }]
      setMessages(updated)
      // Auto-save
      const label = agent.id==="books" ? (selBook?.title||"General Chat") : agent.isCompetitor ? (selComps.length>0?selComps.map((c: any)=>c.name).join(" vs "):"General Strategy") : c.slice(0,60)
      if (selBook) saveHistory(agent.id, selBook.title, updated)
      else saveHistory(agent.id, label, updated)
    } catch(e: any) {
      setMessages(p=>[...p,{ role:"assistant", content:`⚠️ ${e.message}`, ts:Date.now() }])
    } finally { 
      setLoading(false)
      setLoadingStep('')
    }
  }, [input, loading, messages, agent, selBook, selComps, mode])

  const BOOK_SUGGS: Record<string,string[]> = {
    "1":["What habit should I start first?","Explain the 4 laws of behavior change","How does identity shape habits?"],
    "2":["Why is agriculture Harari's biggest fraud?","What is the Cognitive Revolution?","Is Sapiens historically accurate?"],
    "3":["How do I start doing deep work today?","Build me a deep work weekly schedule","Is social media worth keeping?"],
    "4":["Best Stoic advice for anxiety?","How do I stop caring what others think?","Best quote from Meditations?"],
    "5":["Why do smart people make bad money decisions?","Explain compounding in simple terms","Getting rich vs staying rich"],
    "6":["What is logotherapy?","How did Frankl find meaning in suffering?","How do I find my own purpose?"],
  }

  const suggestions = agent.id==="books"
    ? (BOOK_SUGGS[selBook?.id]||["Recommend a book on productivity","Best philosophy book to start with","Compare Atomic Habits vs Power of Habit","Books that changed the most lives"])
    : agent.suggestions

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>
      {/* Book selector — only for book chat agent */}
      {agent.id==="books" && (
        <div style={{ padding:"7px 16px", borderBottom:"1px solid rgba(201,168,76,0.06)", flexShrink:0, display:"flex", gap:6, overflowX:"auto" }}>
          <button onClick={()=>setSelBook(null)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:!selBook?GD:SF, border:"1px solid " + (!selBook?G:GB), borderRadius:14, cursor:"pointer", flexShrink:0, transition:"all .2s" }}>
            <span style={{ fontSize:10, color:!selBook?G:TM }}>📚 General</span>
          </button>
          {BOOKS.map(b=>(
            <button key={b.id} onClick={()=>setSelBook(selBook?.id===b.id?null:b)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 9px", background:selBook?.id===b.id?GD:SF, border:"1px solid " + (selBook?.id===b.id?G:GB), borderRadius:14, cursor:"pointer", flexShrink:0, transition:"all .2s" }}>
              <img src={b.cover} alt={b.title} style={{ width:16, height:24, objectFit:"cover", borderRadius:2 }} onError={(e: any)=>e.target.style.display="none"}/>
              <span style={{ fontSize:10, color:selBook?.id===b.id?G:TM, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mode row — only for book chat */}
      {agent.id==="books" && (
        <div style={{ display:"flex", gap:5, padding:"6px 16px", borderBottom:"1px solid rgba(201,168,76,0.06)", flexShrink:0, overflowX:"auto", alignItems:"center" }}>
          {[{id:"chat",l:"💬 Chat"},{id:"analyze",l:"🔍 Deep Analyze"},{id:"recommend",l:"✦ Recommend"},{id:"plan",l:"📋 Reading Plan"}].map(m=>(
            <button key={m.id} onClick={()=>setMode(m.id)}
              style={{ padding:"3px 10px", borderRadius:14, fontSize:9, cursor:"pointer", flexShrink:0, background:mode===m.id?"rgba(201,168,76,0.12)":"transparent", border:"1px solid " + (mode===m.id?"rgba(201,168,76,0.4)":GB), color:mode===m.id?G:TM, letterSpacing:".07em", textTransform:"uppercase", transition:"all .2s" }}>
              {m.l}
            </button>
          ))}
          {selBook&&<span style={{ marginLeft:"auto", fontSize:8, color:"rgba(201,168,76,0.5)", letterSpacing:".1em", display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:GRN, display:"inline-block" }}/>{selBook.title.toUpperCase()}
          </span>}
        </div>
      )}

      {/* Competitor cards — only for competitor agent */}
      {agent.isCompetitor && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px, 1fr))", gap:7, padding:"10px 16px", overflowY:"auto", maxHeight:210, borderBottom:"1px solid " + GB, flexShrink:0 }}>
            {COMPETITORS.map(c=><CompCard key={c.id} comp={c} selected={selComps} onToggle={onToggleComp}/>)}
          </div>
          <div style={{ padding:"5px 16px", borderBottom:"1px solid rgba(201,168,76,0.06)", display:"flex", alignItems:"center", gap:6, flexShrink:0, flexWrap:"wrap", minHeight:32 }}>
            {selComps.length===0
              ? <span style={{ fontSize:10, color:TM }}>Select competitors above, or ask general strategy questions</span>
              : <>
                  <span style={{ fontSize:9, color:"rgba(201,168,76,0.5)", letterSpacing:".1em", textTransform:"uppercase" }}>Analyzing:</span>
                  {selComps.map((c: any)=>(
                    <span key={c.id} style={{ fontSize:10, background:GD, color:G, padding:"2px 9px", borderRadius:12, display:"flex", alignItems:"center", gap:4 }}>
                      {c.name} <span style={{ cursor:"pointer", opacity:.6 }} onClick={()=>onToggleComp(c)}>✕</span>
                    </span>
                  ))}
                  <button onClick={()=>selComps.forEach((c: any)=>onToggleComp(c))} style={{ marginLeft:"auto", fontSize:9, background:"transparent", border:"1px solid " + GB, color:TM, borderRadius:5, padding:"2px 8px", cursor:"pointer" }}>Clear all</button>
                </>
            }
          </div>
        </>
      )}

      {/* Messages */}
      <div style={{ flex:1, overflow:"auto", padding:"14px 16px 6px", display:"flex", flexDirection:"column", gap:12 }}>
        <AnimatePresence initial={false}>
          {messages.map((m,i)=><MsgBubble key={m.ts||i} msg={m}/>)}
        </AnimatePresence>
        {loading&&(
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg," + G + ",#7a4c10)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>✦</div>
            <div>
              {loadingStep && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--gold)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Georgia, serif'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px', height: '8px',
                    background: 'var(--gold)',
                    borderRadius: '2px',
                    animation: 'aiSpin 1.4s linear infinite'
                  }}/>
                  {loadingStep}
                </div>
              )}
              <div style={{ padding:"12px 14px", background:SF, border:"1px solid " + GB, borderRadius:"12px 12px 12px 3px" }}><TypingDots/></div>
            </div>
          </motion.div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Suggestions */}
      {messages.length<=2&&!loading&&(
        <div style={{ padding:"0 16px 6px", display:"flex", gap:6, overflowX:"auto" }}>
          {suggestions.map((s: string,i: number)=>(
            <motion.button key={i} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*.07 }}
              onClick={()=>send(s)}
              onMouseEnter={(e: any)=>{e.currentTarget.style.borderColor="rgba(201,168,76,0.4)";e.currentTarget.style.color=G}}
              onMouseLeave={(e: any)=>{e.currentTarget.style.borderColor=GB;e.currentTarget.style.color=TM}}
              style={{ padding:"5px 12px", background:SF, border:"1px solid " + GB, borderRadius:14, fontSize:10, color:TM, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap", transition:"all .2s" }}>
              {s}
            </motion.button>
          ))}
        </div>
      )}

      <InputArea taRef={taRef} value={input} onChange={setInput} onSend={send} loading={loading}
        placeholder={agent.placeholder||"Ask me anything…"}/>
    </div>
  )
}

// ── Main Agent App ─────────────────────────────────────────────────
export default function BookAgent() {
  const [activeAgent, setActiveAgent] = useState(BUSINESS_AGENTS[0])
  const [selComps, setSelComps] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [, forceUpdate] = useState(0)

  const toggleComp = (comp: any) => setSelComps(p => p.some(c=>c.id===comp.id) ? p.filter(c=>c.id!==comp.id) : [...p,comp])

  const historyCount = loadHistory().length

  return (
    <div style={{ fontFamily:"Georgia,serif", background:BG, color:TX, height:"100vh", display:"flex", overflow:"hidden" }}>

      {/* ── LEFT SIDEBAR — Agent selector ── */}
      <div style={{ width:220, borderRight:"1px solid " + GB, display:"flex", flexDirection:"column", flexShrink:0, background:"rgba(8,8,14,0.6)" }}>
        {/* Header */}
        <div style={{ padding:"14px 16px", borderBottom:"1px solid " + GB }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
            <div style={{ width:26, height:26, border:"1px solid " + G, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✦</div>
            <div style={{ fontSize:"0.9rem", fontWeight:700, color:G, letterSpacing:".06em" }}>Book Agent</div>
          </div>
          <div style={{ fontSize:7.5, color:TM, letterSpacing:".1em", textTransform:"uppercase", paddingLeft:34 }}>DeepSeek AI · All saved</div>
        </div>

        {/* Agent list */}
        <div style={{ flex:1, overflow:"auto", padding:"8px 8px" }}>
          <div style={{ fontSize:8, color:TM, letterSpacing:".12em", textTransform:"uppercase", padding:"4px 8px 8px" }}>📚 Book</div>
          {/* Book chat is first */}
          {[{ id:"books", icon:"📚", label:"Book Chat", desc:"Discuss any book with AI", color:G },...BUSINESS_AGENTS].map(agent=>(
            <motion.button key={agent.id} whileHover={{ x:2 }} onClick={()=>{ setActiveAgent(agent as any); if(agent.id!=="competitor") setSelComps([]) }}
              style={{ width:"100%", padding:"9px 10px", borderRadius:8, cursor:"pointer", textAlign:"left", background:activeAgent.id===agent.id?GD:SF, border:"1px solid " + (activeAgent.id===agent.id?(agent.color||G):GB), transition:"all .2s", marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                <span style={{ fontSize:14 }}>{agent.icon}</span>
                <span style={{ fontSize:11, color:activeAgent.id===agent.id?(agent.color||G):TX, fontWeight:activeAgent.id===agent.id?700:400 }}>{agent.label}</span>
              </div>
              <div style={{ fontSize:9, color:TM, paddingLeft:21, lineHeight:1.35 }}>{agent.desc || "AI literary companion"}</div>
            </motion.button>
          ))}
        </div>

        {/* History button at bottom */}
        <div style={{ padding:"10px 10px", borderTop:"1px solid " + GB }}>
          <button onClick={()=>{ setShowHistory(true); forceUpdate(n=>n+1) }}
            style={{ width:"100%", padding:"8px 10px", background:GD, border:"1px solid " + GB, color:G, borderRadius:8, fontSize:10, cursor:"pointer", letterSpacing:".07em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"border-color .2s" }}
            onMouseEnter={(e: any)=>e.currentTarget.style.borderColor=G}
            onMouseLeave={(e: any)=>e.currentTarget.style.borderColor=GB}>
            📋 History {historyCount>0&&`(${historyCount})`}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL — Active agent chat ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Agent header */}
        <div style={{ padding:"10px 16px", borderBottom:"1px solid " + GB, display:"flex", alignItems:"center", gap:10, flexShrink:0, background:"rgba(10,10,15,0.95)" }}>
          <span style={{ fontSize:20 }}>{activeAgent.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.95rem", fontWeight:700, color:activeAgent.color||G, letterSpacing:".04em" }}>{activeAgent.label}</div>
            <div style={{ fontSize:10, color:TM }}>{(activeAgent as any).desc||"AI literary companion"}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:GRN, animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:8, color:TM, letterSpacing:".08em" }}>DEEPSEEK</span>
          </div>
        </div>

        {/* Chat */}
        <AgentChat key={activeAgent.id} agent={activeAgent} selComps={selComps} onToggleComp={toggleComp}/>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory&&(
          <HistoryPanel
            onClose={()=>setShowHistory(false)}
            onRestore={(entry: any)=>{
              const agent = BUSINESS_AGENTS.find(a=>a.id===entry.agentId) || (entry.agentId==="books" ? { id:"books", icon:"📚", label:"Book Chat", desc:"Discuss any book with AI", color:G } : BUSINESS_AGENTS[0])
              setActiveAgent(agent as any)
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes aiSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
