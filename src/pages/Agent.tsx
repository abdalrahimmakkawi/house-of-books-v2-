import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../lib/supabase"

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
    placeholder: "Ask about growth — I can already see your users, MRR and conversion…",
    suggestions: [
      "Based on my real numbers above, how do I get to $1000 MRR in 90 days?",
      "What's the highest leverage thing I can do this week to grow?",
      "How do I convert free users to paid without being pushy?",
      "Which acquisition channel should I focus on with a $100/month budget?",
    ],
    systemPrompt: `You are a growth advisor who has helped 50+ bootstrapped SaaS founders reach $10K MRR. You specialize in book apps, EdTech, and subscription products.

House of Books context:
- AI-powered book summaries + AI chat per book + community
- 300+ books, 5 languages, PWA, reading progress, streaks
- Pricing: $8.99/month or $85/year ($7.08/month equivalent)
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
    placeholder: "Ask about revenue — your live figures are already loaded above…",
    suggestions: [
      "Look at my real conversion rate above — what is wrong and what do I fix first?",
      "Once I have paying users, what churn rate should worry me and how do I prevent it?",
      "Should I focus on getting more free users or converting existing ones?",
      "What's a realistic MRR target for month 3 of a book summary app?",
    ],
    systemPrompt: `You are a SaaS revenue analyst specializing in subscription EdTech products. You understand unit economics, conversion funnels, and churn reduction deeply.

House of Books context:
- Pricing: $8.99/month or $85/year
- Free tier: 84 books + 10 AI chats
- Premium: 300+ books, unlimited AI, PDF export, notes
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
      "Should I raise from $8.99 to $12.99 now or wait for more users?",
      "How should I structure the Pro vs Premium tier features?",
      "What's the best way to announce a price increase to existing users?",
      "How do I justify $8.99 vs Blinkist's $15.99 when we have fewer books?",
    ],
    systemPrompt: `You are a SaaS pricing expert who has advised 100+ subscription products. You understand pricing psychology, tier design, and how to communicate value.

House of Books current pricing:
- Monthly: $8.99/month
- Yearly: $85/year ($7.08/month equivalent — "pay 10 months get 12")
- Planned two tiers: Pro ($8.99) and Premium ($19.99 with advanced AI features)
- Competitors: Blinkist $15.99, Shortform $24.99, getAbstract $19.99

The AI analysis suggests there may be room to raise prices later. Current strategy: establish at $8.99 with first 100 customers, then revisit with testimonials and social proof.

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
- Price: $8.99/month or $7.08/month billed annually
- Free tier: 84 books + 10 AI chats to experience the product
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
    placeholder: "Ask about retention — I can see signups, active readers and paying users…",
    suggestions: [
      "What are the top 3 churn preventers I should build before I have churn?",
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
      "How should we position our $8.99 price vs Blinkist's $15.99?",
      "What feature gaps exist that we can fill before Blinkist does?",
      "Which competitor is the biggest threat and how do we defend?",
    ],
    isCompetitor: true, // special flag — shows competitor cards
    systemPrompt: `You are a sharp startup strategist and market analyst specializing in EdTech, book apps, and subscription businesses.

House of Books:
✦ AI summaries + deep AI chat per book (NVIDIA-powered, ~$0 cost)
✦ 210+ curated books across 10 categories
✦ 5 languages including Arabic RTL
✦ Community: book discussions, reading groups, private chat
✦ Reading progress, streaks, daily quotes, personalized AI recommendations
✦ PDF export, notes, shelf management (premium)
✦ Pricing: $8.99/month or $85/year — competitive with Blinkist, much cheaper than Shortform
✦ Two tiers planned: Pro ($8.99) and Premium ($19.99 with advanced AI)
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
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt, accessToken: session?.access_token })
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.content || "No response."
}

