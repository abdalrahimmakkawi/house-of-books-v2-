/**
 * Minerva — the owl who is the face of the AI in House of Books.
 *
 * One inline SVG. No images, no animation library, no dependencies. Every
 * state is a class on the wrapper, so using her costs one component:
 *
 *   <Minerva size={34} state={loading ? 'thinking' : streaming ? 'speaking' : 'idle'} />
 *
 * Shared machinery, not per-instance timers: a single blink clock, a single
 * pointer listener and a single mouth loop drive every owl on the page by
 * writing to their DOM directly. Twenty avatars in a thread cost one timer,
 * and none of them re-render React.
 */
import { useEffect, useRef } from 'react'

export type MinervaState = 'idle' | 'thinking' | 'speaking' | 'delighted' | 'puzzled' | 'reading' | 'flying'

const STATES: MinervaState[] = ['thinking', 'speaking', 'delighted', 'puzzled', 'reading', 'flying']
const REDUCED = typeof matchMedia !== 'undefined'
  && matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── shared stylesheet, injected once ─────────────────────────── */
const CSS = `
.hobOwl3d{--tx:0;--ty:0;display:block;flex-shrink:0;
  transform:perspective(620px) rotateY(calc(var(--tx) * 13deg)) rotateX(calc(var(--ty) * -10deg));
  transition:transform .35s cubic-bezier(.22,.68,.3,1)}
.hobOwl{display:block;overflow:visible}
.hobOwl *{transform-box:fill-box}
.hobOwl .ln{stroke:#5b4030;stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}
.hobOwl .head{transform-box:view-box;transform-origin:100px 176px;
  transition:transform .55s cubic-bezier(.34,1.56,.64,1);animation:hobSway 7s ease-in-out infinite}
@keyframes hobSway{0%,100%{rotate:-1deg}50%{rotate:1deg}}
.hobOwl .body{animation:hobBreathe 4.2s cubic-bezier(.22,.68,.3,1) infinite;transform-origin:50% 100%}
@keyframes hobBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.024) translateY(-1px)}}
.hobOwl .lid{transform-origin:50% 0%;transform:scaleY(0);transition:transform .09s ease-out}
.hobOwl.blink .lid{transform:scaleY(1)}
.hobOwl .pupil{transition:transform .5s cubic-bezier(.34,1.56,.64,1)}
.hobOwl .tuft{transition:transform .5s cubic-bezier(.34,1.56,.64,1);transform-origin:50% 100%}
.hobOwl .wing{transition:transform .55s cubic-bezier(.34,1.56,.64,1)}
.hobOwl .wing-l{transform-origin:100% 18%}
.hobOwl .wing-r{transform-origin:0% 18%}
.hobOwl .face,.hobOwl .ground{transition:transform .3s cubic-bezier(.22,.68,.3,1)}
.hobOwl .cheek{opacity:.4;transition:opacity .4s}
.hobOwl .eye-happy{opacity:0;transition:opacity .25s}
.hobOwl .eye-open{transition:opacity .25s}
.hobOwl .glow{opacity:0;transition:opacity .7s cubic-bezier(.22,.68,.3,1)}
/* mouth: two mandibles on a hinge with a throat behind, driven by --mouth */
.hobOwl .beak{--mouth:0}
.hobOwl .beak-lower{transform:translateY(calc(var(--mouth) * 4.2px));transform-origin:50% 0%}
.hobOwl .throat{transform:scaleY(calc(.08 + var(--mouth) * .92));transform-origin:50% 0%;
  opacity:calc(.35 + var(--mouth) * .65)}
.hobOwl.thinking .head{transform:rotate(-6deg);animation:none}
.hobOwl.thinking .pupil{transform:translate(2px,-5px)}
.hobOwl.thinking .tuft{transform:rotate(-9deg)}
.hobOwl.thinking .glow{opacity:.6}
.hobOwl.speaking .head{animation:hobNod 1.9s cubic-bezier(.22,.68,.3,1) infinite}
@keyframes hobNod{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-3px) rotate(1.5deg)}}
.hobOwl.delighted .wing-l{transform:rotate(-36deg) translateY(-6px)}
.hobOwl.delighted .wing-r{transform:rotate(36deg) translateY(-6px)}
.hobOwl.delighted .tuft{transform:rotate(-14deg) scaleY(1.15)}
.hobOwl.delighted .head{animation:hobHop .75s cubic-bezier(.34,1.56,.64,1)}
@keyframes hobHop{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}}
.hobOwl.delighted .eye-open{opacity:0}
.hobOwl.delighted .eye-happy{opacity:1}
.hobOwl.delighted .cheek{opacity:.85}
.hobOwl.puzzled .head{transform:rotate(9deg);animation:none}
.hobOwl.puzzled .pupil{transform:translate(-3px,2px)}
.hobOwl.puzzled .tuft-r{transform:rotate(17deg)}
.hobOwl.reading .head{transform:rotate(3deg) translateY(2px);animation:none}
.hobOwl.reading .pupil{transform:translate(0,5px)}
/* in flight: wings beat, tufts stream back, feet tuck up */
.hobOwl.flying .wing-l{animation:hobFlapL .3s ease-in-out infinite;transition:none}
.hobOwl.flying .wing-r{animation:hobFlapR .3s ease-in-out infinite;transition:none}
@keyframes hobFlapL{0%,100%{transform:rotate(-14deg) translateY(0)}50%{transform:rotate(-56deg) translateY(-5px)}}
@keyframes hobFlapR{0%,100%{transform:rotate(14deg) translateY(0)}50%{transform:rotate(56deg) translateY(-5px)}}
.hobOwl.flying .head{animation:none;transform:rotate(-4deg)}
.hobOwl.flying .tuft-l{transform:rotate(-16deg)}
.hobOwl.flying .tuft-r{transform:rotate(-9deg)}
.hobOwl.flying .ground{opacity:0}
@media (prefers-reduced-motion:reduce){
  .hobOwl .body,.hobOwl .head{animation:none!important}
  .hobOwl3d,.hobOwl .face,.hobOwl .ground{transform:none!important}
}`

