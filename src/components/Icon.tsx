import type { CSSProperties } from 'react'

// Shared line-icon vocabulary. SVGs inherit a restrained semantic accent.
const paths: Record<string, string> = {
  book: 'M4 4h6c1 0 2 1 2 2v15c0-2-2-3-4-3H3V4h1m16 0h-6c-1 0-2 1-2 2m0 15c0-2 2-3 4-3h5V4h-1',
  library: 'M4 4v16m5-16v16m5-16v16m3-15 4 14M2 20h20',
  bookmark: 'M6 3h12v18l-6-4-6 4V3z',
  science: 'M9 3h6m-5 0v6L4 19c-1 2 1 2 2 2h12c1 0 3 0 2-2L14 9V3M7 15h10',
  brain: 'M12 5c-3-5-8-1-7 3-4 1-4 7 0 8-1 5 5 7 7 3V5zm0 0c3-5 8-1 7 3 4 1 4 7 0 8 1 5-5 7-7 3M7 9l2 2m8-2-2 2M6 15h3m9 0h-3',
  philosophy: 'M4 20h16M7 20V9m5 11V9m5 11V9M3 7l9-5 9 5H3z',
  heart: 'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 5 2 10 8 15 6-5 12-10 8-15z',
  trend: 'M3 17l6-6 4 4 8-11m-7 0h7v7',
  finance: 'M12 2v20m5-16H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H6',
  briefcase: 'M8 7V3h8v4M3 7h18v14H3V7zm0 6c6 3 12 3 18 0m-10 0h2',
  user: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21v-2a8 8 0 0 1 16 0v2',
  users: 'M4 7a3 3 0 1 0 6 0 3 3 0 1 0-6 0m10 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M1 21v-3a6 6 0 0 1 12 0v3m0-7c5-3 10 1 10 4v3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18m0 4v5l4 2',
  globe: 'M3 12h18M12 3c-7 6-7 12 0 18 7-6 7-12 0-18zm0 0a9 9 0 1 0 0 18 9 9 0 1 0 0-18',
  leaf: 'M20 3C8 1 0 9 6 17s16 0 14-14zM4 21 16 9',
  waves: 'M2 6c4-5 6 5 10 0s6 5 10 0M2 12c4-5 6 5 10 0s6 5 10 0M2 18c4-5 6 5 10 0s6 5 10 0',
  sun: 'M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
  moon: 'M20 15A9 9 0 0 1 9 4 9 9 0 1 0 20 15z',
  sparkles: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7zm7 0v4m-2-2h4',
  headphones: 'M3 14v-3a9 9 0 0 1 18 0v3M3 12h4v9H3v-9zm14 0h4v9h-4v-9z',
  music: 'M9 18V5l12-2v13M9 18c0 4-7 4-7 0s7-4 7 0zm12-2c0 4-7 4-7 0s7-4 7 0',
  rain: 'M6 13a5 5 0 1 1 9-7c6-1 8 7 2 8H6m1 3-1 4m6-4-1 4m6-4-1 4',
  tree: 'm12 2-7 9h3l-5 7h18l-5-7h3L12 2zm0 16v4',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14m5 12 6 6',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10zm7 5v2',
  unlock: 'M7 10V7a5 5 0 0 1 9-3M5 10h14v11H5V10zm7 5v2',
  check: 'm5 12 4 4L20 5',
  close: 'm6 6 12 12M6 18 18 6',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z',
  play: 'm8 4 12 8-12 8V4z',
  pause: 'M8 4v16m8-16v16',
  hourglass: 'M5 3h14M5 21h14M7 3c0 6 2 7 5 9-3 2-5 3-5 9M17 3c0 6-2 7-5 9 3 2 5 3 5 9',
  arrow: 'M3 12h18m-7-7 7 7-7 7',
  mail: 'M3 5h18v14H3V5zm0 1 9 7 9-7',
  chart: 'M3 3v18h18M7 17v-5m5 5V7m5 10V4',
  settings: 'M3 7h18M3 17h18M8 4v6m8 4v6',
  bot: 'M12 2v3M5 5h14v15H5V5zM8 10h1m6 0h1m-8 5h8M2 9v7m20-7v7',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18m0 5a4 4 0 1 0 0 8 4 4 0 1 0 0-8m0 4 8-8',
  tag: 'M3 3h8l11 11-8 8L3 11V3zm4 4h.01',
  pen: 'm15 3 6 6-12 12H3v-6L15 3zm-2 2 6 6',
  chat: 'M3 3h18v14H9l-6 4V3zm4 5h10M7 12h7',
  bell: 'M6 9a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7m4 11h4',
  refresh: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5',
  shield: 'm12 2 9 4v6c0 5-5 8-9 10-4-2-9-5-9-10V6l9-4zm-4 10 3 3 5-6',
  inbox: 'm3 4-2 12v5h22v-5L21 4H3zm-2 12h6l2 3h6l2-3h6',
  home: 'm2 10 10-8 10 8M5 8v13h14V8m-10 13v-8h6v8',
  phone: 'M6 2h12v20H6V2zm5 16h2',
  lightbulb: 'M8 17c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8H8zm0 3h8m-6 3h4',
  warning: 'm12 2 11 19H1L12 2zm0 6v5m0 4h.01',
  logout: 'M10 3H3v18h7m-1-9h13m-5-5 5 5-5 5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  download: 'M12 2v14m-5-5 5 5 5-5M3 16v6h18v-6',
  crown: 'm3 6 5 4 4-7 4 7 5-4-2 14H5L3 6z',
}
const colors: Record<string, string> = { science:'#9cbeb9', brain:'#b7a8c5', philosophy:'#c8b58f', heart:'#c5a4a1', trend:'#9ebba7', finance:'#c3b58f', briefcase:'#9eafc5', user:'#b6afc7', users:'#aaaed0', clock:'#c1b49f', globe:'#9fb5c6', leaf:'#a0b89e', waves:'#99b9c4', sun:'#c9b48c', moon:'#b1acc9', sparkles:'#c2b095', headphones:'#b3abd0', music:'#b3abd0', warning:'#c5aa81', trash:'#c49e9d' }
export function Icon({ name='book', size=18, className='', style }: { name?:string; size?:number; className?:string; style?:CSSProperties }) {
  return <svg className={'ui-icon '+className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0,color:colors[name]||'var(--gold, #b4c5b4)',...style}}><path d={paths[name]||paths.book}/></svg>
}
export function categoryIcon(category:string) {
  const c=category.toLowerCase().replace(/[-_]/g,' ')
  if(c==='all') return 'library'
  if(/science|biology|nature|environment/.test(c)) return 'science'
  if(/psychology|mind/.test(c)) return 'brain'
  if(/philosophy|religion|spiritual|history/.test(c)) return 'philosophy'
  if(/health|wellness|relationship/.test(c)) return 'heart'
  if(/finance|money|econom/.test(c)) return 'finance'
  if(/business|leadership|entrepreneur/.test(c)) return 'briefcase'
  if(/biograph|memoir/.test(c)) return 'user'
  if(/productivity|habit|self help|personal/.test(c)) return 'trend'
  if(/creativ|art|poetry/.test(c)) return 'pen'
  if(/politic|social/.test(c)) return 'users'
  if(/travel|world/.test(c)) return 'globe'
  if(/technolog/.test(c)) return 'bot'
  if(/fiction|literature|classic|novel/.test(c)) return 'book'
  return 'bookmark'
}