// ═══════════════════════════════════════════════════════════════════
//  STUDIO — the admin console for House of Books
//
//  Replaces the previous layout (a 248px agent list glued to a chat box).
//  Two things were wrong with it: the numbers that matter were invisible
//  until you asked for them, and the type was 7.5-9px in places.
//
//  Shape now: a live "Today" band across the top so the real figures are
//  always on screen, a horizontal agent rail that frees the vertical space
//  the sidebar was eating, and a reading-width conversation column.
//
//  Visual language follows the reader app deliberately — deep warm black,
//  gold, Georgia for prose — so this feels like part of House of Books and
//  not a bolted-on dashboard. Numbers use a system sans with tabular
//  figures, which is the one place a serif genuinely hurts legibility.
// ═══════════════════════════════════════════════════════════════════

const INK    = "#0e0d14"          // app background, warm near-black
const PANEL  = "rgba(255,255,255,0.022)"
const PANEL2 = "rgba(255,255,255,0.045)"
const LINE   = "rgba(201,168,76,0.16)"
const LINE2  = "rgba(255,255,255,0.07)"
const NUM    = "system-ui,-apple-system,'Segoe UI',sans-serif"
const SERIF  = "Georgia,'Times New Roman',serif"

const BOOK_AGENT = { id:"books", icon:"📚", label:"Book Chat", desc:"Discuss any book with AI", color:G } as any
const ALL_AGENTS = [BOOK_AGENT, ...BUSINESS_AGENTS]

// Live figures, straight from the database via the admin-gated `metrics`
// action. The chat context on the server is built from the same function, so
// what you read here and what the model reasons about cannot drift apart.
async function fetchMetrics() {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "metrics", accessToken: session?.access_token }),
  })
  if (!res.ok) {
    throw new Error(res.status === 401 || res.status === 403
      ? "Sign in as an admin to load live figures"
      : `Metrics unavailable (${res.status})`)
  }
  return res.json()
}

// ── Reading the numbers ────────────────────────────────────────────
// A plain-English line under the metrics. Deliberately derived in code
// from the live figures rather than asked of the model: it must never
// drift from what the cards say, and it costs nothing to compute.
function readTheRoom(m: any): { text: string; tone: string } {
  if (!m) return { text: "", tone: TM }
  if (!m.users?.available) return { text: "User count unavailable — the auth read failed, so conversion can't be computed.", tone: RED }
  const u = m.users.total, p = m.revenue.premiumUsers, f = m.feedback.writtenCount
  if (u === 0) return { text: "No registered users yet. Getting the first ten is the only thing that matters.", tone: TM }
  if (p === 0) return { text: `${u} registered, none paying yet. Conversion is the number to move — everything else is noise until it's above zero.`, tone: G }
  if (f === 0) return { text: `${p} paying of ${u}. No written feedback yet, so you're flying on numbers alone.`, tone: G }
  return { text: `${p} paying of ${u} · ${f} written notes · avg ${m.feedback.avgRating ?? "—"}/5.`, tone: GRN }
}

// ── Metric tile ────────────────────────────────────────────────────
function Tile({ label, value, sub, tone, dim }: any) {
  return (
    <div style={{
      flex:"1 1 128px", minWidth:128, padding:"13px 15px", borderRadius:12,
      background: PANEL, border:"1px solid " + LINE2,
    }}>
      <div style={{ fontFamily:NUM, fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:TM, marginBottom:7 }}>{label}</div>
      <div style={{
        fontFamily:NUM, fontSize:26, fontWeight:600, lineHeight:1, letterSpacing:"-.02em",
        color: dim ? TM : (tone || TX), fontVariantNumeric:"tabular-nums",
      }}>{value}</div>
      {sub && <div style={{ fontFamily:NUM, fontSize:11, color:TM, marginTop:6, lineHeight:1.35 }}>{sub}</div>}
    </div>
  )
}