let cssInjected = false
function injectCSS() {
  if (cssInjected || typeof document === 'undefined') return
  cssInjected = true
  const el = document.createElement('style')
  el.id = 'hob-minerva-css'
  el.textContent = CSS
  document.head.appendChild(el)
}

/* ── shared clocks ────────────────────────────────────────────────
   Registered instances are driven by direct DOM writes. React never
   re-renders for a blink, a glance or a syllable. */
const owls = new Set<SVGSVGElement>()
let blinkTimer: number | null = null
let mouthRAF: number | null = null
let ptrRAF: number | null = null
let ptr: { x: number; y: number } | null = null

function eachOwl(fn: (o: SVGSVGElement) => void) { owls.forEach(fn) }

/* blinking — uneven on purpose; a metronome reads as a machine */
function blink() {
  eachOwl(o => o.classList.add('blink'))
  setTimeout(() => eachOwl(o => o.classList.remove('blink')), 105)
  if (Math.random() < 0.22) {
    setTimeout(() => {
      eachOwl(o => o.classList.add('blink'))
      setTimeout(() => eachOwl(o => o.classList.remove('blink')), 95)
    }, 230)
  }
  blinkTimer = window.setTimeout(blink, 2600 + Math.random() * 4200)
}

/* ── the mouth ────────────────────────────────────────────────────
   Speech is not a sine wave: each syllable gets its own length and
   depth, with real pauses between phrases. Runs only while at least
   one owl is speaking, and always lands on a closed mouth. */
type Syl = { dur: number; peak: number; gap: number }
let phrase: Syl[] = []
let phraseAt = 0
let sylStart = 0

