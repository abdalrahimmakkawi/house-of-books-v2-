/**
 * Minerva, the companion — always on screen, and you can actually talk to her.
 *
 * Three things make a mascot feel alive rather than decorative:
 *   1. She ARRIVES. She flies in from off-screen with her wings beating, then
 *      settles and folds them. She is never just suddenly present.
 *   2. She has something to say ABOUT YOU. Every opening line is derived from
 *      real state — the book you left at 42%, the streak about to lapse. If
 *      nothing is true, she says nothing and just breathes.
 *   3. She TALKS BACK. Tapping her opens a real conversation on /api/chat, and
 *      she thinks and speaks with the same state machine the book chat uses,
 *      so her beak moves while the answer types out.
 *
 * Free-chat allowance is enforced by the host via `chatAllowed` / `noteChatUse`
 * so this panel can never become a way around the paywall.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import Minerva, { type MinervaState } from './Minerva'

type Msg = { role: 'user' | 'assistant'; content: string }
type Nudge = { id: string; text: string; cta?: string; onCta?: () => void; urgent?: boolean }

const CSS = `
.hobComp{position:fixed;bottom:18px;z-index:60;display:flex;align-items:flex-end;gap:10px;
  font-family:Georgia,serif;pointer-events:none}
.hobComp.ltr{right:18px;flex-direction:row-reverse}
.hobComp.rtl{left:18px;flex-direction:row}
.hobComp > *{pointer-events:auto}

/* ── the arrival ───────────────────────────────────────────────
   She comes in from off-screen on a shallow arc, overshoots a little,
   then settles — the overshoot is what stops it looking like a slide. */
.hobComp-float{animation:hobCompFloat 3.8s ease-in-out infinite}
.hobComp.arriving .hobComp-float{animation:hobCompFlyIn 1.15s cubic-bezier(.28,.9,.32,1.06) both}
.hobComp.rtl.arriving .hobComp-float{animation-name:hobCompFlyInRtl}
@keyframes hobCompFlyIn{
  0%{transform:translate(150px,-90px) rotate(11deg) scale(.72);opacity:0}
  35%{opacity:1}
  70%{transform:translate(-10px,8px) rotate(-4deg) scale(1.05)}
  100%{transform:none;opacity:1}}
@keyframes hobCompFlyInRtl{
  0%{transform:translate(-150px,-90px) rotate(-11deg) scale(.72);opacity:0}
  35%{opacity:1}
  70%{transform:translate(10px,8px) rotate(4deg) scale(1.05)}
  100%{transform:none;opacity:1}}
/* the resting breath — small enough to read as alive, not as motion */
@keyframes hobCompFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}