// ── Today band ─────────────────────────────────────────────────────
function TodayBand({ m, loading, err, onRefresh }: any) {
  const read = readTheRoom(m)
  return (
    <div style={{ padding:"14px 22px 16px", borderBottom:"1px solid " + LINE2, flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:11, gap:12 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
          <span style={{ fontFamily:SERIF, fontSize:15, color:TX, letterSpacing:".02em" }}>Today</span>
          <span style={{ fontFamily:NUM, fontSize:10.5, color:TM, letterSpacing:".08em" }}>
            {m ? `read from the database · ${new Date(m.generatedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}` : "reading…"}
          </span>
        </div>
        <button onClick={onRefresh} disabled={loading}
          style={{ fontFamily:NUM, background:"none", border:"1px solid " + LINE, color: loading ? TM : G,
                   borderRadius:8, padding:"5px 12px", fontSize:11, cursor: loading ? "default" : "pointer" }}>
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {err ? (
        <div style={{ fontFamily:NUM, fontSize:12, color:RED }}>⚠ {err}</div>
      ) : (
        <>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Tile label="Readers" dim={!m?.users?.available}
              value={m ? (m.users.available ? m.users.total : "—") : "·"}
              sub={m ? (m.users.available ? `+${m.users.new7d} this week · ${m.users.active7d} active` : "auth read failed") : ""}
              tone={m && !m.users.available ? RED : undefined} />
            <Tile label="Paying" value={m ? m.revenue.premiumUsers : "·"}
              sub={m ? (m.revenue.conversionPct == null ? "conversion unknown" : `${m.revenue.conversionPct}% of readers`) : ""}
              tone={m && m.revenue.premiumUsers > 0 ? GRN : undefined} />
            <Tile label="MRR" value={m ? `$${m.revenue.estMrr}` : "·"}
              sub={m ? `$${m.revenue.pricing.monthly}/mo · $${m.revenue.pricing.annual}/yr` : ""}
              tone={m && m.revenue.estMrr > 0 ? GRN : undefined} />
            <Tile label="Feedback" value={m ? m.feedback.writtenCount : "·"}
              sub={m ? (m.feedback.avgRating ? `avg ${m.feedback.avgRating}/5` : "none written yet") : ""}
              tone={m && m.feedback.writtenCount > 0 ? G : undefined} />
            <Tile label="Library" value={m ? m.catalog.books : "·"}
              sub={m ? `${m.catalog.withAudio} narrated · ${m.catalog.freeBooks} free` : ""} />
          </div>
          {read.text && (
            <div style={{ fontFamily:SERIF, fontSize:13, color:read.tone, marginTop:12, fontStyle:"italic", lineHeight:1.5 }}>
              {read.text}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Agent rail ─────────────────────────────────────────────────────
function AgentRail({ agents, active, onPick }: any) {
  return (
    <div style={{ display:"flex", gap:7, overflowX:"auto", padding:"11px 22px", borderBottom:"1px solid " + LINE2, flexShrink:0, scrollbarWidth:"none" as any }}>
      {agents.map((a: any) => {
        const on = active.id === a.id
        return (
          <button key={a.id} onClick={() => onPick(a)} title={a.desc}
            style={{
              display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap", flexShrink:0,
              padding:"8px 14px", borderRadius:999, cursor:"pointer",
              fontFamily:NUM, fontSize:12.5, letterSpacing:".01em",
              background: on ? "rgba(201,168,76,0.13)" : PANEL,
              border:"1px solid " + (on ? "rgba(201,168,76,0.45)" : LINE2),
              color: on ? GL : TX, fontWeight: on ? 600 : 400, transition:"all .16s",
            }}>
            <span style={{ fontSize:14 }}>{a.icon}</span>{a.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Conversation ───────────────────────────────────────────────────
function Typing() {
  return (
    <div style={{ display:"flex", gap:4, padding:"4px 0" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:5, height:5, borderRadius:"50%", background:G, opacity:.45, animation:`bob 1.1s ${i*0.16}s infinite ease-in-out` }}/>
      ))}
    </div>
  )
}

function Message({ msg }: any) {
  const mine = msg.role === "user"
  return (
    <div style={{ display:"flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom:18 }}>
      <div style={{ maxWidth: mine ? "78%" : "100%" }}>
        {!mine && (
          <div style={{ fontFamily:NUM, fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:TM, marginBottom:7 }}>Studio</div>
        )}
        <div style={{
          fontFamily:SERIF, fontSize:14.5, lineHeight:1.72, whiteSpace:"pre-wrap", wordBreak:"break-word",
          color: mine ? GL : TX,
          background: mine ? "rgba(201,168,76,0.1)" : "transparent",
          border: mine ? "1px solid " + LINE : "none",
          borderRadius: mine ? 14 : 0,
          padding: mine ? "11px 15px" : 0,
        }}>{msg.content}</div>
      </div>
    </div>
  )
}

// ── Composer ───────────────────────────────────────────────────────
function Composer({ taRef, value, onChange, onSend, loading, placeholder, chips, onChip }: any) {
  return (
    <div style={{ borderTop:"1px solid " + LINE2, padding:"12px 22px 16px", flexShrink:0, background:"rgba(10,9,14,0.6)" }}>
      {chips?.length > 0 && (
        <div style={{ display:"flex", gap:7, overflowX:"auto", marginBottom:10, scrollbarWidth:"none" as any }}>
          {chips.map((c: string, i: number) => (
            <button key={i} onClick={() => onChip(c)} disabled={loading}
              style={{ fontFamily:NUM, fontSize:11.5, whiteSpace:"nowrap", flexShrink:0, padding:"7px 12px",
                       borderRadius:999, background:PANEL, border:"1px solid " + LINE2, color:TM,
                       cursor: loading ? "default" : "pointer", transition:"all .16s" }}
              onMouseEnter={(e:any)=>{ if(!loading){ e.currentTarget.style.color=GL; e.currentTarget.style.borderColor=LINE } }}
              onMouseLeave={(e:any)=>{ e.currentTarget.style.color=TM; e.currentTarget.style.borderColor=LINE2 }}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:9, alignItems:"flex-end" }}>
        <textarea
          ref={taRef} value={value} rows={1} placeholder={placeholder}
          onChange={(e:any) => { onChange(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,150)+"px" }}
          onKeyDown={(e:any) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() } }}
          style={{ flex:1, resize:"none", fontFamily:SERIF, fontSize:14, lineHeight:1.6, padding:"12px 15px",
                   borderRadius:13, background:PANEL2, border:"1px solid " + LINE2, color:TX, outline:"none",
                   maxHeight:150, boxSizing:"border-box" }}
          onFocus={(e:any)=>e.currentTarget.style.borderColor=LINE}
          onBlur={(e:any)=>e.currentTarget.style.borderColor=LINE2}
        />
        <button onClick={onSend} disabled={loading || !value.trim()}
          style={{ fontFamily:NUM, fontSize:13, fontWeight:600, padding:"12px 20px", borderRadius:13, border:"none",
                   background: loading || !value.trim() ? "rgba(201,168,76,0.16)" : "linear-gradient(135deg,#e0be6f,#c9a84c)",
                   color: loading || !value.trim() ? TM : "#100f16",
                   cursor: loading || !value.trim() ? "default" : "pointer", flexShrink:0 }}>
          {loading ? "…" : "Ask"}
        </button>
      </div>
      <div style={{ fontFamily:NUM, fontSize:10, color:TM, marginTop:7 }}>
        Enter to send · Shift+Enter for a new line · answers use the live figures above
      </div>
    </div>
  )
}

// ── History drawer ─────────────────────────────────────────────────
function HistoryDrawer({ onClose, onRestore }: any) {
  const [history] = useState(loadHistory())
  const [q, setQ] = useState("")
  const items = history.filter((h: any) =>
    !q.trim() || h.label?.toLowerCase().includes(q.toLowerCase()) ||
    h.messages?.some((m: any) => m.content?.toLowerCase().includes(q.toLowerCase())))

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.62)", zIndex:60, display:"flex", justifyContent:"flex-end" }}>
      <motion.div initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }} transition={{ type:"tween", duration:.24 }}
        onClick={(e:any)=>e.stopPropagation()}
        style={{ width:"min(430px,92vw)", background:INK, borderLeft:"1px solid " + LINE, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid " + LINE2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:SERIF, fontSize:15, color:TX }}>Past conversations</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:TM, fontSize:19, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:"12px 20px" }}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…"
            style={{ width:"100%", fontFamily:NUM, fontSize:12.5, padding:"9px 12px", borderRadius:10,
                     background:PANEL2, border:"1px solid " + LINE2, color:TX, outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 20px 20px" }}>
          {items.length === 0 && (
            <div style={{ fontFamily:SERIF, fontSize:13, color:TM, fontStyle:"italic", padding:"18px 0" }}>
              {history.length === 0 ? "Nothing saved yet." : "No matches."}
            </div>
          )}
          {items.map((h: any, i: number) => (
            <button key={i} onClick={() => { onRestore(h); onClose() }}
              style={{ display:"block", width:"100%", textAlign:"left", marginBottom:8, padding:"11px 13px",
                       borderRadius:11, background:PANEL, border:"1px solid " + LINE2, cursor:"pointer" }}>
              <div style={{ fontFamily:NUM, fontSize:12, color:GL, marginBottom:3 }}>{h.label}</div>
              <div style={{ fontFamily:SERIF, fontSize:12, color:TM, lineHeight:1.5,
                            overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box",
                            WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>
                {h.messages?.find((m:any)=>m.role==="user")?.content || "—"}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Chat surface ───────────────────────────────────────────────────
function Conversation({ agent, metrics, selComps, onToggleComp }: any) {
  const welcome = agent.id === "books"
    ? "Ask me about any book in the library — themes, arguments, how it compares to another."
    : `${agent.desc}. I can see your live figures above, so ask in terms of them.`

  const [messages, setMessages] = useState<any[]>([{ role:"assistant", content:welcome }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const taRef = useRef<any>(null)
  const endRef = useRef<any>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages, loading])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput(""); setErr("")
    if (taRef.current) taRef.current.style.height = "auto"
    const next = [...messages, { role:"user", content }]
    setMessages(next); setLoading(true)
    try {
      let prompt = agent.systemPrompt || "You are a helpful literary assistant for House of Books."
      if (agent.id === "competitor" && selComps?.length) {
        prompt += "\n\nCompetitors selected for comparison:\n" + selComps.map((c:any) =>
          `- ${c.name} (${c.pricing}): strengths ${c.strengths.join(", ")}; weaknesses ${c.weaknesses.join(", ")}`).join("\n")
      }
      const reply = await callAI(next.filter(m => m.role !== "assistant" || m.content !== welcome), prompt)
      const done = [...next, { role:"assistant", content: reply }]
      setMessages(done)
      saveHistory(agent.id, agent.label, done)
    } catch (e: any) {
      setErr(e?.message || "That didn't go through.")
      setMessages(next)
    } finally { setLoading(false) }
  }, [input, loading, messages, agent, selComps, welcome])

  return (
    <>
      {agent.id === "competitor" && (
        <div style={{ display:"flex", gap:7, overflowX:"auto", padding:"11px 22px", borderBottom:"1px solid " + LINE2, flexShrink:0, scrollbarWidth:"none" as any }}>
          {COMPETITORS.map((c:any) => {
            const on = selComps?.some((s:any)=>s.id===c.id)
            return (
              <button key={c.id} onClick={()=>onToggleComp(c)}
                style={{ display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap", flexShrink:0,
                         fontFamily:NUM, fontSize:11.5, padding:"7px 12px", borderRadius:999, cursor:"pointer",
                         background: on ? "rgba(201,168,76,0.13)" : PANEL,
                         border:"1px solid " + (on ? "rgba(201,168,76,0.45)" : LINE2), color: on ? GL : TM }}>
                <span>{c.emoji}</span>{c.name}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ flex:1, overflowY:"auto", padding:"26px 22px" }}>
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          {loading && (
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:NUM, fontSize:10, letterSpacing:".13em", textTransform:"uppercase", color:TM, marginBottom:7 }}>Studio</div>
              <Typing />
            </div>
          )}
          {err && (
            <div style={{ fontFamily:NUM, fontSize:12, color:RED, padding:"9px 13px", borderRadius:10,
                          background:"rgba(240,85,85,0.07)", border:"1px solid rgba(240,85,85,0.25)", marginBottom:14 }}>
              {err}
            </div>
          )}
          <div ref={endRef}/>
        </div>
      </div>

      <Composer
        taRef={taRef} value={input} onChange={setInput} onSend={() => send()}
        loading={loading} placeholder={agent.placeholder || "Ask anything…"}
        chips={messages.length <= 1 ? (agent.suggestions || []) : []}
        onChip={(c:string) => send(c)}
      />
    </>
  )
}

// ── Studio ─────────────────────────────────────────────────────────
export default function BookAgent() {
  const [agent, setAgent] = useState<any>(ALL_AGENTS[0])
  const [selComps, setSelComps] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const [metrics, setMetrics] = useState<any>(null)
  const [mLoading, setMLoading] = useState(true)
  const [mErr, setMErr] = useState("")

  const loadMetrics = useCallback(async () => {
    setMLoading(true); setMErr("")
    try { setMetrics(await fetchMetrics()) }
    catch (e: any) { setMErr(e?.message || "Could not read metrics") }
    finally { setMLoading(false) }
  }, [])
  useEffect(() => { loadMetrics() }, [loadMetrics])

  const toggleComp = (c:any) => setSelComps(p => p.some(x=>x.id===c.id) ? p.filter(x=>x.id!==c.id) : [...p, c])

  return (
    <div style={{ background:INK, color:TX, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* Masthead */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 22px", borderBottom:"1px solid " + LINE2, flexShrink:0 }}>
        <div style={{ width:28, height:28, borderRadius:8, border:"1px solid " + LINE, display:"flex", alignItems:"center", justifyContent:"center", color:G, fontSize:13 }}>✦</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:SERIF, fontSize:15.5, color:GL, letterSpacing:".02em" }}>House of Books <span style={{ color:TM }}>· Studio</span></div>
          <div style={{ fontFamily:NUM, fontSize:10, color:TM, letterSpacing:".07em" }}>{agent.label}</div>
        </div>
        <button onClick={()=>setShowHistory(true)}
          style={{ fontFamily:NUM, fontSize:11.5, padding:"7px 13px", borderRadius:9, background:PANEL,
                   border:"1px solid " + LINE2, color:TM, cursor:"pointer" }}>History</button>
      </div>

      <TodayBand m={metrics} loading={mLoading} err={mErr} onRefresh={loadMetrics} />
      <AgentRail agents={ALL_AGENTS} active={agent} onPick={(a:any)=>{ setAgent(a); if (a.id!=="competitor") setSelComps([]) }} />

      <Conversation key={agent.id} agent={agent} metrics={metrics} selComps={selComps} onToggleComp={toggleComp} />

      <AnimatePresence>
        {showHistory && (
          <HistoryDrawer onClose={()=>setShowHistory(false)}
            onRestore={(h:any)=>{ const a = ALL_AGENTS.find((x:any)=>x.id===h.agentId); if (a) setAgent(a) }} />
        )}
      </AnimatePresence>

      <style>{`
        ::-webkit-scrollbar{width:4px;height:0}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.22);border-radius:2px}
        @keyframes bob{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}
      `}</style>
    </div>
  )
}
