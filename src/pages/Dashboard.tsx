import { useState, useEffect } from "react"
import { getAggregatedInsights } from '../lib/feedbackCollector'
import { motion, AnimatePresence } from "framer-motion"

// ═════════════════════════════════════════════════════════════════
// HOUSE OF BOOKS — BUSINESS INTELLIGENCE PLATFORM
// 7 modules: Revenue · Pricing · Growth · Feature Gap ·
//            Positioning · Content · Marketing Agent
// Powered by DeepSeek AI
// ═════════════════════════════════════════════════════════════════

const G    = "#c9a84c"
const GL   = "#e8c97a"
const GD   = "rgba(201,168,76,0.08)"
const SF   = "rgba(255,255,255,0.08)"
const GB   = "rgba(201,168,76,0.15)"
const BG   = "#0f0e0b"
const SURFACE = "#1a1813"
const TX   = "#f0e8d8"
const TM   = "rgba(240,232,216,0.5)"
const RED  = "#ff6b6b"
const GRN  = "#4ac878"
const BORDER = "rgba(255,255,255,0.08)"

// ── Shared helpers ─────────────────────────────────────────────────
async function askAI(prompt: string, sys: string = "You are a sharp startup strategist. Be specific, direct, actionable. No fluff.") {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages:[{ role:"user", content:prompt }], systemPrompt:sys })
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return (await res.json()).content || ""
}

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}
function Card({ children, style={} }: CardProps) {
  return <div style={{ background:SURFACE, border:"0.5px solid " + BORDER, borderLeft:"3px solid " + GB, borderRadius:14, padding:"1.1rem 1rem", cursor:"pointer", transition:"transform .25s, borderLeftColor .25s, background .25s", ...style }}>{children}</div>
}

interface TitleProps {
  icon: string;
  title: string;
  sub?: string;
}
function Title({ icon, title, sub }: TitleProps) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:3 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:"1.2rem", color:G, fontWeight:700, margin:0 }}>{title}</h2>
      </div>
      {sub && <p style={{ fontSize:11, color:TM, margin:0, paddingLeft:28 }}>{sub}</p>}
    </div>
  )
}

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  large?: boolean;
}
function Metric({ label, value, sub, color=G, large=false }: MetricProps) {
  return (
    <div style={{ background:GD, border:`1px solid ${GB}`, borderRadius:9, padding:large?"16px 18px":"12px 14px", textAlign:"center" }}>
      <div style={{ fontFamily:"Georgia,serif", fontSize:large?"1.9rem":"1.4rem", color, fontWeight:700, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:TM, marginTop:3 }}>{label}</div>
      {sub && <div style={{ fontSize:9, color, marginTop:2, opacity:.75 }}>{sub}</div>}
    </div>
  )
}

interface FieldProps {
  label: string;
  value: number | string;
  onChange: (value: any) => void;
  type?: string;
  pre?: string;
  suf?: string;
  hint?: string;
}
function Field({ label, value, onChange, type="number", pre, suf, hint }: FieldProps) {
  return (
    <div style={{ marginBottom:13 }}>
      <label style={{ fontSize:10, color:TM, letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:4 }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        {pre && <span style={{ fontSize:12, color:G, flexShrink:0 }}>{pre}</span>}
        <input type={type} value={value}
          onChange={e=>onChange(type==="number"?parseFloat(e.target.value)||0:e.target.value)}
          style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:7, padding:"8px 11px", color:TX, fontSize:13, outline:"none", fontFamily:"Georgia,serif", transition:"border-color .2s" }}
          onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GB} />
        {suf && <span style={{ fontSize:11, color:TM, flexShrink:0 }}>{suf}</span>}
      </div>
      {hint && <div style={{ fontSize:9, color:TM, marginTop:2, opacity:.7 }}>{hint}</div>}
    </div>
  )
}