.hobComp-owl{background:none;border:none;padding:0;cursor:pointer;position:relative;
  filter:drop-shadow(0 6px 14px rgba(0,0,0,.45));transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.hobComp-owl:hover{transform:scale(1.06)}
.hobComp-owl:active{transform:scale(.96)}
.hobComp-owl.pulse::after{content:'';position:absolute;inset:-6px;border-radius:50%;
  border:2px solid rgba(201,168,76,.55);animation:hobCompPulse 2.4s ease-out infinite}
@keyframes hobCompPulse{0%{transform:scale(.85);opacity:.9}70%{transform:scale(1.25);opacity:0}100%{opacity:0}}

.hobComp-bubble{max-width:250px;background:rgba(20,17,12,.97);color:#e8e4d9;
  border:1px solid rgba(201,168,76,.34);border-radius:15px;padding:11px 13px;
  font-size:13px;line-height:1.55;box-shadow:0 10px 30px -10px rgba(0,0,0,.8);
  animation:hobCompIn .3s cubic-bezier(.34,1.56,.64,1) both;position:relative}
@keyframes hobCompIn{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}
.hobComp-cta{margin-top:9px;display:block;width:100%;background:linear-gradient(180deg,#e0be6f,#c9a84c);
  color:#17130c;border:none;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:600;
  font-family:Georgia,serif;cursor:pointer}
.hobComp-cta:active{transform:translateY(1px)}
.hobComp-x{position:absolute;top:-9px;background:#2a2419;color:#9a9080;border:1px solid rgba(201,168,76,.3);
  width:21px;height:21px;border-radius:50%;font-size:12px;line-height:1;cursor:pointer;padding:0;z-index:2}
.hobComp.ltr .hobComp-x{right:-9px}
.hobComp.rtl .hobComp-x{left:-9px}
.hobComp-caret{display:inline-block;width:2px;height:1em;background:#c9a84c;margin-left:2px;
  vertical-align:text-bottom;animation:hobCompCaret 1s step-end infinite}
@keyframes hobCompCaret{50%{opacity:0}}

/* ── the conversation ─────────────────────────────────────── */
.hobComp-chat{width:300px;max-width:78vw;background:rgba(16,14,10,.985);
  border:1px solid rgba(201,168,76,.34);border-radius:16px;overflow:hidden;
  box-shadow:0 20px 50px -16px rgba(0,0,0,.9);animation:hobCompIn .3s cubic-bezier(.34,1.56,.64,1) both;
  position:relative;display:flex;flex-direction:column}
.hobComp-chat-head{padding:9px 12px;border-bottom:1px solid rgba(201,168,76,.18);
  font-size:12px;color:#c9a84c;letter-spacing:.04em}
.hobComp-log{padding:11px 12px;display:flex;flex-direction:column;gap:9px;
  max-height:270px;overflow-y:auto}
.hobComp-msg{font-size:12.5px;line-height:1.55;padding:8px 11px;border-radius:13px;max-width:88%}
.hobComp-msg.her{background:rgba(255,255,255,.05);color:#e8e4d9;align-self:flex-start;border-bottom-left-radius:4px}
.hobComp-msg.you{background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.26);
  color:#ffdf9e;align-self:flex-end;border-bottom-right-radius:4px}
.hobComp-form{display:flex;gap:7px;padding:9px 10px;border-top:1px solid rgba(201,168,76,.18)}
.hobComp-in{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.26);
  border-radius:10px;padding:8px 10px;color:#e8e4d9;font-family:Georgia,serif;font-size:12.5px;outline:none}
.hobComp-in:focus{border-color:#c9a84c}
.hobComp-send{background:linear-gradient(180deg,#e0be6f,#c9a84c);color:#17130c;border:none;
  border-radius:10px;width:36px;flex-shrink:0;font-size:15px;cursor:pointer}
.hobComp-send:disabled{opacity:.45;cursor:default}

@media (max-width:640px){.hobComp{bottom:14px}.hobComp.ltr{right:12px}.hobComp.rtl{left:12px}
  .hobComp-bubble{max-width:min(62vw,230px);font-size:12.5px}
  .hobComp-chat{width:min(76vw,290px)}.hobComp-log{max-height:210px}}
@media (prefers-reduced-motion:reduce){
  .hobComp-float,.hobComp.arriving .hobComp-float{animation:none}
  .hobComp-bubble,.hobComp-chat{animation:none}
  .hobComp-owl.pulse::after{animation:none}.hobComp-caret{animation:none}}
`

let cssDone = false
function injectCSS() {
  if (cssDone || typeof document === 'undefined') return
  cssDone = true
  const el = document.createElement('style')
  el.id = 'hob-minerva-companion-css'
  el.textContent = CSS
  document.head.appendChild(el)
}

const LINES: Record<string, Record<string, string>> = {
  en: {
    resume: "You're {pct}% through {title}. Shall we finish it?",
    resumeCta: 'Keep reading',
    streak: '{n} days in a row. I like your consistency.',
    streakRisk: "Your {n}-day streak is still alive. One chapter keeps it that way.",
    firstTime: "I'm Minerva. I've read all of these — ask me anything.",
    emptyShelf: "Tap the bookmark on a book and I'll keep it on your shelf.",
    welcomeBack: 'Good to see you again. Shall we find something?',
    browsing: 'Anything catching your eye? I can summarise before you commit.',
    premiumTease: 'The whole library opens up with Premium — 300 more waiting.',
    idle: "I'll be here. Tap me if you want a recommendation.",
    chatHead: '✦ Talking with Minerva',
    placeholder: 'Ask me anything…',
    thinking: 'Thinking…',
    offline: "I couldn't reach my books just now. Try again in a moment?",
    limit: "That's all the free chats for now — they reset every 6 hours.",
  },
  ar: {
    resume: 'أنجزت {pct}% من {title}. هل نكملها؟',
    resumeCta: 'أكمل القراءة',
    streak: '{n} أيام متتالية. يعجبني التزامك.',
    streakRisk: 'سلسلتك {n} أيام ما زالت قائمة. فصل واحد يكفي للحفاظ عليها.',
    firstTime: 'أنا مينرفا. قرأت كل هذه الكتب — اسألني أي شيء.',
    emptyShelf: 'اضغط على الإشارة المرجعية وسأحفظ الكتاب في رفّك.',
    welcomeBack: 'سعيدة برؤيتك مجددًا. هل نبحث عن شيء؟',
    browsing: 'هل لفت انتباهك شيء؟ أستطيع تلخيصه قبل أن تبدأ.',
    premiumTease: 'المكتبة كاملة تُفتح مع Premium — 300 كتاب بانتظارك.',
    idle: 'سأكون هنا. اضغط عليّ إن أردت ترشيحًا.',
    chatHead: '✦ محادثة مع مينرفا',
    placeholder: 'اسألني أي شيء…',
    thinking: 'أفكر…',
    offline: 'لم أستطع الوصول إلى كتبي الآن. جرّب بعد قليل؟',
    limit: 'انتهت المحادثات المجانية — تتجدد كل 6 ساعات.',
  },
  fr: {
    resume: 'Vous avez lu {pct}% de {title}. On le termine ?',
    resumeCta: 'Continuer',
    streak: '{n} jours d’affilée. J’aime votre constance.',
    streakRisk: 'Votre série de {n} jours tient encore. Un chapitre suffit.',
    firstTime: 'Je suis Minerva. Je les ai tous lus — demandez-moi.',
    emptyShelf: 'Touchez le marque-page et je le garde sur votre étagère.',
    welcomeBack: 'Ravie de vous revoir. On cherche quelque chose ?',
    browsing: 'Quelque chose vous attire ? Je peux le résumer avant.',
    premiumTease: 'Toute la bibliothèque s’ouvre avec Premium — 300 de plus.',
    idle: 'Je reste ici. Touchez-moi pour une recommandation.',
    chatHead: '✦ Conversation avec Minerva',
    placeholder: 'Posez-moi une question…',
    thinking: 'Je réfléchis…',
    offline: "Je n'ai pas pu joindre mes livres. Réessayez dans un instant ?",
    limit: 'Plus de chats gratuits pour l’instant — ils reviennent toutes les 6 h.',
  },
  es: {
    resume: 'Llevas el {pct}% de {title}. ¿Lo terminamos?',
    resumeCta: 'Seguir leyendo',
    streak: '{n} días seguidos. Me gusta tu constancia.',
    streakRisk: 'Tu racha de {n} días sigue viva. Un capítulo la mantiene.',
    firstTime: 'Soy Minerva. Los he leído todos — pregúntame lo que quieras.',
    emptyShelf: 'Toca el marcador y lo guardo en tu estantería.',
    welcomeBack: 'Me alegra verte otra vez. ¿Buscamos algo?',
    browsing: '¿Algo te llama la atención? Puedo resumirlo antes.',
    premiumTease: 'La biblioteca entera se abre con Premium — 300 más.',
    idle: 'Estaré aquí. Tócame si quieres una recomendación.',
    chatHead: '✦ Hablando con Minerva',
    placeholder: 'Pregúntame lo que sea…',
    thinking: 'Pensando…',
    offline: 'No pude alcanzar mis libros ahora. ¿Lo intentamos en un momento?',
    limit: 'Se acabaron los chats gratis — se renuevan cada 6 horas.',
  },
  zh: {
    resume: '《{title}》你已读了 {pct}%。要读完吗？',
    resumeCta: '继续阅读',
    streak: '连续 {n} 天了，我喜欢你的坚持。',
    streakRisk: '你的 {n} 天连续记录还在。读一章就能保住。',
    firstTime: '我是密涅瓦。这些书我都读过——随便问我。',
    emptyShelf: '点一下书签，我就把它放进你的书架。',
    welcomeBack: '很高兴再次见到你。要找点什么吗？',
    browsing: '有什么吸引你吗？我可以先帮你总结。',
    premiumTease: '升级 Premium 可解锁整个书库——还有 300 本。',
    idle: '我在这儿。想要推荐就点我。',
    chatHead: '✦ 与密涅瓦对话',
    placeholder: '问我任何问题…',
    thinking: '思考中…',
    offline: '我现在联系不上我的书。稍后再试？',
    limit: '免费对话已用完——每 6 小时重置。',
  },
}

const SEEN_KEY = 'hob_minerva_seen'
const SPOKE_KEY = 'hob_minerva_spoke'
const ASKED_KEY = 'hob_minerva_asked'   // titles already logged, so we don't spam the inbox

export type LibBook = { id: string; title: string; author?: string; category?: string }

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

/* The chat API caps systemPrompt at 1500 chars, so 300 books cannot be pasted
   in. Instead the catalogue is searched HERE, on the client, where the whole
   list already lives — and only the two or three books the reader actually
   mentioned are sent along as facts. Retrieval, not stuffing. */
function findInLibrary(message: string, books: LibBook[]): LibBook[] {
  const m = norm(message)
  if (!m) return []
  const hits: { b: LibBook; score: number }[] = []
  for (const b of books) {
    const t = norm(b.title)
    if (!t) continue
    let score = 0
    if (m.includes(t)) score = 100 + t.length          // whole title appears
    else if (t.split(' ').length === 1 && new RegExp(`\\b${t}\\b`).test(m)) score = 80
    else {
      const words = t.split(' ').filter(w => w.length > 3)
      const hit = words.filter(w => new RegExp(`\\b${w}\\b`).test(m)).length
      if (words.length && hit === words.length) score = 60 + t.length
    }
    const a = norm(b.author || '')
    if (!score && a && a.length > 5 && m.includes(a)) score = 40
    if (score) hits.push({ b, score })
  }
  return hits.sort((x, y) => y.score - x.score).slice(0, 3).map(h => h.b)
}

/* Did they ask about a BOOK we don't have? Pull the likely title out so she can
   name it back to them and we can log the request. */
function guessRequestedTitle(message: string): string | null {
  const quoted = message.match(/["“”'‘’]([^"“”'‘’]{2,60})["“”'‘’]/)
  if (quoted) return quoted[1].trim()
  const phrase = message.match(/\b(?:book|read|title)\s+(?:called|named|titled)\s+([^?.,!]{2,60})/i)
    || message.match(/\b(?:do you have|got|find|looking for|is there)\s+([^?.,!]{2,60})/i)
  return phrase ? phrase[1].trim().replace(/^(the book|a book|any)\s+/i, '') : null
}

const BOOKISH = /\b(book|read|have|find|where|got|available|looking for|recommend|title)\b/i

export default function MinervaCompanion({
  lang, streak, inProgress, shelfCount, isPremium, onOpenBook,
  chatAllowed, noteChatUse, books = [], sections = [],
}: {
  lang: { id: string; dir: string }
  streak: number
  inProgress: { id: string; title: string; progress: number }[]
  shelfCount: number
  isPremium: boolean
  onOpenBook: (bookId: string) => void
  /** the whole catalogue, searched client-side so she answers from real data */
  books?: LibBook[]
  sections?: string[]
  /** host decides whether a free chat remains — keeps the paywall in one place */
  chatAllowed: () => boolean
  noteChatUse: () => void
}) {
  const L = LINES[lang.id] || LINES.en
  const fill = (s: string, v: Record<string, string | number>) =>
    Object.keys(v).reduce((acc, k) => acc.split(`{${k}}`).join(String(v[k])), s)

  const nudges = useMemo<Nudge[]>(() => {
    const out: Nudge[] = []
    const furthest = [...inProgress].filter(b => b.progress > 0 && b.progress < 100)
      .sort((a, b) => b.progress - a.progress)[0]
    if (furthest) out.push({
      id: 'resume', text: fill(L.resume, { pct: furthest.progress, title: furthest.title }),
      cta: L.resumeCta, onCta: () => onOpenBook(furthest.id), urgent: true,
    })
    if (streak >= 2) out.push({ id: 'streak', text: fill(furthest ? L.streakRisk : L.streak, { n: streak }) })
    if (shelfCount === 0) out.push({ id: 'shelf', text: L.emptyShelf })
    if (!localStorage.getItem(SEEN_KEY)) out.push({ id: 'hello', text: L.firstTime, urgent: true })
    else if (!furthest && streak < 2) out.push({ id: 'back', text: L.welcomeBack })
    if (!isPremium) out.push({ id: 'premium', text: L.premiumTease })
    out.push({ id: 'browse', text: L.browsing })
    out.push({ id: 'idle', text: L.idle })
    return out
  }, [inProgress, streak, shelfCount, isPremium, lang.id])

  const [visible, setVisible] = useState(false)
  const [arriving, setArriving] = useState(true)
  const [open, setOpen] = useState(false)
  const [chatting, setChatting] = useState(false)
  const [at, setAt] = useState(0)
  const [typed, setTyped] = useState('')
  const [state, setState] = useState<MinervaState>('flying')
  const [log, setLog] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const typing = useRef<number | null>(null)
  const logEnd = useRef<HTMLDivElement>(null)

  const nudge = nudges[Math.min(at, nudges.length - 1)]

  useEffect(() => {
    injectCSS()
    const alreadySpoke = sessionStorage.getItem(SPOKE_KEY) === '1'
    setVisible(true)
    // wings beat for the length of the flight, then she folds them and settles
    const land = setTimeout(() => { setArriving(false); setState('idle') }, 1150)
    const talk = setTimeout(() => {
      if (!alreadySpoke) { sessionStorage.setItem(SPOKE_KEY, '1'); say(0) }
    }, 1400)
    return () => { clearTimeout(land); clearTimeout(talk) }
  }, [])

  useEffect(() => () => { if (typing.current) clearInterval(typing.current) }, [])
  useEffect(() => { logEnd.current?.scrollIntoView({ block: 'nearest' }) }, [log, busy])

  /* Type a line out while she is `speaking`, so her beak moves with it. */
  function reveal(text: string, done?: () => void) {
    setTyped(''); setState('speaking')
    if (typing.current) clearInterval(typing.current)
    let i = 0
    typing.current = window.setInterval(() => {
      i++
      setTyped(text.slice(0, i))
      if (i >= text.length) {
        if (typing.current) clearInterval(typing.current)
        typing.current = null
        setState('idle')
        done?.()
      }
    }, 24)
  }

  function say(index: number) {
    const line = nudges[Math.min(index, nudges.length - 1)]
    if (!line) return
    setAt(index); setOpen(true)
    reveal(line.text, () => localStorage.setItem(SEEN_KEY, '1'))
  }

  /* A book we don't stock, asked for by name, is the most useful signal this
     app can collect. Log it to the same feedback inbox the admin already
     reads, once per title per device so the inbox stays readable. */
  function logBookRequest(title: string, context: string) {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(ASKED_KEY) || '[]')
      const key = norm(title)
      if (!key || seen.includes(key)) return
      localStorage.setItem(ASKED_KEY, JSON.stringify([...seen, key].slice(-50)))
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'feature',
          source: 'app',
          message: `📚 Book request via Minerva: "${title}"\n\nAsked as: ${context.slice(0, 300)}`,
          pageUrl: location.href,
        }),
      }).catch(() => {})   // a failed log must never interrupt the conversation
    } catch {}
  }

  /* ── talking to her ─────────────────────────────────────────── */
  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    if (!chatAllowed()) { setLog(l => [...l, { role: 'user', content }, { role: 'assistant', content: L.limit }]); setDraft(''); return }
    noteChatUse()
    const next: Msg[] = [...log, { role: 'user', content }]
    setLog(next); setDraft(''); setBusy(true); setState('thinking')

    /* Look the catalogue up before she answers, so she speaks from the real
       library instead of from whatever the model half-remembers. */
    const found = findInLibrary(content, books)
    let facts = ''
    if (found.length) {
      facts = 'IN THIS LIBRARY: ' + found
        .map(b => `"${b.title}"${b.author ? ` by ${b.author}` : ''} — ${b.category || 'Uncategorised'} section`)
        .join('; ') + '. Tell them it is here and name the section.'
    } else if (BOOKISH.test(content)) {
      const wanted = guessRequestedTitle(content)
      facts = `NOT IN THIS LIBRARY${wanted ? `: "${wanted}"` : ''}. Say plainly that we do not have it yet, ` +
        'and that it has been noted and will be added because they asked for it. Do not invent a section for it. ' +
        `Sections available: ${sections.join(', ')}.`
      if (wanted) logBookRequest(wanted, content)
    }
    // Without this she sits on "Thinking…" forever if the request hangs —
    // a stuck mascot is worse than one that admits it lost the connection.
    const ctl = new AbortController()
    const bail = setTimeout(() => ctl.abort(), 20000)
    try {
      const res = await fetch('/api/chat', {
        signal: ctl.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          systemPrompt: (
            'You are Minerva, the owl who is the reading companion inside House of Books, ' +
            'an app of 300+ book summaries. Warm, wry and brief — a friend who reads constantly, ' +
            'never an assistant. Two to four sentences, no preamble, no disclaimers. ' +
            `Reply in the user's language (${lang.id}). ` +
            'Only claim a book is in the library if the note below says so. ' + facts
          ).slice(0, 1490),   // the API truncates at 1500; keep the facts intact
        }),
      })
      const data = await res.json()
      clearTimeout(bail)
      const answer = String(data.content || L.offline)
      setBusy(false)
      setLog(l => [...l, { role: 'assistant', content: '' }])
      // stream her reply into the last bubble while the beak moves
      let i = 0
      setState('speaking')
      if (typing.current) clearInterval(typing.current)
      typing.current = window.setInterval(() => {
        i++
        setLog(l => l.map((m, k) => k === l.length - 1 ? { ...m, content: answer.slice(0, i) } : m))
        if (i >= answer.length) {
          if (typing.current) clearInterval(typing.current)
          typing.current = null
          setState('idle')
        }
      }, 16)
    } catch {
      clearTimeout(bail)
      setBusy(false); setState('idle')
      setLog(l => [...l, { role: 'assistant', content: L.offline }])
    }
  }

  if (!visible) return null

  /* The × closes what she is saying — it does not send her away. She is meant
     to be a permanent presence, so there is always an owl to tap. */
  const closeBubble = () => { setOpen(false); setChatting(false) }

  const tapOwl = () => {
    if (chatting) { setChatting(false); return }
    if (!open) { say(at); return }
    // second tap on an open bubble opens the conversation
    setState('delighted')
    setTimeout(() => {
      setChatting(true); setOpen(false)
      if (log.length === 0 && nudge) setLog([{ role: 'assistant', content: nudge.text }])
      setState('idle')
    }, 380)
  }

  return (
    <div className={`hobComp ${lang.dir === 'rtl' ? 'rtl' : 'ltr'}${arriving ? ' arriving' : ''}`}>
      <div className="hobComp-float">
        <button
          className={`hobComp-owl${!open && !chatting && nudge?.urgent ? ' pulse' : ''}`}
          aria-label="Minerva"
          onClick={tapOwl}
        >
          <Minerva size={58} state={state} />
        </button>
      </div>

      {open && !chatting && nudge && (
        <div className="hobComp-bubble">
          <button className="hobComp-x" onClick={closeBubble} aria-label="Close">×</button>
          {typed}
          {state === 'speaking' && <i className="hobComp-caret" />}
          {nudge.cta && state !== 'speaking' && (
            <button className="hobComp-cta" onClick={nudge.onCta}>{nudge.cta}</button>
          )}
          {state !== 'speaking' && (
            <button className="hobComp-cta" style={{ background: 'transparent', border: '1px solid rgba(201,168,76,.4)', color: '#c9a84c' }}
              onClick={tapOwl}>{L.placeholder}</button>
          )}
        </div>
      )}

      {chatting && (
        <div className="hobComp-chat">
          <button className="hobComp-x" onClick={() => setChatting(false)} aria-label="Close">×</button>
          <div className="hobComp-chat-head">{L.chatHead}</div>
          <div className="hobComp-log">
            {log.map((m, i) => (
              <div key={i} className={`hobComp-msg ${m.role === 'user' ? 'you' : 'her'}`}>
                {m.content}
                {state === 'speaking' && i === log.length - 1 && m.role === 'assistant' && <i className="hobComp-caret" />}
              </div>
            ))}
            {busy && <div className="hobComp-msg her">{L.thinking}</div>}
            <div ref={logEnd} />
          </div>
          <form className="hobComp-form" onSubmit={e => { e.preventDefault(); send(draft) }}>
            <input className="hobComp-in" value={draft} onChange={e => setDraft(e.target.value)}
              placeholder={L.placeholder} aria-label={L.placeholder} />
            <button className="hobComp-send" type="submit" disabled={busy || !draft.trim()}>→</button>
          </form>
        </div>
      )}
    </div>
  )
}