function newSyllable(): Syl {
  const wide = Math.random() < 0.28
  return {
    dur: 105 + Math.random() * (wide ? 150 : 110),
    peak: wide ? 0.82 + Math.random() * 0.18 : 0.3 + Math.random() * 0.4,
    gap: Math.random() < 0.18 ? 130 + Math.random() * 220 : 26 + Math.random() * 50,
  }
}
function setMouth(o: SVGSVGElement, v: number) {
  o.querySelectorAll<SVGGElement>('.beak').forEach(b => b.style.setProperty('--mouth', v.toFixed(3)))
}
function mouthTick(now: number) {
  const speaking = [...owls].filter(o => o.classList.contains('speaking'))
  if (!speaking.length) { mouthRAF = null; return }
  if (!phrase.length) { phrase = Array.from({ length: 3 + Math.floor(Math.random() * 6) }, newSyllable); phraseAt = 0; sylStart = now }
  const s = phrase[phraseAt]
  const t = now - sylStart
  let v = 0
  if (t < s.dur) {
    const p = t / s.dur
    // open fast, close a little slower — a lopsided arc, like a jaw
    v = s.peak * (p < 0.38 ? Math.sin((p / 0.38) * Math.PI / 2) : Math.cos(((p - 0.38) / 0.62) * Math.PI / 2))
  } else if (t >= s.dur + s.gap) {
    sylStart = now; phraseAt++
    if (phraseAt >= phrase.length) phrase = []       // breath, then a new phrase
  }
  speaking.forEach(o => setMouth(o, v))
  mouthRAF = requestAnimationFrame(mouthTick)
}
function startMouth() { if (mouthRAF === null && !REDUCED) mouthRAF = requestAnimationFrame(mouthTick) }

/* ── she turns toward you ─────────────────────────────────────────
   Each owl measures its own distance to the cursor, so a 26px avatar
   looks at you independently of a 34px header. */
function setTilt(o: SVGSVGElement, tx: number, ty: number) {
  const box = o.parentElement
  if (box && box.classList.contains('hobOwl3d')) {
    box.style.setProperty('--tx', tx.toFixed(3))
    box.style.setProperty('--ty', ty.toFixed(3))
  }
  const face = o.querySelector('.face')
  if (face) face.setAttribute('transform', `translate(${(tx * 3.6).toFixed(2)} ${(ty * 2.4).toFixed(2)})`)
  const gnd = o.querySelector('.ground')
  if (gnd) gnd.setAttribute('transform', `translate(${(tx * 6).toFixed(2)} 0)`)
  o.querySelectorAll<SVGCircleElement>('.pupil').forEach(p => {
    p.style.transform = `translate(${(tx * 4.5).toFixed(2)}px, ${(ty * 3.5).toFixed(2)}px)`
  })
}
function applyPointer() {
  ptrRAF = null
  if (!ptr) return
  eachOwl(o => {
    const r = o.getBoundingClientRect()
    if (!r.width) return
    const reach = Math.max(r.width, 120) * 2.4
    const tx = Math.max(-1, Math.min(1, (ptr!.x - (r.left + r.width / 2)) / reach))
    const ty = Math.max(-1, Math.min(1, (ptr!.y - (r.top + r.height / 2)) / reach))
    setTilt(o, tx, ty)
  })
}
function onMove(e: PointerEvent) {
  ptr = { x: e.clientX, y: e.clientY }
  if (ptrRAF === null) ptrRAF = requestAnimationFrame(applyPointer)
}

function register(o: SVGSVGElement) {
  owls.add(o)
  if (owls.size === 1) {
    blinkTimer = window.setTimeout(blink, 1300)
    if (!REDUCED) window.addEventListener('pointermove', onMove, { passive: true })
  }
}
function unregister(o: SVGSVGElement) {
  owls.delete(o)
  if (owls.size === 0) {
    if (blinkTimer !== null) { clearTimeout(blinkTimer); blinkTimer = null }
    if (mouthRAF !== null) { cancelAnimationFrame(mouthRAF); mouthRAF = null }
    if (ptrRAF !== null) { cancelAnimationFrame(ptrRAF); ptrRAF = null }
    window.removeEventListener('pointermove', onMove)
    ptr = null
  }
}