interface TextareaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}
function Textarea({ label, value, onChange, rows=3, placeholder="" }: TextareaProps) {
  return (
    <div style={{ marginBottom:13 }}>
      {label && <label style={{ fontSize:10, color:TM, letterSpacing:".07em", textTransform:"uppercase", display:"block", marginBottom:4 }}>{label}</label>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${GB}`, borderRadius:7, padding:"9px 12px", color:TX, fontSize:12.5, outline:"none", resize:"vertical", fontFamily:"Georgia,serif", lineHeight:1.55, boxSizing:"border-box", transition:"border-color .2s" }}
        onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor=GB} />
    </div>
  )
}

interface AIBtnProps {
  onClick: () => void;
  loading: boolean;
  label?: string;
  small?: boolean;
}
function AIBtn({ onClick, loading, label="✦ Analyze with AI", small=false }: AIBtnProps) {
  return (
    <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.98 }} onClick={onClick} disabled={loading}
      style={{ padding:small?"6px 14px":"9px 20px", background:loading?"rgba(201,168,76,0.12)":`linear-gradient(135deg,${G},${GL})`, color:loading?G:"#06050a", border:loading?`1px solid ${GB}`:"none", borderRadius:8, fontSize:small?10:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", cursor:loading?"wait":"pointer", display:"flex", alignItems:"center", gap:7, fontFamily:"Georgia,serif", flexShrink:0 }}>
      {loading ? <><motion.span animate={{ rotate:360 }} transition={{ duration:.8, repeat:Infinity, ease:"linear" }} style={{ display:"inline-block" }}>⟳</motion.span>Analyzing…</> : label}
    </motion.button>
  )
}

interface AIOutProps {
  text: string;
  loading: boolean;
}
function AIOut({ text, loading }: AIOutProps) {
  if (!text && !loading) return null
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ marginTop:14, background:"rgba(201,168,76,0.04)", border:`1px solid rgba(201,168,76,0.14)`, borderRadius:10, padding:"14px 16px" }}>
      <div style={{ fontSize:8, color:G, letterSpacing:".14em", textTransform:"uppercase", marginBottom:9, display:"flex", alignItems:"center", gap:5 }}>
        <span style={{ width:5, height:5, borderRadius:"50%", background:GRN, display:"inline-block", animation:"pulse 2s infinite" }}/>
        DeepSeek AI Analysis
      </div>
      {loading
        ? <div style={{ display:"flex", gap:4 }}>{[0,1,2].map(i=>(<motion.div key={i} style={{ width:6, height:6, borderRadius:"50%", background:G }} animate={{ y:[0,-5,0], opacity:[.4,1,.4] }} transition={{ duration:.8, repeat:Infinity, delay:i*.18 }}/>))}</div>
        : <div style={{ fontSize:13, color:"rgba(232,228,217,0.88)", lineHeight:1.75, whiteSpace:"pre-wrap" }}>{text}</div>
      }
    </motion.div>
  )
}

// Copy to clipboard button
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  return (
    <button onClick={copy} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${GB}`, borderRadius:5, fontSize:9, color:copied?GRN:TM, cursor:"pointer", letterSpacing:".07em", textTransform:"uppercase", transition:"all .2s" }}>
      {copied?"✓ Copied":"Copy"}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════
// MODULE 1 — REVENUE CALCULATOR
// ══════════════════════════════════════════════════════════════════
function RevenueModule() {
  const [m,setM] = useState({ freeUsers:500, conv:4, moPrice:10, yrPrice:90, yrMix:30, churn:5, cac:8 })
  const [ai,setAi]=useState(""); const [load,setLoad]=useState(false)
  const s=(k: string, v: any)=>setM(p=>({...p,[k]:v}))
  const prem=Math.round(m.freeUsers*(m.conv/100))
  const moPrem=Math.round(prem*(1-m.yrMix/100)), yrPrem=Math.round(prem*(m.yrMix/100))
  const mrr=Math.round(moPrem*m.moPrice+yrPrem*(m.yrPrice/12))
  const arr=mrr*12, ltv=Math.round(m.moPrice/(m.churn/100))
  const ltvCac=(ltv/m.cac).toFixed(1), pb=Math.round(m.cac/m.moPrice)
  const netMRR=Math.round(mrr*(1-m.churn/100))
  const analyze=async()=>{ setLoad(true);setAi("")
    try{ setAi(await askAI(`House of Books metrics: Free users:${m.freeUsers}, Conv:${m.conv}%, Premium:${prem}, MRR:$${mrr}, ARR:$${arr}, LTV:$${ltv}, CAC:$${m.cac}, LTV:CAC:${ltvCac}x, Churn:${m.churn}%/mo, Payback:${pb}mo, Net MRR:$${netMRR}. What's healthy, alarming, and 3 highest-leverage moves to grow MRR in 90 days? Be specific.`)) }catch(e){setAi(`Error: ${(e as Error).message}`)} setLoad(false) }
  return (<div>
    <Title icon="💰" title="Revenue Calculator" sub="Model MRR, ARR, LTV and get AI diagnosis of your financial health" />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
      <Card>
        <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:12 }}>Your Metrics</div>
        <Field label="Free Users" value={m.freeUsers} onChange={v=>s("freeUsers",v)} />
        <Field label="Conversion %" value={m.conv} onChange={v=>s("conv",v)} suf="%" hint="Industry avg: 2-5%" />
        <Field label="Monthly Price" value={m.moPrice} onChange={v=>s("moPrice",v)} pre="$" />
        <Field label="Yearly Price" value={m.yrPrice} onChange={v=>s("yrPrice",v)} pre="$" />
        <Field label="Yearly Plan Mix" value={m.yrMix} onChange={v=>s("yrMix",v)} suf="%" hint="Higher = better cash flow" />
        <Field label="Monthly Churn" value={m.churn} onChange={v=>s("churn",v)} suf="%" hint="Good SaaS: &lt;3%" />
        <Field label="CAC" value={m.cac} onChange={v=>s("cac",v)} pre="$" hint="Cost to acquire 1 premium user" />
      </Card>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Metric label="MRR" value={`$${mrr.toLocaleString()}`} sub="Monthly Recurring Revenue" large />
          <Metric label="ARR" value={`$${arr.toLocaleString()}`} sub="Annual Run Rate" large color={GL} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          <Metric label="LTV" value={`$${ltv}`} />
          <Metric label="LTV:CAC" value={`${ltvCac}x`} sub={parseFloat(ltvCac)>=3?"✓ Healthy":"⚠ Low"} color={parseFloat(ltvCac)>=3?GRN:RED} />
          <Metric label="Payback" value={`${pb}mo`} sub={pb<=6?"✓ Fast":"⚠ Slow"} color={pb<=6?GRN:RED} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Metric label="Premium Users" value={prem.toString()} sub={`${m.conv}% of ${m.freeUsers}`} />
          <Metric label="Net MRR (post-churn)" value={`$${netMRR.toLocaleString()}`} color={netMRR>0?GRN:RED} />
        </div>
        <AIBtn onClick={analyze} loading={load} />
      </div>
    </div>
    <AIOut text={ai} loading={load} />
  </div>)
}

// ══════════════════════════════════════════════════════════════════
// MODULE 2 — PRICING OPTIMIZER
// ══════════════════════════════════════════════════════════════════
function PricingModule() {
  const [cur,setCur]=useState(10); const [ai,setAi]=useState(""); const [load,setLoad]=useState(false)
  const conv=(p: number)=>Math.max(1,4*Math.exp(-0.08*(p-10)))
  const rev=(p: number)=>Math.round(1000*(conv(p)/100)*p)
  const comps=[{n:"Blinkist",p:15.99},{n:"getAbstract",p:19.99},{n:"Shortform",p:24.99},{n:"Goodreads",p:0},{n:"House of Books",p:cur,isHoB:true}]
  const scenarios=[7,9,10,12,15,19]
  const analyze=async()=>{ setLoad(true);setAi("")
    try{ setAi(await askAI(`House of Books at $${cur}/month. Competitors: Blinkist $15.99, Shortform $24.99, getAbstract $19.99. HoB unique: AI chat per book, community, 5 languages, mobile PWA. Is $${cur} right? Optimal monthly vs yearly strategy? Should we add a higher tier? How to frame price vs Blinkist and Shortform? Give specific price recommendations.`,"You are a SaaS pricing expert. Be direct.")) }catch(e){setAi(`Error: ${(e as Error).message}`)} setLoad(false) }
  return (<div>
    <Title icon="🏷️" title="Pricing Optimizer" sub="Model price scenarios vs competitors and get AI pricing strategy" />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
      <Card>
        <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:14 }}>Competitor Price Map</div>
        {comps.map((c,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
            <div style={{ width:88, fontSize:11, color:c.isHoB?G:TM, fontWeight:c.isHoB?700:400, flexShrink:0 }}>{c.n}</div>
            <div style={{ flex:1, background:"rgba(255,255,255,0.03)", borderRadius:4, height:18, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", left:0, top:0, bottom:0, background:c.isHoB?`linear-gradient(90deg,${G},${GL})`:SF, width:`${Math.min(100,(c.p/25)*100)||4}%`, borderRadius:4, border:`1px solid ${c.isHoB?G:GB}` }}/>
            </div>
            <div style={{ width:52, fontSize:11, color:c.isHoB?G:TM, fontWeight:600, textAlign:"right", flexShrink:0 }}>{c.p===0?"Free":`$${c.p}`}</div>
          </div>
        ))}
        <div style={{ marginTop:18 }}>
          <Field label="Your Monthly Price ($)" value={cur} onChange={(v: number)=>setCur(v)} pre="$" />
        </div>
      </Card>
      <Card>
        <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:14 }}>Revenue Scenarios (per 1,000 free users)</div>
        {scenarios.map(p=>{
          const r=rev(p), c=conv(p).toFixed(1), now=Math.abs(p-cur)<1.5
          return (<div key={p} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7, padding:"7px 9px", borderRadius:7, background:now?GD:"transparent", border:`1px solid ${now?GB:"transparent"}` }}>
            <div style={{ width:40, fontSize:12, color:now?G:TM, fontWeight:now?700:400, flexShrink:0 }}>${p}</div>
            <div style={{ flex:1, background:"rgba(255,255,255,0.04)", borderRadius:3, height:7, overflow:"hidden" }}>
              <div style={{ height:"100%", background:`linear-gradient(90deg,${G},${GL})`, width:`${(r/rev(7))*100}%`, opacity:now?1:.45 }}/>
            </div>
            <div style={{ width:65, textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:11, color:now?G:TM, fontWeight:600 }}>${r.toLocaleString()}</div>
              <div style={{ fontSize:8, color:TM }}>{c}% conv</div>
            </div>
            {now&&<span style={{ fontSize:8, background:G, color:BG, padding:"1px 5px", borderRadius:3, fontWeight:700, flexShrink:0 }}>NOW</span>}
          </div>)
        })}
        <div style={{ marginTop:14 }}><AIBtn onClick={analyze} loading={load} /></div>
      </Card>
    </div>
    <AIOut text={ai} loading={load} />
  </div>)
}

// ══════════════════════════════════════════════════════════════════
// MODULE 3 — 90-DAY GROWTH STRATEGY
// ══════════════════════════════════════════════════════════════════
function GrowthModule() {
  const [m,setM]=useState({ mrr:0, goal:1000, users:500, team:1, budget:100, challenge:"getting first paying customers", strength:"AI chat per book that no competitor offers" })
  const [ai,setAi]=useState(""); const [load,setLoad]=useState(false)
  const s=(k: string, v: any)=>setM(p=>({...p,[k]:v}))
  const gap=m.goal-m.mrr, newPrem=Math.ceil(gap/10), newFree=Math.ceil(newPrem/0.04)
  const analyze=async()=>{ setLoad(true);setAi("")
    try{ setAi(await askAI(`Build a specific 90-day growth plan for House of Books. Current MRR:$${m.mrr}→Goal:$${m.goal}. Free users:${m.users}. Team:${m.team}. Budget:$${m.budget}/mo. Challenge:${m.challenge}. Strength:${m.strength}. Product: AI book summaries+community, $10/month, 210+ books, 5 languages. Give: Month 1/2/3 with 3 specific actions each + expected outcomes. #1 week-1 action. Top 3 things NOT to do.`,"You are a growth advisor for bootstrapped SaaS founders. Be specific with channels, tactics, and expected numbers.")) }catch(e){setAi(`Error: ${(e as Error).message}`)} setLoad(false) }
  return (<div>
    <Title icon="🚀" title="90-Day Growth Strategy" sub="Input your state and goal — AI builds a week-by-week action plan" />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
      <Card>
        <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:12 }}>Your Current State</div>
        <Field label="Current MRR ($)" value={m.mrr} onChange={v=>s("mrr",v)} pre="$" />
        <Field label="MRR Goal in 90 Days ($)" value={m.goal} onChange={v=>s("goal",v)} pre="$" />
        <Field label="Free Users" value={m.users} onChange={v=>s("users",v)} />
        <Field label="Team Size" value={m.team} onChange={v=>s("team",v)} suf="person(s)" />
        <Field label="Monthly Budget ($)" value={m.budget} onChange={v=>s("budget",v)} pre="$" />
        <Textarea label="Biggest Challenge" value={m.challenge} onChange={v=>s("challenge",v)} rows={2} />
        <Textarea label="Biggest Strength" value={m.strength} onChange={v=>s("strength",v)} rows={2} />
      </Card>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <Card style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:12 }}>Gap Analysis</div>
          {[
            { label:"MRR Gap", value:`$${gap.toLocaleString()}`, sub:"needed in 90 days" },
            { label:"New Premium Users Needed", value:newPrem, sub:"at premium tier" },
            { label:"New Free Users Needed", value:newFree.toLocaleString(), sub:"at 4% conversion" },
            { label:"Daily New Free Users", value:Math.ceil(newFree/90), sub:"to hit goal" },
          ].map((item,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:i<3?`1px solid rgba(201,168,76,0.07)`:"none" }}>
              <span style={{ fontSize:11, color:TM }}>{item.label}</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, color:G, fontWeight:700 }}>{item.value}</div>
                <div style={{ fontSize:9, color:TM }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </Card>
        <AIBtn onClick={analyze} loading={load} />
      </div>
    </div>
    <AIOut text={ai} loading={load} />
  </div>)
}