/* ── the drawing ──────────────────────────────────────────────── */
export default function Minerva({
  size = 32,
  state = 'idle',
  perch = false,
  title,
  className = '',
  style,
}: {
  size?: number
  state?: MinervaState
  /** show the book she perches on — worth it above ~72px, clutter below */
  perch?: boolean
  title?: string
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    injectCSS()
    const o = ref.current
    if (!o) return
    register(o)
    if (ptr) applyPointer()
    return () => unregister(o)
  }, [])

  useEffect(() => {
    const o = ref.current
    if (!o) return
    STATES.forEach(s => o.classList.remove(s))
    if (state !== 'idle') o.classList.add(state)
    if (state === 'speaking') startMouth()
    else setMouth(o, 0)                                  // never freeze mid-shape
  }, [state])

  return (
    <span className="hobOwl3d" style={{ width: size, height: size, ...style }}>
      <svg
        ref={ref}
        className={`hobOwl ${className}`}
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={title || 'Minerva, your reading companion'}
      >
        <defs>
          <clipPath id="hobBellyClip"><ellipse cx="100" cy="138" rx="35" ry="32" /></clipPath>
          <radialGradient id="hobGlow">
            <stop offset="0%" stopColor="#ffdf9e" stopOpacity=".6" />
            <stop offset="100%" stopColor="#ffdf9e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hobBlush">
            <stop offset="0%" stopColor="#e87f66" stopOpacity=".7" />
            <stop offset="100%" stopColor="#e87f66" stopOpacity="0" />
          </radialGradient>
          {/* volume: light from the upper left, kept deliberately gentle */}
          <radialGradient id="hobShade" cx="34%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#fff2dc" stopOpacity=".2" />
            <stop offset="52%" stopColor="#cb9b6d" stopOpacity="0" />
            <stop offset="100%" stopColor="#6b4526" stopOpacity=".2" />
          </radialGradient>
          <radialGradient id="hobBellyShade" cx="40%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#fffaf2" stopOpacity=".28" />
            <stop offset="60%" stopColor="#f7ecdc" stopOpacity="0" />
            <stop offset="100%" stopColor="#c39a72" stopOpacity=".16" />
          </radialGradient>
          <radialGradient id="hobWing" cx="35%" cy="20%" r="85%">
            <stop offset="0%" stopColor="#ab7c50" />
            <stop offset="100%" stopColor="#8d6038" />
          </radialGradient>
          <linearGradient id="hobBeak" x1="0" y1="0" x2=".4" y2="1">
            <stop offset="0%" stopColor="#ffce8f" />
            <stop offset="100%" stopColor="#e08a2e" />
          </linearGradient>
          <radialGradient id="hobGround">
            <stop offset="0%" stopColor="#000" stopOpacity=".55" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="glow" cx="100" cy="90" r="78" fill="url(#hobGlow)" />

        <g className="body">
          <ellipse className="ground" cx="100" cy="196" rx="50" ry="6" fill="url(#hobGround)" opacity=".6" />
          {perch && (
            <g>
              <rect className="ln" x="52" y="184" width="96" height="12" rx="3" fill="#e0b45c" />
              <path className="ln" d="M52 188 h96" strokeWidth="1.6" opacity=".55" fill="none" />
            </g>
          )}
          <g stroke="#5b4030" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="#f2a34d">
            <path d="M86 168 v8 M79 184 l7-8 l7 8 M86 176 v8" />
            <path d="M114 168 v8 M107 184 l7-8 l7 8 M114 176 v8" />
          </g>

          {/* everything above the feet leans together, so she never comes apart */}
          <g className="head">
            {/* tufts sit behind the silhouette so the join never shows */}
            <path className="tuft tuft-l ln" d="M66 60 L61 38 L86 52 Z" fill="#a4744a" />
            <path className="tuft tuft-r ln" d="M134 60 L139 38 L114 52 Z" fill="#a4744a" />

            <path className="wing wing-l ln" d="M58 106 C40 114 36 144 47 159 C56 170 69 165 66 152 C59 137 57 121 58 106 Z" fill="url(#hobWing)" />
            <path className="wing wing-r ln" d="M142 106 C160 114 164 144 153 159 C144 170 131 165 134 152 C141 137 143 121 142 106 Z" fill="url(#hobWing)" />

            {/* head and body are one silhouette */}
            <path className="ln" d="M100 42 C126 42 146 60 146 84 C146 98 142 108 140 116
                                     C152 126 156 146 148 158 C138 172 120 178 100 178
                                     C80 178 62 172 52 158 C44 146 48 126 60 116
                                     C58 108 54 98 54 84 C54 60 74 42 100 42 Z" fill="#cb9b6d" />
            <path d="M100 42 C126 42 146 60 146 84 C146 98 142 108 140 116
                     C152 126 156 146 148 158 C138 172 120 178 100 178
                     C80 178 62 172 52 158 C44 146 48 126 60 116
                     C58 108 54 98 54 84 C54 60 74 42 100 42 Z" fill="url(#hobShade)" />
            <ellipse cx="76" cy="62" rx="15" ry="9" fill="#fff6e6" opacity=".13" transform="rotate(-26 76 62)" />

            <ellipse cx="100" cy="138" rx="35" ry="32" fill="#f7ecdc" />
            <ellipse cx="100" cy="138" rx="35" ry="32" fill="url(#hobBellyShade)" />
            <g clipPath="url(#hobBellyClip)" fill="none" stroke="#d8bb96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M78 118 l6 6 l6-6 M94 118 l6 6 l6-6 M110 118 l6 6 l6-6" />
              <path d="M70 132 l6 6 l6-6 M86 132 l6 6 l6-6 M102 132 l6 6 l6-6 M118 132 l6 6 l6-6" />
              <path d="M78 146 l6 6 l6-6 M94 146 l6 6 l6-6 M110 146 l6 6 l6-6" />
              <path d="M86 160 l6 6 l6-6 M102 160 l6 6 l6-6" />
            </g>

            {/* the face rides a little ahead of the turn — parallax sells a solid head */}
            <g className="face">
              {/* cream spectacles: two overlapping circles drawn as ONE outline,
                  so no seam shows where they meet */}
              <path className="ln" d="M100 69 A25 25 0 1 1 100 99 A25 25 0 1 1 100 69 Z" fill="#fbf3e6" />
              <path d="M100 69 A25 25 0 1 1 100 99 A25 25 0 1 1 100 69 Z" fill="url(#hobBellyShade)" opacity=".45" />

              {/* cheeks stay well inside the outline; further out and the soft edge
                  spills past her body and reads as a grey dot on a dark page */}
              <ellipse className="cheek" cx="72" cy="105" rx="9.5" ry="6" fill="url(#hobBlush)" />
              <ellipse className="cheek" cx="128" cy="105" rx="9.5" ry="6" fill="url(#hobBlush)" />

              <g className="eye-open">
                <circle className="ln" cx="80" cy="84" r="16" fill="#fff" />
                <circle className="ln" cx="120" cy="84" r="16" fill="#fff" />
                <circle className="pupil" cx="80" cy="84" r="9" fill="#3b2a1d" />
                <circle className="pupil" cx="120" cy="84" r="9" fill="#3b2a1d" />
                {/* one glint per eye, well inside the pupil */}
                <circle className="pupil" cx="77.4" cy="81.4" r="3.3" fill="#fff" />
                <circle className="pupil" cx="117.4" cy="81.4" r="3.3" fill="#fff" />
                <rect className="lid" x="64" y="68" width="32" height="32" rx="16" fill="#cb9b6d" />
                <rect className="lid" x="104" y="68" width="32" height="32" rx="16" fill="#cb9b6d" />
              </g>
              <g className="eye-happy" fill="none" stroke="#5b4030" strokeWidth="4.2" strokeLinecap="round">
                <path d="M69 88 q11-13 22 0" /><path d="M109 88 q11-13 22 0" />
              </g>

              <g className="beak">
                <path className="throat" d="M95 105 L105 105 L100 115 Z" fill="#8c4a3a" />
                <path className="beak-lower ln" d="M95.5 105 L104.5 105 L100 112.5 Z" fill="#d9822b" />
                <path className="beak-upper ln" d="M91 97.5 L109 97.5 L104.5 106 L95.5 106 Z" fill="url(#hobBeak)" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </span>
  )
}