// ══════════════════════════════════════════════════════════════════
// MODULE 4 — FEATURE GAP RADAR
// ══════════════════════════════════════════════════════════════════
function FeatureGapModule() {
  const [ai,setAi]=useState(""); const [load,setLoad]=useState(false); const [hov,setHov]=useState<number | null>(null)
  const FEATS=["AI Chat per Book","Community/Groups","Reading Progress","Mobile PWA","Audio Summaries","Multi-language","Gamification/Streaks","PDF Export","Recommendations","Book Discussions"]
  const CF: Record<string, boolean[]> = {"Blinkist":[false,false,false,true,true,true,false,false,false,false],"getAbstract":[false,false,false,false,false,false,false,false,false,false],"Shortform":[false,false,false,false,false,false,false,false,false,false],"Goodreads":[false,true,true,true,false,false,true,false,true,true],"House of Books":[true,true,true,true,false,true,true,true,true]}
  const names=Object.keys(CF)
  const missing=FEATS.filter((_,i)=>!CF["House of Books"][i])
  const unique=FEATS.filter((_,i)=>CF["House of Books"][i]&&!CF["Blinkist"][i]&&!CF["Shortform"][i]&&!CF["getAbstract"][i])
  const analyze=async()=>{ setLoad(true);setAi("")
    try{ setAi(await askAI(`House of Books feature gap analysis. HAS: ${FEATS.filter((_,i)=>CF["House of Books"][i]).join(", ")}. MISSING: ${missing.join(", ")}. UNIQUE (no competitor has): ${unique.join(", ")}. Blinkist has audio, multi-language. Goodreads has community but no summaries. Questions: 1) Which missing features have highest revenue impact? Rank top 3. 2) Which unique features to double down on in marketing? 3) What new feature could we build that NO competitor has? 4) Build order for missing features over 6 months.`)) }catch(e){setAi(`Error: ${(e as Error).message}`)} setLoad(false) }
  return (<div>
    <Title icon="⚔️" title="Feature Gap Radar" sub="Every feature across all competitors — find gaps and moats" />
    <Card style={{ marginBottom:14, overflow:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
        <thead><tr>
          <th style={{ textAlign:"left", padding:"7px 12px", color:TM, fontWeight:400, fontSize:9, letterSpacing:".08em", textTransform:"uppercase", borderBottom:`1px solid ${GB}` }}>Feature</th>
          {names.map(n=><th key={n} style={{ textAlign:"center", padding:"7px 8px", color:n==="House of Books"?G:TM, fontWeight:n==="House of Books"?700:400, fontSize:9, borderBottom:`1px solid ${GB}`, minWidth:80 }}>{n}</th>)}
        </tr></thead>
        <tbody>{FEATS.map((f,fi)=>(
          <tr key={fi} onMouseEnter={()=>setHov(fi)} onMouseLeave={()=>setHov(null)} style={{ background:hov===fi?GD:"transparent", transition:"background .15s" }}>
            <td style={{ padding:"8px 12px", color:TX, fontSize:11, borderBottom:`1px solid rgba(201,168,76,0.05)` }}>{f}</td>
            {names.map(n=>{
              const has=CF[n][fi], isHoB=n==="House of Books"
              return <td key={n} style={{ textAlign:"center", padding:"8px 8px", borderBottom:`1px solid rgba(201,168,76,0.05)` }}>
                {has?<span style={{ fontSize:13, color:isHoB?GRN:"rgba(74,200,120,0.55)" }}>✓</span>:<span style={{ fontSize:11, color:isHoB?RED:"rgba(255,255,255,0.08)" }}>—</span>}
              </td>
            })}
          </tr>
        ))}</tbody>
      </table>
    </Card>
    <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
      {[{c:GRN,l:"HoB advantage"},{c:"rgba(74,200,120,0.55)",l:"Competitor has it"},{c:RED,l:"HoB missing"}].map((x,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:TM }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:x.c, display:"inline-block" }}/>{x.l}
        </div>
      ))}
      <div style={{ marginLeft:"auto" }}><AIBtn onClick={analyze} loading={load} small /></div>
    </div>
    <AIOut text={ai} loading={load} />
  </div>)
}

// ══════════════════════════════════════════════════════════════════
// MODULE 5 — MARKET POSITIONING
// ══════════════════════════════════════════════════════════════════
function PositioningModule() {
  const [m,setM]=useState({ audience:"curious professionals 25-40 who want to learn but have limited time", pain:"spend hours reading but forget 90% — no AI to discuss ideas with", value:"AI chat per book + community + 5 languages, all in one cheaper than competitors", channels:"organic search, LinkedIn, book communities, Reddit, Twitter" })
  const [ai,setAi]=useState(""); const [load,setLoad]=useState(false)
  const s=(k: string, v: any)=>setM(p=>({...p,[k]:v}))
  const analyze=async()=>{ setLoad(true);setAi("")
    try{ setAi(await askAI(`Positioning strategy for House of Books ($10/mo AI book summaries+community). Audience:${m.audience}. Pain:${m.pain}. Unique value:${m.value}. Channels:${m.channels}. Competitors: Blinkist($15.99 no AI), Shortform($24.99 no AI), Goodreads(free no summaries). Deliver: 1) One-line positioning statement 2) Detailed ICP (demographics, psychographics, job title) 3) Top 3 landing page headline options with subheadlines 4) Best 3 channels and why 5) Brand voice: 5 adjectives + what to avoid 6) How to frame price vs Blinkist specifically`,"You are a positioning strategist for B2C subscription products. Be specific.")) }catch(e){setAi(`Error: ${(e as Error).message}`)} setLoad(false) }
  return (<div>
    <Title icon="🎯" title="Market Positioning" sub="Define your ICP, messaging, and competitive moat with AI strategy" />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
      <Card>
        <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:12 }}>Positioning Inputs</div>
        <Textarea label="Target Audience" value={m.audience} onChange={v=>s("audience",v)} rows={2} />
        <Textarea label="Top Customer Pain" value={m.pain} onChange={v=>s("pain",v)} rows={2} />
        <Textarea label="Your Unique Value" value={m.value} onChange={v=>s("value",v)} rows={2} />
        <Textarea label="Marketing Channels" value={m.channels} onChange={v=>s("channels",v)} rows={2} />
        <AIBtn onClick={analyze} loading={load} />
      </Card>
      <Card>
        <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:14 }}>Competitive Position Map</div>
        <div style={{ position:"relative", width:"100%", paddingTop:"75%", background:"rgba(255,255,255,0.02)", borderRadius:8, border:`1px solid ${GB}`, overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0 }}>
            <div style={{ position:"absolute", top:"50%", left:18, right:0, height:1, background:GB }}/>
            <div style={{ position:"absolute", left:"50%", top:0, bottom:18, width:1, background:GB }}/>
            <div style={{ position:"absolute", bottom:6, left:"50%", transform:"translateX(-50%)", fontSize:8, color:TM, textTransform:"uppercase", letterSpacing:".08em", whiteSpace:"nowrap" }}>Features (Basic → Advanced)</div>
            <div style={{ position:"absolute", top:"50%", left:2, transform:"translateY(-50%) rotate(-90deg)", fontSize:8, color:TM, textTransform:"uppercase", letterSpacing:".06em", transformOrigin:"center", whiteSpace:"nowrap" }}>Price (Low→High)</div>
            {[{n:"Blinkist",x:30,y:55},{n:"Shortform",x:32,y:22},{n:"getAbstract",x:22,y:18},{n:"Goodreads",x:55,y:88},{n:"HoB ✦",x:74,y:58,h:true}].map(d=>(
              <div key={d.n} style={{ position:"absolute", left:`${d.x}%`, top:`${d.y}%`, transform:"translate(-50%,-50%)" }}>
                <div style={{ width:d.h?13:9, height:d.h?13:9, borderRadius:"50%", background:d.h?G:"rgba(232,228,217,0.25)", border:`2px solid ${d.h?GL:"rgba(232,228,217,0.35)"}`, boxShadow:d.h?`0 0 10px ${G}55`:"none" }}/>
                <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", fontSize:d.h?9:7.5, color:d.h?G:TM, whiteSpace:"nowrap", fontWeight:d.h?700:400, marginTop:2 }}>{d.n}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop:10, fontSize:11, color:TM, lineHeight:1.6 }}>
          House of Books is in the <span style={{ color:G }}>high-feature, mid-price</span> quadrant — no direct competitor there.
        </div>
      </Card>
    </div>
    <AIOut text={ai} loading={load} />
  </div>)
}

// ══════════════════════════════════════════════════════════════════════
// MODULE 6 — CONTENT STRATEGY
// ════════════════════════════════════════════════════════════════════════
function ContentModule() {
  const [tab,setTab]=useState("seo"); const [niche,setNiche]=useState("productivity and self-improvement")
  const [ai,setAi]=useState(""); const [load,setLoad]=useState(false)
  const prompts: Record<string, string> = {
    seo:`SEO content strategy for House of Books (AI book summaries, premium tier, 220+ books). Niche: ${niche}. Give: 1) Top 10 article ideas with search volume estimates 2) 30-day content calendar with title+keyword per post 3) One pillar page concept 4) 3 "vs" posts capturing competitor traffic (Blinkist vs House of Books etc) 5) Internal linking strategy between book summary pages`,
    social:`Social media strategy for House of Books. Niche: ${niche}. Give: 1) 7 Twitter/X tweet templates with strong hooks 2) 3 LinkedIn post formats for professionals 3) 5 TikTok/Reels video concepts that could go viral 4) Reddit strategy: which subreddits + how to add value without getting banned 5) 5-email onboarding sequence to convert free users to premium`,
    community:`Community growth strategy for House of Books (book discussions + reading groups). Give: 1) Cold start strategy: how to make it feel alive before real users 2) 10 discussion questions to seed across book categories 3) 5 reading group concepts with names and first book picks 4) 3 daily engagement mechanics that bring users back 5) How to recruit and incentivize community champions` 
  }
  const analyze=async()=>{ setLoad(true);setAi(""); try{setAi(await askAI(prompts[tab],"You are a content strategist for subscription edtech apps. Be specific with titles, formats, and real tactics."))}catch(e){setAi(`Error: ${(e as Error).message}`)} setLoad(false) }
  return (<div>
    <Title icon="✍️" title="Content Strategy" sub="Generate SEO, social, and community content strategies" />
    <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
      {[{id:"seo",l:"🔍 SEO & Blog"},{id:"social",l:"📱 Social Media"},{id:"community",l:"👥 Community"}].map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"7px 15px", borderRadius:18, fontSize:11, cursor:"pointer", background:tab===t.id?GD:SF, border:`1px solid ${tab===t.id?G:GB}`, color:tab===t.id?G:TM, transition:"all .2s" }}>{t.l}</button>
      ))}
    </div>
    <Card style={{ marginBottom:14 }}>
      <Field label="Niche / Topic Focus" value={niche} onChange={(v: string)=>setNiche(v)} type="text" hint="e.g. stoicism, startup founders, personal finance, productivity" />
      <AIBtn onClick={analyze} loading={load} label={`✦ Generate ${tab==="seo"?"SEO Strategy":tab==="social"?"Social Strategy":"Community Strategy"}`} />
    </Card>
    <AIOut text={ai} loading={load} />
  </div>)
}

// ════════════════════════════════════════════════════════════════════════
// MODULE 7 — MARKETING AGENT 🎯
// The agent that WRITES production-ready copy — not just advice
// ══════════════════════════════════════════════════════════════════════════

interface MarketingTask {
  id: string;
  icon: string;
  label: string;
  desc: string;
  fields: Array<{
    key: string;
    label: string;
    default: string;
    type?: string;
  }>;
  prompt: (f: Record<string, string>) => string;
}

const MARKETING_TASKS: MarketingTask[] = [
  {
    id:"landing",     icon:"🏠", label:"Landing Page Copy",
    desc:"Full hero, features, pricing, FAQ, CTA sections — ready to paste",
    fields:[
      { key:"angle", label:"Main angle / hook", default:"The only book app with AI you can actually talk to", type:"text" },
      { key:"audience", label:"Target audience", default:"Busy professionals who want to read smarter", type:"text" },
    ],
    prompt:(f)=>`Write complete landing page copy for House of Books. Angle: ${f.angle}. Audience: ${f.audience}. Product: AI book summaries + chat per book + community, premium tier, 220+ books, 5 languages, PWA.

Write ALL sections:
1. HERO: H1 (max 8 words), H2 subheadline (1 line), CTA button text
2. SOCIAL PROOF BAR: 3 micro-stats (e.g. "210 books · 5 languages · $0 to start")
3. PROBLEM SECTION: 2-sentence setup of pain
4. SOLUTION SECTION: 3 benefit bullets with bold lead-ins
5. FEATURES SECTION: 3 feature cards, each with title + 2-sentence description
6. COMPETITOR COMPARISON: 3-row table (HoB vs Blinkist vs Shortform) — make us look great
7. PRICING SECTION: Free tier + Premium tier copy with 5 bullets each
8. FAQ: 4 questions + answers
9. FINAL CTA: closing headline + button text

Use persuasive copywriting. Make every word earn its place.`,
  },
  {
    id:"email_welcome", icon:"📧", label:"Welcome Email Sequence",
    desc:"5-email onboarding sequence to convert free users to premium",
    fields:[
      { key:"userName", label:"Personalization token", default:"{{first_name}}", type:"text" },
      { key:"trialLength", label:"Free books count", default:"63", type:"text" },
    ],
    prompt:(f)=>`Write a 5-email welcome sequence for House of Books. Free tier has ${f.trialLength} free books. Goal: convert free → premium.

EMAIL 1 (Sent immediately - Welcome):
- Subject line (A/B test 2 options)
- Body: 150 words max, personal, warm, single CTA

EMAIL 2 (Day 2 - Feature reveal):
- Subject line (A/B test 2 options)  
- Body: Show AI chat feature, 120 words, include example interaction

EMAIL 3 (Day 5 - Social proof):
- Subject line
- Body: Community angle + what other readers are discussing, 130 words

EMAIL 4 (Day 10 - Upgrade nudge):
- Subject line with urgency
- Body: 140 words, show exactly what they're missing with premium, clear CTA

EMAIL 5 (Day 14 - Last chance / reframe):
- Subject line
- Body: Reframe value, address pricing objections, 130 words, strong CTA

For each: subject line, preview text, full body, CTA button text. Make each feel human, not robotic.`,
  },
  {
    id:"ads",          icon:"📣", label:"Ad Copy (Google + Meta)",
    desc:"Search ads, display ads, and Meta/Instagram ad variations",
    fields:[
      { key:"budget", label:"Target audience for ads", default:"25-40 year olds interested in books, self-improvement, business", type:"text" },
      { key:"offer", label:"Main offer/hook", default:"Start free, 63 books, no credit card", type:"text" },
    ],
    prompt:(f)=>`Write ad copy for House of Books targeting: ${f.budget}. Main offer: ${f.offer}.

GOOGLE SEARCH ADS (3 variations):
Each with: Headline 1 (30 chars max), Headline 2 (30 chars max), Headline 3 (30 chars max), Description 1 (90 chars), Description 2 (90 chars)

META/INSTAGRAM ADS (3 variations):
Variation 1 - Pain-led: Hook (first line that stops scroll), Body (3-4 sentences), CTA
Variation 2 - Social proof-led: Hook, Body, CTA  
Variation 3 - Competitor comparison: Hook, Body, CTA

RETARGETING AD (for people who visited but didn't sign up):
Hook + body + CTA specifically for warm audience

YOUTUBE PRE-ROLL SCRIPT (30 seconds):
Full script with hook in first 5 seconds before skip button

Include: character counts where relevant, emoji usage recommendations, best image/video style for each.`,
  },
  {
    id:"social_posts", icon:"📱", label:"Social Media Posts",
    desc:"10 ready-to-post tweets, 3 LinkedIn posts, 3 Instagram captions",
    fields:[
      { key:"topic",    label:"Topic / book to feature", default:"Atomic Habits by James Clear", type:"text" },
      { key:"voice",    label:"Brand voice", default:"intellectual but approachable, slightly premium", type:"text" },
    ],
    prompt:(f)=>`Write social media posts for House of Books featuring: ${f.topic}. Brand voice: ${f.voice}.

TWITTER/X (10 posts):
Mix of formats:
- 3 insight posts (share a key idea from the book)
- 2 question posts (spark engagement)
- 2 comparison posts (why AI summaries > reading alone)
- 2 community posts (what readers are discussing)
- 1 promo post (subtle CTA to try free)
Each: full tweet text + suggested image description

LINKEDIN (3 posts):
Each 150-200 words. Formats: professional insight, personal story angle, industry trend.
Include hook line, body, CTA to try House of Books.

INSTAGRAM CAPTIONS (3):
Each 100-150 words + 15 relevant hashtags.
Formats: quote graphic, book recommendation, behind-the reading insight.

THREADS (3 thread starters):
Opening tweet + 5 follow-up tweets per thread. Topic: book insights that changed how people think.`,
  },
  {
    id:"outreach",      icon:"🤝", label:"Community Outreach Scripts",
    desc:"Reddit posts, Discord messages, Hacker News Show HN, Product Hunt",
    fields:[
      { key:"milestone", label:"Current milestone / story", default:"Solo-built AI book platform with 210 books in 3 months", type:"text" },
    ],
    prompt:(f)=>`Write outreach copy for House of Books. My story: ${f.milestone}. Product: AI book summaries + AI chat + community, premium tier, 220+ books.

REDDIT POSTS (4 posts for different subreddits):
1. r/books - Share value, subtly mention tool (not spam)
2. r/selfimprovement - Personal story + value, End with HoB mention
3. r/entrepreneur - Solo founder story angle
4. r/productivity - Productivity + reading hack angle
Each: Title + full post body. Make each feel native to the sub, not promotional.

HACKER NEWS — Show HN POST:
Title + 200-word body. Focus on technical/product decisions, be humble about limitations.

PRODUCT HUNT LAUNCH:
- Tagline (60 chars max)
- Description (260 chars)
- First comment (founder post, 200 words, honest + engaging)
- 3 maker goals to mention

DISCORD/SLACK COLD DM TEMPLATE:
For reaching out to book community moderators to partner/cross-promote. 100 words, respectful, value-first.

TWITTER COLD DM to book influencers:
3 templates for different influencer types. Each under 280 chars.`,
  },
  {
    id:"seo_article",   icon:"📝", label:"Full SEO Article",
    desc:"Complete 1500-word SEO-optimized blog post ready to publish",
    fields:[
      { key:"keyword", label:"Target keyword", default:"best book summary apps 2025", type:"text" },
      { key:"angle", label:"Article angle", default:"honest comparison including our own app", type:"text" },
    ],
    prompt:(f)=>`Write a complete SEO blog post for House of Books.

Target keyword: "${f.keyword}"
Angle: ${f.angle}

STRUCTURE:
- SEO Title (include keyword, under 60 chars)
- Meta description (include keyword, 150-160 chars)
- H1 (slightly different from title)
- Introduction (150 words — hook, problem, promise)
- H2 Section 1: The problem with how most people read (200 words)
- H2 Section 2: What makes a great book summary app (150 words, include keyword naturally)
- H2 Section 3: Top 5 book summary apps compared (300 words — include Blinkist, Shortform, getAbstract, Goodreads, House of Books — be honest, position HoB's AI as a differentiator)
- H2 Section 4: Why AI changes everything about book summaries (200 words — HoB strength)
- H2 Section 5: How to get the most from book summaries (150 words — practical tips)
- Conclusion (100 words — soft CTA to try HoB free)
- 5 FAQ entries with answers (for FAQ schema)

Total ~1500 words. Write naturally, include keyword 4-6 times. Make it genuinely helpful, not just promotional.`,
  },
  {
    id:"pitch",         icon:"💼", label:"Investor / Partner Pitch",
    desc:"Executive summary, TAM analysis, and pitch deck outline",
    fields:[
      { key:"stage",   label:"Stage / context", default:"pre-revenue, bootstrapped, seeking first users", type:"text" },
      { key:"ask",     label:"What you're pitching for", default:"partnership with book publishers or media companies", type:"text" },
    ],
    prompt:(f)=>`Write investor/partner pitch materials for House of Books. Stage: ${f.stage}. Pitch for: ${f.ask}.

EXECUTIVE SUMMARY (250 words):
Problem, solution, market, traction (or early signals), why now, why us, ask.

MARKET ANALYSIS:
- TAM: Global book/reading market (include real numbers)
- SAM: Digital book summary/learning apps addressable
- SOM: Realistic 3-year target with assumptions
- Market trends supporting the timing

ONE-PAGE PITCH DECK OUTLINE (10 slides):
Each slide: title + 3 bullet points of what to say

COMPETITIVE MOAT ARGUMENTS (5 specific points):
Why House of Books is hard to replicate in 1-2 sentences each

KEY METRICS TO TRACK AND PRESENT:
The 5 metrics that matter most for a book app at this stage and why

OBJECTION HANDLING:
The 4 most common investor/partner objections + sharp responses`,
  },
]

interface HistoryItem {
  task: string;
  output: string;
  ts: number;
}

function MarketingAgentModule() {
  const [selTask, setSelTask] = useState(MARKETING_TASKS[0])
  const [fieldVals, setFieldVals] = useState<Record<string, string>>({})
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Initialize field values when task changes
  useEffect(() => {
    const defaults: Record<string, string> = {}
    selTask.fields.forEach(f => { defaults[f.key] = f.default })
    setFieldVals(defaults)
    setOutput("")
  }, [selTask.id])

  const generate = async () => {
    setLoading(true); setOutput("")
    try {
      const prompt = selTask.prompt(fieldVals)
      const result = await askAI(prompt, `You are an expert copywriter and marketing strategist for SaaS products. You write production-ready copy that converts. Be specific, complete, and professional. Write full copy — not outlines or placeholders. Every section should be genuinely usable as-is.`)
      setOutput(result)
      setHistory(prev => [{ task: selTask.label, output: result, ts: Date.now() }, ...prev.slice(0,9)])
    } catch(e) { setOutput(`Error: ${(e as Error).message}`) }
    setLoading(false)
  }

  return (
    <div>
      <Title icon="🎯" title="Marketing Agent" sub="Writes production-ready copy — not advice, actual words you can use today" />

      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16 }}>
        {/* Task selector */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:4 }}>Choose Task</div>
          {MARKETING_TASKS.map(task => (
            <motion.button key={task.id} whileHover={{ x:2 }} onClick={() => setSelTask(task)}
              style={{ padding:"11px 13px", borderRadius:9, cursor:"pointer", textAlign:"left", background:selTask.id===task.id?GD:SF, border:`1px solid ${selTask.id===task.id?G:GB}`, transition:"all .2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontSize:15 }}>{task.icon}</span>
                <span style={{ fontSize:11, color:selTask.id===task.id?G:TX, fontWeight:selTask.id===task.id?700:400 }}>{task.label}</span>
              </div>
              <div style={{ fontSize:9, color:TM, paddingLeft:23, lineHeight:1.4 }}>{task.desc}</div>
            </motion.button>
          ))}

          {/* History */}
          {history.length > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:9, color:TM, letterSpacing:".1em", textTransform:"uppercase", marginBottom:6 }}>Recent Outputs</div>
              {history.slice(0,4).map((h,i) => (
                <div key={i} style={{ padding:"6px 10px", borderRadius:6, background:SF, border:`1px solid ${GB}`, marginBottom:4, cursor:"pointer", fontSize:9, color:TM }} onClick={() => setOutput(h.output)}>
                  {h.task} <span style={{ opacity:.5 }}>— click to restore</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card>
            <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", marginBottom:12 }}>
              {selTask.icon} {selTask.label} — Customize Inputs
            </div>
            {selTask.fields.map(f => (
              <Textarea key={f.key} label={f.label} value={fieldVals[f.key]||f.default} onChange={(v: string)=>setFieldVals(p=>({...p,[f.key]:v}))} rows={2} />
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <AIBtn onClick={generate} loading={loading} label={`✦ Generate ${selTask.label}`} />
              {output && <CopyBtn text={output} />}
            </div>
          </Card>

          {/* Output */}
          {(output || loading) && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}>
              <Card style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ fontSize:9, color:G, letterSpacing:".12em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:GRN, display:"inline-block", animation:"pulse 2s infinite" }}/>
                    Generated Copy · Ready to Use
                  </div>
                  {output && <div style={{ display:"flex", gap:8 }}>
                    <CopyBtn text={output} />
                    <button onClick={()=>setOutput("")} style={{ padding:"4px 8px", background:"transparent", border:`1px solid ${GB}`, borderRadius:4, fontSize:8, color:TM, cursor:"pointer", letterSpacing:".07em", textTransform:"uppercase" }}>Clear</button>
                  </div>}
                </div>
                {loading
                  ? <div style={{ display:"flex", gap:4 }}>{[0,1,2].map(i=>(<motion.div key={i} style={{ width:6, height:6, borderRadius:"50%", background:G }} animate={{ y:[0,-5,0], opacity:[.4,1,.4] }} transition={{ duration:.8, repeat:Infinity, delay:i*.18 }}/>))}</div>
                  : <div style={{ fontSize:12.5, color:"rgba(232,228,217,0.88)", lineHeight:1.8, whiteSpace:"pre-wrap", maxHeight:500, overflow:"auto" }}>{output}</div>
                }
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MODULE 8 — FEEDBACK INSIGHTS
// ══════════════════════════════════════════════════════════════════════
function FeedbackInsightsModule() {
  const [insights, setInsights] = useState('')
  const [loading, setLoading] = useState(false)

  const loadInsights = async () => {
    setLoading(true)
    try {
      const data = await getAggregatedInsights()
      setInsights(data)
    } catch (e) {
      setInsights('Error loading insights')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadInsights()
  }, [])

  return (
    <div>
      <Title icon="📊" title="User Insights — Anonymized & Privacy-Safe" sub="Aggregated feedback patterns and user behavior analytics" />
      
      <div style={{
        background: 'rgba(201,168,76,0.04)',
        border: '0.5px solid rgba(201,168,76,0.2)',
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '16px',
        fontSize: '10px',
        color: '#9a9080',
        fontFamily: 'Georgia, serif'
      }}>
        🔒 No personal data is stored or displayed. All insights are aggregated from anonymous session identifiers.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: TM }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', fontSize: '24px', marginBottom: '12px' }}>
            ⟳
          </motion.div>
          <div>Loading anonymized insights...</div>
        </div>
      ) : (
        <Card>
          <div style={{ fontSize: '12px', lineHeight: '1.6', color: TX, whiteSpace: 'pre-wrap' }}>
            {insights || 'No feedback data available yet. Insights will appear as users interact with the AI features.'}
          </div>
          <button
            onClick={loadInsights}
            style={{
              marginTop: '14px',
              padding: '6px 14px',
              background: 'rgba(201,168,76,0.1)',
              border: '0.5px solid rgba(201,168,76,0.3)',
              borderRadius: '6px',
              color: G,
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif'
            }}
          >
            🔄 Refresh Insights
          </button>
        </Card>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════
const MODULES = [
  { id:"revenue",   label:"💰 Revenue",    component:RevenueModule },
  { id:"pricing",   label:"🏷️ Pricing",    component:PricingModule },
  { id:"growth",    label:"🚀 Growth",     component:GrowthModule },
  { id:"features",  label:"⚔️ Features",   component:FeatureGapModule },
  { id:"positioning",label:"🎯 Positioning",component:PositioningModule },
  { id:"content",   label:"✍️ Content",    component:ContentModule },
  { id:"feedback",  label:"📊 Feedback",   component:FeedbackInsightsModule },
  { id:"marketing",  label:"📣 Marketing Agent",component:MarketingAgentModule },
]

export default function BusinessDashboard() {
  const [active, setActive] = useState("feedback")
  const Active = MODULES.find(m=>m.id===active)?.component || MarketingAgentModule

  return (
    <div style={{ fontFamily:"Georgia, serif", background:BG, color:TX, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Stacked Display Cards */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", minHeight:220, padding:"20px 0 40px" }}>
        <div style={{ display:"grid", gridTemplateAreas:"'stack'", placeItems:"start center", width:360 }}>
          <div style={{ gridArea:"stack", width:340, height:128, borderRadius:16, border:"1px solid " + GB, background:SURFACE, padding:"1.1rem 1.4rem", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", cursor:"pointer", transition:"transform .4s cubic-bezier(.4,0,.2,1), filter .4s, borderColor .3s", transform:"skewY(-6deg) translateY(0)", filter:"grayscale(90%) brightness(.7)", zIndex:1 }}>
            <div style={{ position:"absolute", right:0, top:0, width:"45%", height:"100%", background:"linear-gradient(to left, " + BG + ", transparent)", pointerEvents:"none" }}></div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:GD, border:"0.5px solid " + GB, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>📖</div>
              <span style={{ fontFamily:"'Playfair Display', serif", fontSize:15, color:G }}>Philosophy Club</span>
            </div>
            <div style={{ fontSize:13, color:TX, lineHeight:1.4 }}>Deep dives into stoicism, existentialism & more</div>
            <div style={{ fontSize:11, color:TM }}>128 members · Active now</div>
          </div>
          <div style={{ gridArea:"stack", width:340, height:128, borderRadius:16, border:"1px solid " + GB, background:SURFACE, padding:"1.1rem 1.4rem", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", cursor:"pointer", transition:"transform .4s cubic-bezier(.4,0,.2,1), filter .4s, borderColor .3s", transform:"skewY(-6deg) translateX(44px) translateY(28px)", filter:"grayscale(55%) brightness(.85)", zIndex:2 }}>
            <div style={{ position:"absolute", right:0, top:0, width:"45%", height:"100%", background:"linear-gradient(to left, " + BG + ", transparent)", pointerEvents:"none" }}></div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:GD, border:"0.5px solid " + GB, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🌍</div>
              <span style={{ fontFamily:"'Playfair Display', serif", fontSize:15, color:G }}>World Literature</span>
            </div>
            <div style={{ fontSize:13, color:TX, lineHeight:1.4 }}>Books from 15+ countries, 10+ languages</div>
            <div style={{ fontSize:11, color:TM }}>94 members · 3 reading now</div>
          </div>
          <div style={{ gridArea:"stack", width:340, height:128, borderRadius:16, border:"1px solid " + GB, background:SURFACE, padding:"1.1rem 1.4rem", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", cursor:"pointer", transition:"transform .4s cubic-bezier(.4,0,.2,1), filter .4s, borderColor .3s", transform:"skewY(-6deg) translateX(88px) translateY(56px)", filter:"none", zIndex:3 }}>
            <div style={{ position:"absolute", right:0, top:0, width:"45%", height:"100%", background:"linear-gradient(to left, " + BG + ", transparent)", pointerEvents:"none" }}></div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:GD, border:"0.5px solid " + GB, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🚀</div>
              <span style={{ fontFamily:"'Playfair Display', serif", fontSize:15, color:G }}>Sci-Fi Readers</span>
            </div>
            <div style={{ fontSize:13, color:TX, lineHeight:1.4 }}>Classic and modern science fiction picks</div>
            <div style={{ fontSize:11, color:TM }}>67 members · New chapter dropped</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ background:"rgba(8,8,14,0.55)", borderBottom:`1px solid ${GB}`, padding:"11px 20px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:31, height:31, border:`1px solid ${G}`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, background:GD }}>📊</div>
            <div>
              <div style={{ fontFamily:"Georgia, serif", fontSize:"1rem", fontWeight:700, color:G, letterSpacing:".06em" }}>House of Books</div>
              <div style={{ fontSize:7.5, color:TM, letterSpacing:".14em", textTransform:"uppercase" }}>Business Intelligence Platform · DeepSeek AI · 7 Modules</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:GRN, animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:8, color:TM, letterSpacing:".08em" }}>AI READY · DEEPSEEK</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid #ffd700`, overflowX:"auto", flexShrink:0, background:"rgba(8,8,14,0.55)" }}>
        {MODULES.map(mod=>(
          <button key={mod.id} onClick={()=>setActive(mod.id)}
            style={{ padding:"9px 15px", fontSize:10.5, cursor:"pointer", fontFamily:"Georgia,serif", background:"transparent", border:"none", borderBottom:`2px solid ${active===mod.id?"#ffd700":"transparent"}`, color:active===mod.id?"#ffd700":"#333", transition:"all .2s", flexShrink:0, letterSpacing:".03em", whiteSpace:"nowrap", fontWeight:mod.id==="marketing"?700:400 }}>
            {mod.label}
            {mod.id==="marketing"&&<span style={{ marginLeft:5, fontSize:7, background:"#ffd700", color:"#f8f8f8", padding:"1px 5px", borderRadius:3, verticalAlign:"middle", fontWeight:700 }}>NEW</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:"auto", padding:"22px 22px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity:0, y:7 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:.17 }}>
            <Active />
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Crimson+Pro:wght@300;400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0 }
        
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input[type=number]::-webkit-inner-spin-button{opacity:.35}
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 1rem 0.75rem !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .dashboard-title {
            font-size: 1.4rem !important;
          }
          
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
            padding: 0 0.75rem !important;
          }
          
          .module-card {
            padding: 1rem !important;
            border-radius: 12px !important;
          }
          
          .module-title {
            font-size: 1.1rem !important;
          }
          
          .input-group {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          
          .input-group input, .input-group select {
            width: 100% !important;
          }
          
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          
          .stat-card {
            padding: 1rem !important;
            text-align: center !important;
          }
          
          .stat-value {
            font-size: 1.5rem !important;
          }
          
          .stat-label {
            font-size: 12px !important;
          }
          
          .table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          .action-buttons {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .btn-primary, .btn-secondary {
            width: 100% !important;
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
