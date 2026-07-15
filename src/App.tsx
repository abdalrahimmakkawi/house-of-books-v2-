import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, signInWithEmail, signInWithGoogle, signInWithTwitter, signOut } from './lib/supabase'
import type { Book } from './lib/supabase'
import Agent from './pages/Agent'
import Dashboard from './pages/Dashboard'
import { collectChatFeedback } from './lib/feedbackCollector'

// Admin bypass configuration
const ADMIN_EMAILS = ['abdalrahimmakkawi@gmail.com']
const isAdmin = (email: string) => ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase().trim())

type Page = 'library' | 'community' | 'agent' | 'dashboard'
type AppFlow = 'landing' | 'login' | 'app'

interface ChatMessage { role: 'user' | 'assistant'; content: string }
type ShelfStatus = 'none' | 'want' | 'reading' | 'finished'
interface BookShelf { [bookId: string]: ShelfStatus }
interface BookNotes  { [bookId: string]: string }
interface ReadingProgress { [bookId: string]: number } // 0-100

// ── Auto-resizing textarea hook ───────────────────────────────────
// function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight:number; maxHeight?:number }) {
//   const textareaRef = useRef<HTMLTextAreaElement>(null)
//   const adjustHeight = useCallback((reset?: boolean) => {
//     const el = textareaRef.current; if (!el) return
//     if (reset) { el.style.height = `${minHeight}px`; return }
//     el.style.height = `${minHeight}px`
//     el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, maxHeight ?? Infinity))}px`
//   }, [minHeight, maxHeight])
//   useEffect(() => { if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px` }, [minHeight])
//   useEffect(() => {
//     const h = () => adjustHeight()
//     window.addEventListener('resize', h); return () => window.removeEventListener('resize', h)
//   }, [adjustHeight])
//   return { textareaRef, adjustHeight }
// }

// ── AI Chat Input (21st.dev AIInputWithLoading, gold-themed) ──────
// function AIChatInput({ placeholder, onSubmit, isLoading, dir }: {
//   placeholder: string; onSubmit: (v: string) => void
//   isLoading: boolean; dir: string
// }) {
//   const [value, setValue] = useState('')
//   const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 44, maxHeight: 160 })

//   const handleSubmit = () => {
//     if (!value.trim() || isLoading) return
//     onSubmit(value); setValue(''); adjustHeight(true)
//   }

//   return (
//     <div style={{
//       padding: '10px 12px',
//       borderTop: '1px solid var(--gold-border)',
//       background: 'transparent',
//       position: 'relative',
//     }}>
//       {/* Status line */}
//       <div style={{
//         fontSize: '10px',
//         color: isLoading ? 'var(--gold)' : 'var(--text-muted)',
//         letterSpacing: '0.08em',
//         marginBottom: '6px',
//         display: 'flex',
//         alignItems: 'center',
//         gap: '6px',
//         transition: 'color 0.3s',
//       }}>
//         {isLoading ? (
//           <>
//             <span style={{
//               display: 'inline-block', width: '8px', height: '8px',
//               background: 'var(--gold)', borderRadius: '2px',
//               animation: 'aiSpin 1.4s linear infinite',
//             }}/>
//             AI is thinking…
//           </>
//         ) : (
//           <>
//             <span style={{
//               display: 'inline-block', width: '6px', height: '6px',
//               background: 'var(--gold)', borderRadius: '50%',
//               opacity: 0.6,
//             }}/>
//             {placeholder.length > 30 ? 'Ask anything about this book' : placeholder}
//           </>
//         )}
//       </div>

//       {/* Input row */}
//       <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
//         <textarea
//           ref={textareaRef}
//           value={value}
//           placeholder={placeholder}
//           disabled={isLoading}
//           style={{
//             flex: 1,
//             padding: '10px 14px',
//             background: 'var(--input-bg)',
//             border: `1px solid ${value.trim() ? 'var(--gold)' : 'var(--gold-border)'}`,
//             borderRadius: '12px',
//             color: 'var(--text)',
//             fontSize: '12.5px',
//             lineHeight: '1.5',
//             outline: 'none',
//             resize: 'none',
//             minHeight: '44px',
//             direction: dir as 'ltr' | 'rtl',
//             fontFamily: 'Georgia, serif',
//             transition: 'border-color 0.2s',
//             opacity: isLoading ? 0.5 : 1,
//           }}
//           onChange={e => { setValue(e.target.value); adjustHeight() }}
//           onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
//         />

//         {/* Submit button */}
//         <button
//           onClick={handleSubmit}
//           disabled={isLoading || !value.trim()}
//           style={{
//             width: '38px', height: '38px', flexShrink: 0,
//             border: '1px solid var(--gold-border)',
//             borderRadius: '10px',
//             background: value.trim() && !isLoading
//               ? `linear-gradient(135deg, var(--gold), var(--gold-light))` 
//               : 'var(--surface)',
//             cursor: isLoading || !value.trim() ? 'not-allowed' : 'pointer',
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             transition: 'all 0.2s',
//             opacity: isLoading ? 0.5 : 1,
//           }}
//         >
//           {isLoading ? (
//             <span style={{
//               display: 'block', width: '12px', height: '12px',
//               background: 'var(--gold)', borderRadius: '3px',
//               animation: 'aiSpin 1.4s linear infinite',
//             }}/>
//           ) : (
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={value.trim() ? '#0a0a0f' : 'var(--gold)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M12 19V5M5 12l7-7 7 7"/>
//             </svg>
//           )}
//         </button>
//       </div>

//       <style>{`
//         @keyframes aiSpin {
//           0%   { transform: rotate(0deg) scale(1);   opacity: 1; }
//           25%  { transform: rotate(90deg) scale(0.9); opacity: 0.7; }
//           50%  { transform: rotate(180deg) scale(1);  opacity: 1; }
//           75%  { transform: rotate(270deg) scale(0.9);opacity: 0.7; }
//           100% { transform: rotate(360deg) scale(1);  opacity: 1; }
//         }
//       `}</style>
//     </div>
//   )
// }

const LANGUAGES = [
  { id:'en', label:'English',  emoji:'🇬🇧', dir:'ltr' },
  { id:'ar', label:'العربية', emoji:'🇸🇦', dir:'rtl' },
  { id:'fr', label:'Français', emoji:'🇫🇷', dir:'ltr' },
  { id:'es', label:'Español',  emoji:'🇪🇸', dir:'ltr' },
  { id:'zh', label:'中文',     emoji:'🇨🇳', dir:'ltr' },
]

const T: Record<string,Record<string,string>> = {
  en:{ appName:'House of Books',appSub:'AI-Powered Reading',searchPlaceholder:'Search books, authors, topics…',upgrade:'Upgrade',wallpaper:'Theme',music:'Ambient Music',language:'Language',sectionTitle:"The World's Greatest Books,",sectionTitleSpan:'Distilled by AI',books:'books',unlockTitle:'✦ Go Premium',unlockDesc:'Full library · Unlimited AI chat · PDF exports',startFor:'✦ Upgrade',overview:'Overview',fullSummary:'Full Summary',keyInsights:'Key Insights',aboutBook:'About This Book',aboutBookDesc:'Click ✦ AI Summary to generate a comprehensive summary, or open ✦ AI Chat to ask any question.',aiSummary:'✦ AI Summary',generating:'✦ Generating…',aiChat:'✦ AI Chat',hideChat:'Hide Chat',aiExpert:'AI Book Expert',askAnything:'Ask me anything about this book.',askPlaceholder:'Ask a question…',send:'→',premium:'Premium',audioComingSoon:'Audio Summary — Coming Soon',minRead:'min read',loading:'House of Books',alreadyMember:'Already a member? Enter your email to unlock.',unlockAccess:'Unlock Access',upgradePremium:'Premium',premiumBook:'Premium Book',connectionError:'Connection error.',noResponse:'No response.',failedSummary:'Failed to generate summary.',summarizing:'✦ Generating summary…',by:'by',vol:'Vol',wantRead:'Want to Read',reading:'Reading',finished:'Finished',myShelf:'My Shelf',allBooks:'All Books',notes:'My Notes',notesPlaceholder:'Write your personal notes about this book…',saveNotes:'Save Notes',notesSaved:'Saved ✓',streak:'day streak',dailyQuote:'Quote of the Day',recommendations:'Recommended for You',loadingRecs:'Finding books for you…',searchInside:'Search inside summaries',noResults:'No results found.',readProgress:'Reading Progress',exportPDF:'Export Insights PDF',exportingPDF:'Exporting…',pdfPremium:'PDF export is a premium feature' },
  ar:{ appName:'بيت الكتب',appSub:'قراءة مدعومة بالذكاء الاصطناعي',searchPlaceholder:'ابحث في الكتب…',upgrade:'ترقية',wallpaper:'المظهر',music:'موسيقى محيطية',language:'اللغة',sectionTitle:'أعظم كتب العالم،',sectionTitleSpan:'مُقطَّرة بالذكاء الاصطناعي',books:'كتاب',unlockTitle:'✦ الترقية إلى Premium',unlockDesc:'مكتبة كاملة · دردشة ذكاء اصطناعي غير محدودة · تصدير PDF',startFor:'✦ ترقية',overview:'نظرة عامة',fullSummary:'الملخص الكامل',keyInsights:'الأفكار الرئيسية',aboutBook:'عن هذا الكتاب',aboutBookDesc:'اضغط ✦ ملخص ذكاء اصطناعي.',aiSummary:'✦ ملخص',generating:'✦ جارٍ…',aiChat:'✦ دردشة',hideChat:'إخفاء',aiExpert:'خبير الكتاب',askAnything:'اسألني أي شيء.',askPlaceholder:'اطرح سؤالاً…',send:'→',premium:'مميز',audioComingSoon:'الملخص الصوتي — قريباً',minRead:'دقيقة',loading:'بيت الكتب',alreadyMember:'عضو بالفعل؟ أدخل بريدك.',unlockAccess:'فتح الوصول',upgradePremium:'Premium',premiumBook:'كتاب مميز',connectionError:'خطأ في الاتصال.',noResponse:'لا يوجد رد.',failedSummary:'فشل.',summarizing:'✦ جارٍ…',by:'بقلم',vol:'صوت',wantRead:'أريد قراءته',reading:'أقرأه',finished:'أنهيته',myShelf:'رفي',allBooks:'كل الكتب',notes:'ملاحظاتي',notesPlaceholder:'اكتب ملاحظاتك…',saveNotes:'حفظ',notesSaved:'تم ✓',streak:'أيام',dailyQuote:'اقتباس اليوم',recommendations:'موصى لك',loadingRecs:'جارٍ البحث…',searchInside:'البحث داخل الملخصات',noResults:'لا توجد نتائج.',readProgress:'تقدم القراءة',exportPDF:'تصدير ملف PDF',exportingPDF:'جا...',pdfPremium:'PDF export is a premium feature' },
  fr:{ appName:'House of Books',appSub:'Lecture par IA',searchPlaceholder:'Rechercher…',upgrade:'Premium',wallpaper:'Thème',music:"Musique d'ambiance",language:'Langue',sectionTitle:'Les Plus Grands Livres,',sectionTitleSpan:"Distillés par l'IA",books:'livres',unlockTitle:'✦ Passer à Premium',unlockDesc:'Bibliothèque complète · Chat IA illimité · Exports PDF',startFor:'✦ Mettre à niveau',overview:'Aperçu',fullSummary:'Résumé Complet',keyInsights:'Points Clés',aboutBook:'À Propos',aboutBookDesc:'Cliquez ✦ Résumé IA.',aiSummary:'✦ Résumé IA',generating:'✦ Génération…',aiChat:'✦ Chat IA',hideChat:'Masquer',aiExpert:'Expert IA',askAnything:'Posez une question.',askPlaceholder:'Question…',send:'→',premium:'Premium',audioComingSoon:'Audio — Bientôt',minRead:'min',loading:'House of Books',alreadyMember:'Déjà membre?',unlockAccess:'Débloquer',upgradePremium:'Premium',premiumBook:'Livre Premium',connectionError:'Erreur.',noResponse:'Pas de réponse.',failedSummary:'Échec.',summarizing:'✦ Génération…',by:'par',vol:'Vol',wantRead:'À lire',reading:'En cours',finished:'Terminé',myShelf:'Ma Bibliothèque',allBooks:'Tous',notes:'Notes',notesPlaceholder:'Vos notes…',saveNotes:'Sauvegarder',notesSaved:'Sauvegardé ✓',streak:'jours',dailyQuote:'Citation du Jour',recommendations:'Recommandé',loadingRecs:'Recherche…',searchInside:'Rechercher',noResults:'Aucun résultat.',readProgress:'Progression',exportPDF:'Exporter PDF',exportingPDF:'Exportation…',pdfPremium:'Export PDF est premium' },
  es:{ appName:'House of Books',appSub:'Lectura con IA',searchPlaceholder:'Buscar…',upgrade:'Premium',wallpaper:'Tema',music:'Música',language:'Idioma',sectionTitle:'Los Mejores Libros,',sectionTitleSpan:'Destilados por IA',books:'libros',unlockTitle:'✦ Pasar a Premium',unlockDesc:'Biblioteca completa · Chat IA ilimitado · Exports PDF',startFor:'✦ Mejorar',overview:'Resumen',fullSummary:'Resumen Completo',keyInsights:'Ideas Clave',aboutBook:'Sobre el Libro',aboutBookDesc:'Haz clic en ✦ Resumen IA.',aiSummary:'✦ Resumen IA',generating:'✦ Generando…',aiChat:'✦ Chat IA',hideChat:'Ocultar',aiExpert:'Experto IA',askAnything:'Pregúntame.',askPlaceholder:'Pregunta…',send:'→',premium:'Premium',audioComingSoon:'Audio — Próximamente',minRead:'min',loading:'House of Books',alreadyMember:'¿Ya eres miembro?',unlockAccess:'Desbloquear',upgradePremium:'Premium',premiumBook:'Libro Premium',connectionError:'Error.',noResponse:'Sin respuesta.',failedSummary:'Error.',summarizing:'✦ Generando…',by:'por',vol:'Vol',wantRead:'Quiero leer',reading:'Leyendo',finished:'Terminado',myShelf:'Mi Biblioteca',allBooks:'Todos',notes:'Notas',notesPlaceholder:'Tus notas…',saveNotes:'Guardar',notesSaved:'Guardado ✓',streak:'días',dailyQuote:'Cita del Día',recommendations:'Recomendado',loadingRecs:'Buscando…',searchInside:'Buscar',noResults:'Sin resultados.',readProgress:'Progreso',exportPDF:'Exportar PDF',exportingPDF:'Exportando…',pdfPremium:'Export PDF es premium' },
  zh:{ appName:'书之屋',appSub:'AI 智能阅读',searchPlaceholder:'搜索书籍…',upgrade:'升级',wallpaper:'主题',music:'环境音乐',language:'语言',sectionTitle:'世界最伟大的书籍，',sectionTitleSpan:'由AI精炼提取',books:'本书',unlockTitle:'✦ 升级到 Premium',unlockDesc:'完整书库 · 无限AI聊天 · PDF导出',startFor:'✦ 升级',overview:'概述',fullSummary:'完整摘要',keyInsights:'核心洞见',aboutBook:'关于本书',aboutBookDesc:'点击 ✦ AI摘要。',aiSummary:'✦ AI摘要',generating:'✦ 生成中…',aiChat:'✦ AI对话',hideChat:'隐藏',aiExpert:'AI图书专家',askAnything:'向我提问。',askPlaceholder:'提问…',send:'→',premium:'高级',audioComingSoon:'语音摘要 — 即将推出',minRead:'分钟',loading:'书之屋',alreadyMember:'已是会员？',unlockAccess:'解锁',upgradePremium:'Premium',premiumBook:'高级书籍',connectionError:'连接错误。',noResponse:'无响应。',failedSummary:'生成失败。',summarizing:'✦ 生成中…',by:'作者',vol:'音量',wantRead:'想读',reading:'正在读',finished:'已读完',myShelf:'我的书架',allBooks:'全部',notes:'笔记',notesPlaceholder:'写下笔记…',saveNotes:'保存',notesSaved:'已保存 ✓',streak:'天',dailyQuote:'每日书摘',recommendations:'为你推荐',loadingRecs:'搜索中…',searchInside:'搜索摘要',noResults:'未找到。',readProgress:'阅读进度',exportPDF:'导出PDF',exportingPDF:'导出中…',pdfPremium:'PDF导出是高级功能' },
}

const THEMES = [
  { id:'classic',label:'Classic',emoji:'🏛️',image:'/wallpaper/classic.jpg',accent:'#cba86a',accentLight:'#e4cf95',overlay:'rgba(8,6,2,0.80)',isLight:false,bg:'#0a0a0f',text:'#ebe6da',textMuted:'rgba(235,230,218,0.56)',border:'rgba(203,168,106,0.22)',headerBg:'rgba(10,10,15,0.90)',modalBg:'rgba(14,14,20,0.97)',surface:'rgba(255,255,255,0.045)',inputBg:'rgba(255,255,255,0.045)' },
  { id:'cosmos', label:'Cosmos', emoji:'🌌',image:'/wallpaper/cosmos.jpg', accent:'#93bde0',accentLight:'#c2dbef',overlay:'rgba(2,4,18,0.78)', isLight:false,bg:'#02040f',text:'#e0eaf6',textMuted:'rgba(224,234,246,0.54)', border:'rgba(147,189,224,0.22)',headerBg:'rgba(2,4,18,0.90)',  modalBg:'rgba(4,8,22,0.97)',  surface:'rgba(255,255,255,0.045)',inputBg:'rgba(255,255,255,0.045)' },
  { id:'nature', label:'Nature', emoji:'🌿',image:'/wallpaper/nature.jpg', accent:'#93c795',accentLight:'#bcdcbe',overlay:'rgba(2,10,4,0.78)',  isLight:false,bg:'#020a04',text:'#dfeedf',textMuted:'rgba(223,238,223,0.54)', border:'rgba(147,199,149,0.22)',headerBg:'rgba(2,10,4,0.90)',  modalBg:'rgba(4,14,6,0.97)',  surface:'rgba(255,255,255,0.045)',inputBg:'rgba(255,255,255,0.045)' },
  { id:'beach',  label:'Beach',  emoji:'🌊',image:'/wallpaper/beach.jpg',  accent:'#68c4c2',accentLight:'#a0dcda',overlay:'rgba(2,12,18,0.77)', isLight:false,bg:'#020c12',text:'#dceff0',textMuted:'rgba(220,239,240,0.54)', border:'rgba(104,196,194,0.22)', headerBg:'rgba(2,12,18,0.90)', modalBg:'rgba(4,16,22,0.97)',  surface:'rgba(255,255,255,0.045)',inputBg:'rgba(255,255,255,0.045)' },
  { id:'light',  label:'Light',  emoji:'☀️',image:'none',                  accent:'#9a6f2a',accentLight:'#c9a84c',overlay:'none',              isLight:true, bg:'#faf6ef',text:'#2a1f0e',textMuted:'rgba(42,31,14,0.5)',   border:'rgba(154,111,42,0.2)', headerBg:'rgba(250,246,239,0.96)',modalBg:'rgba(252,249,243,0.99)',surface:'rgba(154,111,42,0.06)',inputBg:'rgba(154,111,42,0.05)' },
  { id:'dark',   label:'Dark',   emoji:'🌙',image:'none',                  accent:'#c9a84c',accentLight:'#e8c97a',overlay:'none',              isLight:false,bg:'#0d0d0d',text:'#e8e4d9',textMuted:'rgba(232,228,217,0.42)',border:'rgba(201,168,76,0.16)', headerBg:'rgba(13,13,13,0.98)', modalBg:'rgba(16,16,16,0.99)',  surface:'rgba(255,255,255,0.03)',inputBg:'rgba(255,255,255,0.03)' },
]

const TRACKS = [
  { id:'library',label:'Library',emoji:'📚',src:'/music/library.mp3' },
  { id:'beach',  label:'Beach',  emoji:'🏖️',src:'/music/beach.mp3'   },
  { id:'forest', label:'Forest', emoji:'🌲',src:'/music/forest.mp3'  },
  { id:'rain',   label:'Rain',   emoji:'🌧️',src:'/music/rain.mp3'    },
  { id:'cosmos', label:'Cosmos', emoji:'🚀',src:'/music/cosmos.mp3'  },
]

const FREE_BOOKS = 84

// Vercel Web Analytics custom event helper (no-op until the script loads /
// Web Analytics is on a plan that records custom events; safe to call always).
const track = (name: string, data?: Record<string, any>) => {
  try { (window as any).va?.('event', { name, ...(data || {}) }) } catch {}
}

// ── Demo / sample mode (reached from the marketing site's "Start free") ──
// Open, no login, read-only. Loads only the curated books below (all have
// pre-cached audio + summaries, so nothing is generated or written), and its
// AI chat runs on NVIDIA's free tier. Keeps public traffic off the paid full
// app while still showing the real experience.
const IS_DEMO = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('demo') === '1'
const DEMO_BOOK_IDS = [
  'f0ed41ad-95de-4c2e-abee-87f21aed8133', // The Psychology of Money
  '5f4f3bb2-5f54-4a13-9976-b7af46604654', // 21 Lessons for the 21st Century
  'e8988b3e-dd76-4688-a56d-7584cded8553', // A Short History of Nearly Everything
  'e08e73ce-e1d5-4031-90fb-9f6bf7a57c96', // A Brief History of Time
  'b8529ced-d52d-49aa-9e19-afe9eb9cf921', // Being and Nothingness
  '4302be3f-f272-4496-9e2d-027add76ad8e', // Beyond Good and Evil
]
const FREE_AI_CHATS = 10
// Free AI chats reset window (matches the "resets every 6 hours" promise in the UI)
const CHAT_WINDOW_MS = 6 * 60 * 60 * 1000
const CHAT_USES_KEY = 'hob_chat_uses'
function getChatUses(): { count: number; resetAt: number } {
  try {
    const j = JSON.parse(localStorage.getItem(CHAT_USES_KEY) || 'null')
    if (j && typeof j.count === 'number' && Date.now() < j.resetAt) return j
  } catch {}
  return { count: 0, resetAt: Date.now() + CHAT_WINDOW_MS }
}

// Light columns for the library grid — summaries/insights are fetched per
// book on open, keeping the initial load ~93% smaller than select('*').
const BOOK_LIST_COLUMNS = 'id,title,author,cover_url,category,read_time_mins,audio_url'
const BOOKS_CACHE_KEY = 'hob_books_cache_v1'
const BOOKS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// ── CSS ───────────────────────────────────────────────────────────
const buildStyles = (th: typeof THEMES[0], dir: string) => `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:${th.accent};--gold-light:${th.accentLight};
  --gold-dim:${th.accent}22;--gold-border:${th.border};
  --bg:${th.bg};--surface:${th.surface};--text:${th.text};--text-muted:${th.textMuted};
  --header-bg:${th.headerBg};--modal-bg:${th.modalBg};--input-bg:${th.inputBg};
}
html{direction:${dir}}
body{font-family:${dir==='rtl'?"'Noto Sans Arabic',":""}Georgia,serif;font-size:14px;min-height:100vh;background:var(--bg);color:var(--text);direction:${dir};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
::selection{background:${th.accent}55;color:${th.isLight?'#1a1206':'#fff'}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${th.accent}3a;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${th.accent}66}
button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid ${th.accent}88;outline-offset:2px}

.app-bg{position:fixed;inset:0;z-index:-1;background-color:var(--bg);${th.image!=='none'?`background-image:url('${th.image}');background-size:cover;background-position:center;`:''}}
${th.image!=='none'?`.app-bg::after{content:'';position:absolute;inset:0;background:${th.overlay}}`:''}
.app-root{position:relative;z-index:1;min-height:100vh}

.app-header{position:sticky;top:0;z-index:100;background:var(--header-bg);backdrop-filter:blur(24px);border-bottom:1px solid var(--gold-border);padding:0 1.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem}
.logo-mark{width:34px;height:34px;border:1px solid var(--gold);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.logo-text{font-family:Georgia,serif;font-size:1.35rem;font-weight:600;color:var(--gold);letter-spacing:.05em;line-height:1}
.logo-sub{font-size:10px;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
.header-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.search-wrap{position:relative}
.search-icon{position:absolute;${dir==='rtl'?'right':'left'}:11px;top:50%;transform:translateY(-50%);color:var(--text-muted);width:13px;height:13px;pointer-events:none}
.search-input{width:220px;padding:7px 14px 7px ${dir==='rtl'?'14px':'34px'};padding-${dir==='rtl'?'right':'left'}:34px;background:var(--input-bg);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:12px;outline:none;transition:border-color .2s;direction:${dir}}
.search-input::placeholder{color:var(--text-muted)}.search-input:focus{border-color:var(--gold)}
.icon-btn{width:34px;height:34px;background:var(--surface);border:1px solid var(--gold-border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;position:relative}
.icon-btn:hover,.icon-btn.active{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
.btn-premium{padding:7px 16px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:${th.isLight?'#fff':'#0a0a0f'};border:none;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:box-shadow .25s,transform .15s;white-space:nowrap;flex-shrink:0;box-shadow:0 2px 12px ${th.accent}30}
.btn-premium:hover{transform:translateY(-1px);box-shadow:0 4px 22px ${th.accent}55}
.dropdown{position:absolute;top:calc(100% + 8px);${dir==='rtl'?'left':'right'}:0;background:var(--modal-bg);backdrop-filter:blur(20px);border:1px solid var(--gold-border);border-radius:12px;padding:10px;min-width:190px;z-index:300;box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 0 1px ${th.accent}0d;animation:dropIn .18s ease}
@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.dropdown-title{font-size:10px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;padding:2px 6px 8px;border-bottom:1px solid var(--gold-border);margin-bottom:8px}
.dropdown-item{display:flex;align-items:center;gap:10px;padding:11px 10px;border-radius:6px;cursor:pointer;transition:background .15s;font-size:14px;color:var(--text-muted);border:none;background:transparent;width:100%;text-align:${dir==='rtl'?'right':'left'};direction:${dir};-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.dropdown-item:hover,.dropdown-item:active{background:var(--gold-dim);color:var(--text)}.dropdown-item.active{background:var(--gold-dim);color:var(--gold)}
.dropdown-item-emoji{font-size:16px;flex-shrink:0}
.track-playing{margin-${dir==='rtl'?'right':'left'}:auto;display:flex;gap:2px;align-items:flex-end;height:14px}
.track-bar{width:3px;background:var(--gold);border-radius:1px;animation:eq .8s ease-in-out infinite alternate}
.track-bar:nth-child(1){height:6px}.track-bar:nth-child(2){height:10px;animation-delay:.2s}.track-bar:nth-child(3){height:13px;animation-delay:.4s}
@keyframes eq{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
@keyframes hobBlink{0%,100%{opacity:1}50%{opacity:0}}
.volume-row{padding:8px 8px 2px;display:flex;align-items:center;gap:8px;border-top:1px solid var(--gold-border);margin-top:8px}
.volume-label{font-size:11px;color:var(--text-muted);flex-shrink:0}
.volume-slider{flex:1;-webkit-appearance:none;height:3px;background:var(--gold-border);border-radius:2px;outline:none;cursor:pointer}
.volume-slider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:var(--gold);border-radius:50%}

.main-content{padding:2.5rem 1.5rem 6rem;max-width:1400px;margin:0 auto}
.daily-quote{margin-bottom:2rem;padding:1.2rem 1.6rem;background:linear-gradient(135deg,${th.accent}14,${th.accent}06);backdrop-filter:blur(8px);border:1px solid var(--gold-border);border-radius:12px;position:relative;overflow:hidden}
.daily-quote::before{content:'❝';position:absolute;top:-10px;${dir==='rtl'?'left':'right'}:16px;font-size:5rem;color:var(--gold);opacity:.06;font-family:Georgia,serif;line-height:1}
.quote-label{font-size:9px;color:var(--gold);letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px;opacity:.7}
.quote-text{font-family:Georgia,serif;font-size:14px;color:var(--text);line-height:1.65;font-style:italic}
.quote-source{font-size:11px;color:var(--text-muted);margin-top:6px}
.streak-bar{display:inline-flex;align-items:center;gap:8px;padding:5px 13px;background:rgba(255,140,0,.1);border:1px solid rgba(255,140,0,.3);border-radius:20px;margin-bottom:1.5rem}
.streak-fire{font-size:14px}.streak-count{font-size:13px;font-weight:600;color:#e07800}.streak-label{font-size:11px;color:var(--text-muted)}
.section-header{margin-bottom:2rem;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.section-title{font-family:Georgia,serif;font-size:2.3rem;font-weight:500;color:var(--text);line-height:1.18;letter-spacing:-0.01em;text-shadow:0 2px 24px rgba(0,0,0,0.45)}
.section-title span{color:var(--gold);font-style:italic;background:linear-gradient(120deg,var(--gold),var(--gold-light));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.section-count{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;padding-bottom:4px}
.view-tabs{display:flex;gap:6px;margin-bottom:1.5rem}
.view-tab{padding:5px 14px;background:transparent;border:1px solid var(--gold-border);border-radius:20px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:all .2s}
.view-tab:hover,.view-tab.active{background:var(--gold-dim);border-color:var(--gold);color:var(--gold)}
.cat-tabs{display:flex;gap:7px;margin-bottom:1.75rem;flex-wrap:wrap}
.cat-tab{padding:5px 14px;background:${th.accent}08;backdrop-filter:blur(6px);border:1px solid var(--gold-border);border-radius:20px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:all .2s}
.cat-tab:hover{transform:translateY(-1px)}
.cat-tab:hover,.cat-tab.active{background:var(--gold-dim);border-color:var(--gold);color:var(--gold)}
.search-inside-wrap{margin-bottom:1.5rem;position:relative}
.search-inside-input{width:100%;padding:9px 14px 9px 36px;background:var(--input-bg);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:12px;outline:none;transition:border-color .2s}
.search-inside-input:focus{border-color:var(--gold)}.search-inside-input::placeholder{color:var(--text-muted)}
.search-inside-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;pointer-events:none}
.upgrade-banner{margin:0 0 2rem;padding:1.1rem 1.5rem;background:linear-gradient(135deg,${th.accent}18,${th.accent}05);backdrop-filter:blur(8px);border:1px solid var(--gold-border);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.upgrade-text h3{font-family:Georgia,serif;font-size:1.2rem;color:var(--gold);margin-bottom:3px}
.upgrade-text p{font-size:12px;color:var(--text-muted)}
.recs-section{margin-bottom:2.5rem}
.recs-title{font-family:Georgia,serif;font-size:1.1rem;color:var(--gold);margin-bottom:1rem}
.recs-grid{display:flex;gap:1rem;overflow-x:auto;padding-bottom:8px}
.rec-card{flex-shrink:0;width:100px;cursor:pointer;transition:transform .25s}
.rec-card:hover{transform:translateY(-4px)}
.rec-card img{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:5px;box-shadow:0 6px 20px rgba(0,0,0,.3)}
.rec-card-title{font-size:10px;color:var(--text-muted);margin-top:5px;line-height:1.3;text-align:center}

/* ── FOCUS CARDS GRID (from 21st.dev) ── */
.books-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1.2rem}

/* Each card */
.focus-card{
  position:relative;border-radius:12px;overflow:hidden;cursor:pointer;
  aspect-ratio:2/3;
  transition:filter 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  border:1px solid var(--gold-border);
  box-shadow:0 6px 24px rgba(0,0,0,0.35);
}
/* Focus Cards effect: when a sibling is hovered, blur + shrink */
.books-grid:has(.focus-card:hover) .focus-card:not(:hover){
  filter:blur(1.5px) brightness(0.7);
  transform:scale(0.97);
}
.focus-card:hover{
  transform:scale(1.03);
  box-shadow:0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px var(--gold);
  z-index:2;
}
.focus-card img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s ease}
.focus-card:hover img{transform:scale(1.06)}

/* Overlay revealed on hover */
.focus-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
  opacity:0;transition:opacity 0.3s ease;
  display:flex;flex-direction:column;justify-content:flex-end;
  padding:14px 12px;
}
.focus-card:hover .focus-overlay{opacity:1}
.focus-overlay-title{font-family:Georgia,serif;font-size:.95rem;font-weight:600;color:#fff;line-height:1.25;margin-bottom:3px}
.focus-overlay-author{font-size:10px;color:rgba(255,255,255,0.65);margin-bottom:8px}
.focus-overlay-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a0a0f;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;width:fit-content}

/* Locked state */
.focus-locked{position:absolute;inset:0;background:${th.isLight?'rgba(250,246,239,0.82)':'rgba(10,10,15,0.78)'};backdrop-filter:blur(3px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.lock-icon{width:28px;height:28px;border:1.5px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:12px}
.lock-label{font-size:9px;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.shelf-badge{position:absolute;top:8px;${dir==='rtl'?'left':'right'}:8px;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;z-index:3}
.shelf-want{background:rgba(201,168,76,.9);color:#0a0a0f}
.shelf-reading{background:rgba(74,180,255,.9);color:#0a0a0f}
.shelf-finished{background:rgba(74,200,120,.9);color:#0a0a0f}

/* ── EXPANDED READER PANEL ── */
.expanded-backdrop{position:fixed;inset:0;background:${th.isLight?'rgba(180,155,120,0.55)':'rgba(0,0,0,0.8)'};backdrop-filter:blur(14px);z-index:200}
.expanded-panel{position:fixed;inset:0;z-index:201;display:flex;align-items:center;justify-content:center;padding:1.25rem;pointer-events:none}
.expanded-card{pointer-events:all;background:var(--modal-bg);border:1px solid var(--gold-border);border-radius:14px;width:100%;max-width:1100px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px ${th.isLight?'rgba(100,70,20,0.2)':'rgba(0,0,0,0.7)'}}
.expanded-hero{position:relative;height:200px;overflow:hidden;flex-shrink:0}
.expanded-hero-bg{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;filter:blur(3px) brightness(0.55);transform:scale(1.06)}
.expanded-hero-grad{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,${th.modalBg} 100%)}
.expanded-cover{position:absolute;bottom:-28px;${dir==='rtl'?'right':'left'}:2rem;width:84px;border-radius:7px;box-shadow:0 12px 40px rgba(0,0,0,.65);border:2px solid var(--gold-border)}
.expanded-header{padding:.9rem 1.4rem .7rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-shrink:0;margin-top:14px}
.expanded-title-block{min-width:0;padding-${dir==='rtl'?'right':'left'}:108px}
.expanded-cat{font-size:9px;color:var(--gold);letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px;opacity:.8}
.expanded-title{font-family:Georgia,serif;font-size:1.5rem;font-weight:600;color:var(--text);line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.expanded-author{font-size:12px;color:var(--text-muted);margin-top:3px}
.expanded-actions{display:flex;gap:7px;align-items:center;flex-shrink:0;flex-wrap:wrap}
.btn-ai{padding:6px 14px;background:${th.accent}18;border:1px solid var(--gold-border);color:var(--gold);border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.btn-ai:hover{background:var(--gold-dim);border-color:var(--gold)}.btn-ai:disabled{opacity:.4;cursor:not-allowed}.btn-ai.active{background:var(--gold-dim);border-color:var(--gold)}
.btn-close{width:32px;height:32px;background:var(--surface);border:1px solid var(--gold-border);border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.btn-close:hover{background:var(--gold-dim);color:var(--text)}
.expanded-body{display:flex;flex:1;overflow:hidden;border-top:1px solid var(--gold-border);margin-top:.5rem}
.reader-panel{flex:1;overflow-y:auto;padding:1.4rem 1.8rem}
.shelf-actions{display:flex;gap:7px;margin-bottom:1.2rem;flex-wrap:wrap}
.shelf-btn{padding:5px 12px;border-radius:5px;font-size:11px;cursor:pointer;transition:all .2s;border:1px solid var(--gold-border);background:transparent;color:var(--text-muted)}
.shelf-btn:hover{border-color:var(--gold);color:var(--gold)}
.shelf-btn.active-want{background:rgba(201,168,76,.15);border-color:var(--gold);color:var(--gold)}
.shelf-btn.active-reading{background:rgba(74,180,255,.12);border-color:#4ab4ff;color:${th.isLight?'#1a6fa0':'#4ab4ff'}}
.shelf-btn.active-finished{background:rgba(74,200,120,.12);border-color:#4ac878;color:${th.isLight?'#1a7a40':'#4ac878'}}
.hero-badges{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:1rem}
.hero-badge{display:inline-block;padding:3px 10px;border:1px solid var(--gold-border);border-radius:3px;font-size:10px;color:var(--gold);letter-spacing:.06em;text-transform:uppercase}
.audio-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:${th.accent}0d;border:1px solid var(--gold-border);border-radius:20px;font-size:11px;color:var(--gold);margin-bottom:1.2rem}
.content-section{background:var(--surface);border:1px solid ${th.accent}15;border-radius:8px;padding:1.2rem;margin-bottom:1rem}
.content-section h4{font-family:Georgia,serif;font-size:1.05rem;font-weight:600;color:var(--gold);margin-bottom:.7rem}
.content-section p{color:var(--text-muted);line-height:1.78;font-size:13.5px}
.insights-list{list-style:none;display:flex;flex-direction:column;gap:9px}
.insight-item{display:flex;gap:11px;align-items:flex-start;padding:9px 11px;background:${th.accent}0d;border-radius:6px;border-${dir==='rtl'?'right':'left'}:2px solid var(--gold)}
.insight-num{font-family:Georgia,serif;font-size:1.05rem;color:var(--gold);font-weight:600;flex-shrink:0;line-height:1.4;min-width:20px}
.insight-text{font-size:13px;color:var(--text-muted);line-height:1.6}
.notes-section{background:var(--surface);border:1px solid ${th.accent}15;border-radius:8px;padding:1.2rem;margin-bottom:1rem}
.notes-section h4{font-family:Georgia,serif;font-size:1.05rem;color:var(--gold);margin-bottom:.7rem}
.notes-textarea{width:100%;min-height:110px;padding:10px;background:var(--input-bg);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:13px;resize:vertical;outline:none;transition:border-color .2s;font-family:Georgia,serif;direction:${dir}}
.notes-textarea:focus{border-color:var(--gold)}
.notes-footer{display:flex;justify-content:flex-end;margin-top:8px}
.notes-save-btn{padding:6px 16px;background:var(--gold-dim);border:1px solid var(--gold-border);color:var(--gold);border-radius:5px;font-size:11px;cursor:pointer;transition:all .2s}
.notes-save-btn:hover{background:${th.accent}44}
.chat-panel{width:360px;flex-shrink:0;border-${dir==='rtl'?'right':'left'}:1px solid var(--gold-border);display:flex;flex-direction:column;background:${th.isLight?'rgba(250,246,239,0.85)':'rgba(10,10,15,0.6)'}}
.chat-header{padding:.9rem 1.1rem;border-bottom:1px solid var(--gold-border);display:flex;align-items:center;gap:9px;flex-shrink:0}
.chat-ai-dot{width:7px;height:7px;background:var(--gold);border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.chat-header-text h4{font-size:12px;font-weight:600;color:var(--text)}.chat-header-text p{font-size:10px;color:var(--text-muted)}
.chat-messages{flex:1;overflow-y:auto;padding:.9rem;display:flex;flex-direction:column;gap:11px}
.chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;text-align:center;padding:2rem;color:var(--text-muted)}
.chat-empty-icon{width:44px;height:44px;border:1px solid var(--gold-border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px}
.chat-empty p{font-size:12px;line-height:1.55}
.msg{max-width:90%;padding:9px 12px;border-radius:10px;font-size:12.5px;line-height:1.62;white-space:pre-wrap;word-break:break-word}
.msg-user{background:${th.accent}1a;border:1px solid var(--gold-border);align-self:flex-end;color:var(--text);border-bottom-right-radius:3px}
.msg-ai{background:var(--surface);border:1px solid var(--gold-border);align-self:flex-start;color:var(--text-muted);border-bottom-left-radius:3px}
.msg-typing{display:flex;gap:4px;align-items:center;padding:12px 14px}
.typing-dot{width:5px;height:5px;background:var(--gold);border-radius:50%;animation:bounce 1.2s infinite}
.typing-dot:nth-child(2){animation-delay:.2s}.typing-dot:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
.chat-input-area{padding:.9rem;border-top:1px solid var(--gold-border);display:flex;gap:7px;flex-shrink:0}
.chat-input{flex:1;padding:8px 11px;background:var(--input-bg);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:12px;outline:none;direction:${dir}}
.chat-input:focus{border-color:var(--gold)}.chat-input::placeholder{color:var(--text-muted)}
.btn-send{padding:8px 13px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:${th.isLight?'#fff':'#0a0a0f'};border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0}
.btn-send:disabled{opacity:.4;cursor:not-allowed}
.loading-screen{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--bg)}
.loading-logo{font-family:Georgia,serif;font-size:2rem;color:var(--gold);letter-spacing:.1em}
.loading-bar{width:200px;height:1px;background:${th.accent}22;position:relative;overflow:hidden;border-radius:1px}
.loading-bar::after{content:'';position:absolute;left:-60%;top:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,var(--gold),transparent);animation:loadAnim 1.2s infinite}
@keyframes loadAnim{0%{left:-60%}100%{left:110%}}
.email-modal-wrap{position:fixed;inset:0;background:${th.isLight?'rgba(180,155,120,0.55)':'rgba(0,0,0,.8)'};backdrop-filter:blur(10px);z-index:300;display:flex;align-items:center;justify-content:center;padding:1.25rem}

/* ── READING PROGRESS ── */
.progress-bar-wrap{margin-bottom:1rem}
.progress-label{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
.progress-label span:last-child{color:var(--gold);font-weight:600}
.progress-track{height:3px;background:var(--gold-border);border-radius:2px;overflow:hidden;cursor:pointer;position:relative}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:2px;transition:width .4s ease}
.progress-track:hover .progress-fill{filter:brightness(1.2)}

/* ── PDF EXPORT BUTTON ── */
.btn-pdf{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:transparent;border:1px solid var(--gold-border);border-radius:6px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:all .2s;white-space:nowrap}
.btn-pdf:hover{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
.btn-pdf:disabled{opacity:.4;cursor:not-allowed}
.btn-pdf.premium-only{border-color:${th.accent}44;color:${th.accent}88}

/* ── FOCUS CARD PROGRESS STRIP ── */
.card-progress-strip{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(0,0,0,0.4)}
.card-progress-fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-light));transition:width .3s ease}

@media(max-width:900px){.search-input{width:150px}.books-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}.chat-panel{width:300px}}
@media(max-width:640px){.expanded-body{flex-direction:column}.chat-panel{width:100%;border-left:none;border-top:1px solid var(--gold-border);max-height:42vh}.search-input{display:none}.books-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.8rem}}

/* ── MOBILE RESPONSIVE ── */
@media (max-width: 768px) {
  /* Header */
  .app-header {
    padding: 0 0.75rem;
    height: auto;
    min-height: 56px;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .logo-text { font-size: 0.9rem !important; }
  .logo-sub { display: none !important; }
  .logo-mark { font-size: 1.2rem !important; }
  .header-right { gap: 6px !important; }
  .search-wrap { display: none !important; }
  .btn-premium {
    padding: 6px 10px !important;
    font-size: 10px !important;
  }

  /* Nav tabs pill container */
  nav {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
    max-width: calc(100vw - 180px) !important;
  }
  nav::-webkit-scrollbar { display: none !important; }

  /* Tab pills — smaller on mobile */
  nav button {
    padding: 5px 10px !important;
    font-size: 11px !important;
    white-space: nowrap !important;
  }

  /* Books grid */
  .books-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
    padding: 0 0.75rem !important;
  }

  /* Main content area */
  .main-content {
    padding: 1rem 0.75rem !important;
  }

  .section-title {
    font-size: 1.4rem !important;
  }

  /* Category tabs — horizontally scrollable */
  .cat-tabs {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    flex-wrap: nowrap !important;
    scrollbar-width: none !important;
    padding-bottom: 4px !important;
  }
  .cat-tabs::-webkit-scrollbar { display: none !important }
  .cat-tab {
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    font-size: 12px !important;
    padding: 5px 10px !important;
  }

  /* View tabs */
  .view-tabs {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
  }

  /* Streak bar */
  .streak-bar {
    font-size: 12px !important;
  }

  /* Section count */
  .section-count {
    font-size: 11px !important;
  }

  /* Book cards */
  .book-card, [class*="book-card"] {
    border-radius: 10px !important;
  }
  .book-card img, [class*="book-card"] img {
    border-radius: 8px !important;
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 2/3 !important;
    object-fit: cover !important;
  }
  .book-card-title, [class*="book-title"] {
    font-size: 11px !important;
    line-height: 1.3 !important;
  }

  /* Book detail panel */
  .expanded-panel, [class*="expanded"] {
    width: 100vw !important;
    height: 100vh !important;
    top: 0 !important;
    right: 0 !important;
    left: 0 !important;
    bottom: 0 !important;
    border-radius: 0 !important;
    position: fixed !important;
    overflow-y: auto !important;
  }

  /* Modals */
  .email-modal-wrap > div {
    width: calc(100vw - 2rem) !important;
    margin: 1rem !important;
    padding: 1.5rem !important;
    max-width: 100% !important;
  }

  /* Daily quote */
  .daily-quote {
    padding: 1rem !important;
    margin-bottom: 1rem !important;
  }
  .quote-text {
    font-size: 1rem !important;
    line-height: 1.5 !important;
  }

  /* Upgrade banner */
  .upgrade-banner {
    flex-direction: column !important;
    gap: 12px !important;
    padding: 1rem !important;
    text-align: center !important;
  }
  .upgrade-banner h3 { font-size: 14px !important; }
  .upgrade-banner p { font-size: 12px !important; }

  /* Mobile search button */
  .mobile-search-btn { 
    display: flex !important; 
  }

  /* Recommendations grid */
  .recs-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 8px !important;
  }
  .rec-card img {
    width: 100% !important;
    aspect-ratio: 2/3 !important;
    object-fit: cover !important;
  }
  .rec-card-title {
    font-size: 10px !important;
  }
}

@media (min-width: 769px) {
  .mobile-search-btn { display: none !important; }
}

@media (max-width: 768px) {
  .books-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
    padding: 0 0.75rem !important;
  }
}`

// ── Helpers ───────────────────────────────────────────────────────
function getDailyQuote(books: Book[]) {
  const all: {text:string;source:string}[] = []
  books.forEach(b => (b.key_insights||'').split('\n').forEach(line => {
    const s = line.trim().replace(/^[-•*]\s*/,'')
    if (s) all.push({ text: s, source: b.title })
  }))
  if(!all.length) return null
  return all[Math.floor(Date.now()/86400000) % all.length]
}
function updateStreak() {
  const today=new Date().toDateString(), last=localStorage.getItem('hob_last_visit')
  const n=parseInt(localStorage.getItem('hob_streak')||'0'), yesterday=new Date(Date.now()-86400000).toDateString()
  const s=last===today?n:last===yesterday?n+1:1
  localStorage.setItem('hob_last_visit',today); localStorage.setItem('hob_streak',String(s)); return s
}
// Splits a long-form summary into book-like "pages" — groups whole paragraphs
// (never splitting mid-paragraph) into ~150-200 word chunks.
function paginateSummary(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean)
  const pages: string[] = []
  let current: string[] = [], wordCount = 0
  for (const p of paragraphs) {
    const words = p.split(/\s+/).length
    if (current.length && wordCount + words > 200) {
      pages.push(current.join('\n\n')); current = []; wordCount = 0
    }
    current.push(p); wordCount += words
  }
  if (current.length) pages.push(current.join('\n\n'))
  return pages.length ? pages : [text]
}

// ── Focus Card ───────────────────────────────────────────────────────
const FocusCard = memo(({ book, index, hovered, setHovered, isLocked, shelfStatus, onToggleShelf, onOpen }: any) => {
  const onShelf = shelfStatus && shelfStatus !== 'none'
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      style={{
        background: '#1a1813',
        border: '0.5px solid rgba(201,168,76,0.2)',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .25s, border-color .25s',
        transform: hovered === index ? 'translateY(-4px)' : 'translateY(0)',
        borderColor: hovered === index ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.2)',
        position: 'relative',
        userSelect: 'none' as any,
      }}
    >
      {/* FREE / lock badge — top-left */}
      {isLocked ? (
        <div style={{
          position:'absolute',top:'8px',left:'8px',
          width:'22px',height:'22px',
          background:'rgba(10,10,15,0.9)',
          border:'0.5px solid rgba(201,168,76,0.4)',
          borderRadius:'50%',display:'flex',
          alignItems:'center',justifyContent:'center',
          fontSize:'10px',zIndex:2
        }}>🔒</div>
      ) : (
        <div style={{
          position:'absolute',top:'8px',left:'8px',
          background:'#c9a84c',color:'#0a0a0f',
          fontSize:'9px',padding:'2px 7px',
          borderRadius:'20px',letterSpacing:'.08em',
          fontWeight:'600',zIndex:2
        }}>FREE</div>
      )}
      {/* Save-to-shelf bookmark — top-right; stops propagation so it doesn't open the book */}
      <button
        onClick={e => { e.stopPropagation(); onToggleShelf && onToggleShelf() }}
        title={onShelf ? 'Remove from My Shelf' : 'Save to My Shelf'}
        aria-label={onShelf ? 'Remove from My Shelf' : 'Save to My Shelf'}
        style={{
          position:'absolute',top:'8px',right:'8px',
          width:'26px',height:'26px',zIndex:3,
          background: onShelf ? '#c9a84c' : 'rgba(10,10,15,0.78)',
          border:'0.5px solid rgba(201,168,76,0.5)',
          borderRadius:'50%',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'12px',lineHeight:1,
          color: onShelf ? '#0a0a0f' : '#e8cf8a',
          transition:'background .18s, transform .18s',
        }}
        onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform='scale(1.12)'}}
        onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='none'}}
      >🔖</button>
      <img
        src={book.cover_url || `https://picsum.photos/seed/${book.id}/200/300`}
        alt={book.title}
        onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/200/300` }}
        style={{
          width:'100%',aspectRatio:'2/3',
          objectFit:'cover',display:'block',
        }}
      />
      <div style={{padding:'10px 10px 12px'}}>
        <div style={{
          display:'inline-block',
          background:'rgba(201,168,76,0.12)',
          border:'0.5px solid rgba(201,168,76,0.3)',
          borderRadius:'20px',padding:'2px 8px',
          fontSize:'10px',color:'#c9a84c',
          letterSpacing:'.06em',marginBottom:'6px'
        }}>{book.category || 'Book'}</div>
        <div style={{
          fontSize:'12px',color:'#e8e4d9',
          lineHeight:'1.4',marginBottom:'3px',fontWeight:'500',
          display:'-webkit-box',
          WebkitLineClamp:2,
          WebkitBoxOrient:'vertical' as any,
          overflow:'hidden'
        }}>{book.title}</div>
        <div style={{fontSize:'11px',color:'#9a9080',marginBottom:'4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{book.author}</div>
        <div style={{fontSize:'10px',color:'#9a9080'}}>{(book as any).read_time_mins || 15} min read</div>
      </div>
    </div>
  )
})
FocusCard.displayName = 'FocusCard'

// ── Payment modal — plan picker + PayPal Subscriptions checkout ──
// PayPal is the sole payment provider (Stripe was removed). PayPal's own
// checkout still lets a payer without a PayPal account pay by card as guest
// in most countries, so this isn't a card-payment regression — just one
// checkout brand instead of several.
function PaymentModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Logged-out demo/sample visitors have no email yet — capture it here so they
  // can subscribe straight from the sample.
  const [emailInput, setEmailInput] = useState(email || '')
  const effEmail = (email || emailInput).trim()

  const startCheckout = async () => {
    if (!effEmail || !effEmail.includes('@')) {
      setError('Enter your email first so we know who to unlock.')
      return
    }
    setError(''); setLoading(true)
    track('subscribe_click', { plan })
    try {
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-paypal-subscription', plan, email: effEmail }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.approveUrl) throw new Error(j?.error || 'PayPal checkout unavailable right now.')
      window.location.href = j.approveUrl
    } catch {
      setError('Something went wrong starting checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="email-modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:'var(--modal-bg)',border:'1px solid var(--gold-border)',borderRadius:'16px',padding:'2rem',maxWidth:'420px',width:'100%'}}>
        <h3 style={{fontFamily:'Georgia,serif',fontSize:'1.5rem',color:'var(--gold)',marginBottom:'4px'}}>House of Books Premium</h3>
        <p style={{color:'var(--text-muted)',fontSize:'12px',marginBottom:'1.25rem'}}>All 304 books · Unlimited AI chat · Offline audio</p>

        {!email && (
          <input
            type="email"
            placeholder="your@email.com"
            value={emailInput}
            onChange={e=>setEmailInput(e.target.value)}
            autoComplete="email"
            style={{width:'100%',padding:'11px 13px',background:'var(--input-bg)',border:'1px solid var(--gold-border)',borderRadius:'10px',color:'var(--text)',fontSize:'14px',outline:'none',marginBottom:'1rem',direction:'ltr',boxSizing:'border-box'}}
          />
        )}

        <div style={{display:'flex',gap:'8px',marginBottom:'1.25rem'}}>
          <button
            onClick={() => setPlan('monthly')}
            style={{flex:1,padding:'10px',borderRadius:'10px',fontFamily:'Georgia,serif',fontSize:'13px',cursor:'pointer',
              background: plan==='monthly' ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.03)',
              border: plan==='monthly' ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: plan==='monthly' ? '#c9a84c' : 'var(--text-muted)'}}
          >Monthly<br/><strong style={{fontSize:'15px'}}>$8.99</strong></button>
          <button
            onClick={() => setPlan('yearly')}
            style={{flex:1,padding:'10px',borderRadius:'10px',fontFamily:'Georgia,serif',fontSize:'13px',cursor:'pointer',position:'relative',
              background: plan==='yearly' ? 'rgba(201,168,76,0.16)' : 'rgba(255,255,255,0.03)',
              border: plan==='yearly' ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: plan==='yearly' ? '#c9a84c' : 'var(--text-muted)'}}
          >Yearly<br/><strong style={{fontSize:'15px'}}>$85</strong> <span style={{fontSize:'10px',opacity:0.7}}>(save 21%)</span></button>
        </div>

        <button
          onClick={startCheckout}
          disabled={loading}
          style={{
            width:'100%',padding:'13px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
            background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(201,168,76,0.25)',borderRadius:'12px',
            color:'#e8e4d9',fontSize:'14px',fontFamily:'Georgia,serif',fontWeight:600,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            marginBottom:'10px',
          }}
        >
          <span style={{fontSize:'16px'}}>🅿️</span>
          {loading ? 'Redirecting…' : 'Continue with PayPal'}
        </button>

        <p style={{fontSize:'10px',color:'var(--text-muted)',lineHeight:1.5,marginTop:'4px'}}>
          Renews automatically each period — cancel anytime from your PayPal account. You can also pay by card as a guest through PayPal's checkout.
        </p>
        {error && <p style={{fontSize:'12px',color:'#e07a7a',marginTop:'10px'}}>{error}</p>}
        <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',marginTop:'14px',display:'block',width:'100%'}}>Cancel</button>
      </div>
    </div>
  )
}

// ── Expanded reader panel ─────────────────────────────────────────
// ── Audio Summary player (ElevenLabs via /api/voice) ─────────────
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AudioSummary({ text, bookId, category, audioUrl, onCached }: { text?: string; bookId: string; category?: string; audioUrl?: string; onCached?: (bookId: string, url: string) => void }) {
  const [state, setState] = useState<'idle'|'loading'|'playing'|'paused'|'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const scrubbingRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const loadedForRef = useRef<string>('')
  const barRef = useRef<HTMLDivElement | null>(null)

  const setScrub = (v: boolean) => { scrubbingRef.current = v; setScrubbing(v) }

  const attachTimeListeners = (audio: HTMLAudioElement) => {
    audio.ontimeupdate = () => { if (!scrubbingRef.current) setCurrentTime(audio.currentTime) }
    audio.onloadedmetadata = () => setDuration(audio.duration)
    audio.ondurationchange = () => setDuration(audio.duration)
  }

  // Stop + reset when switching books or unmounting (nothing to revoke —
  // narration lives at a permanent Supabase Storage URL, not a blob).
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null; loadedForRef.current = ''
      setCurrentTime(0); setDuration(0)
    }
  }, [bookId])

  const toggle = async () => {
    if (!text?.trim()) return
    if (state === 'playing') { audioRef.current?.pause(); setState('paused'); return }
    if (state === 'idle') track('listen_narration', { category })
    if (audioRef.current && loadedForRef.current === bookId) {
      try { await audioRef.current.play(); setState('playing') } catch { setState('paused') }
      return
    }

    // Already narrated and cached — play the stored file directly, no
    // server round-trip and no ElevenLabs cost at all.
    if (audioUrl) {
      setState('loading')
      const audio = new Audio(audioUrl)
      audio.onended = () => setState('paused')
      attachTimeListeners(audio)
      audioRef.current = audio
      loadedForRef.current = bookId
      try { await audio.play(); setState('playing') } catch { setState('paused') }
      return
    }

    setState('loading'); setErrorMsg('')
    try {
      const r = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, text, category }),
        signal: AbortSignal.timeout(75000),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(r.status === 429
          ? 'Listening limit reached — try again in a bit.'
          : (j.error || 'Audio unavailable right now.'))
      }
      if (!j.url) throw new Error('Audio unavailable right now.')
      onCached?.(bookId, j.url)
      const audio = new Audio(j.url)
      audio.onended = () => setState('paused')
      attachTimeListeners(audio)
      audioRef.current = audio
      loadedForRef.current = bookId
      try {
        await audio.play()
        setState('playing')
      } catch {
        // Autoplay blocked (the click "gesture" expired during generation).
        // Audio is ready — the next tap plays instantly.
        setState('paused')
      }
    } catch (e: any) {
      setState('error')
      setErrorMsg(e?.name === 'TimeoutError'
        ? 'Audio is taking too long — please try again.'
        : (e.message || 'Audio unavailable right now.'))
    }
  }

  const seekToClientX = (clientX: number) => {
    const audio = audioRef.current
    const bar = barRef.current
    if (!audio || !bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const t = pct * duration
    audio.currentTime = t
    setCurrentTime(t)
  }

  const skip = (delta: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const t = Math.min(duration, Math.max(0, audio.currentTime + delta))
    audio.currentTime = t
    setCurrentTime(t)
  }

  const disabled = !text?.trim()
  const hasAudio = !!audioRef.current && loadedForRef.current === bookId
  const pct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div style={{marginBottom:'16px'}}>
      <div style={{
        display:'flex',alignItems:'center',gap:'12px',
        background: state==='playing' ? 'rgba(201,168,76,0.14)' : 'rgba(201,168,76,0.07)',
        border:'0.5px solid rgba(201,168,76,0.3)',
        borderRadius:'16px',padding:'14px 16px',
        transition:'background .25s',
      }}>
        <button
          onClick={toggle}
          disabled={disabled || state === 'loading'}
          aria-label={state === 'playing' ? 'Pause' : 'Play'}
          style={{
            width:'44px',height:'44px',flexShrink:0,borderRadius:'50%',
            background: disabled ? 'rgba(255,255,255,0.06)' : '#c9a84c',
            border:'none',display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'16px',color: disabled ? '#6a6458' : '#0a0a0f',
            cursor: disabled || state==='loading' ? 'default' : 'pointer',
            opacity: state==='loading' ? 0.6 : 1,
            transition:'transform .15s',
            boxShadow: !disabled ? '0 4px 14px rgba(201,168,76,0.35)' : 'none',
          }}
          onMouseEnter={e=>{ if(!disabled) (e.currentTarget as HTMLButtonElement).style.transform='scale(1.06)' }}
          onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform='none' }}
        >
          {state === 'loading' ? '⏳' : state === 'playing' ? '⏸' : '▶'}
        </button>

        <div style={{flex:1,minWidth:0}}>
          {disabled ? (
            <div style={{fontSize:'13px',color:'#6a6458',fontFamily:'Georgia,serif'}}>Generate the AI summary first to listen</div>
          ) : state === 'idle' ? (
            <div style={{fontSize:'13px',color:'#c9a84c',fontFamily:'Georgia,serif'}}>Listen to this summary</div>
          ) : (
            <>
              <div
                ref={barRef}
                onClick={e => seekToClientX(e.clientX)}
                onMouseDown={e => { setScrub(true); seekToClientX(e.clientX) }}
                onMouseMove={e => { if (e.buttons === 1 && scrubbingRef.current) seekToClientX(e.clientX) }}
                onMouseUp={() => setScrub(false)}
                onMouseLeave={() => setScrub(false)}
                style={{
                  position:'relative',width:'100%',height:'14px',
                  cursor: hasAudio ? 'pointer' : 'default',
                  display:'flex',alignItems:'center',
                }}
              >
                <div style={{width:'100%',height:'4px',borderRadius:'4px',background:'rgba(255,255,255,0.12)',position:'relative',overflow:'visible'}}>
                  <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${pct}%`,borderRadius:'4px',background:'#c9a84c',transition: scrubbing ? 'none' : 'width .1s linear'}}/>
                  <div style={{
                    position:'absolute',top:'50%',left:`${pct}%`,
                    width:'11px',height:'11px',borderRadius:'50%',
                    background:'#e8e4d9',transform:'translate(-50%,-50%)',
                    boxShadow:'0 1px 4px rgba(0,0,0,0.5)',
                    opacity: hasAudio ? 1 : 0,
                  }}/>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#9a9080',marginTop:'2px',fontFamily:'Georgia,serif'}}>
                <span>{formatTime(currentTime)}</span>
                <span>{duration ? formatTime(duration) : '--:--'}</span>
              </div>
            </>
          )}
        </div>

        {!disabled && state !== 'idle' && (
          <div style={{display:'flex',gap:'4px',flexShrink:0}}>
            <button
              onClick={() => skip(-15)}
              disabled={!hasAudio}
              aria-label="Back 15 seconds"
              style={{width:'30px',height:'30px',borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'none',color:'#e8e4d9',fontSize:'12px',cursor: hasAudio?'pointer':'default',opacity: hasAudio?1:0.4}}
            >⟲15</button>
            <button
              onClick={() => skip(15)}
              disabled={!hasAudio}
              aria-label="Forward 15 seconds"
              style={{width:'30px',height:'30px',borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'none',color:'#e8e4d9',fontSize:'12px',cursor: hasAudio?'pointer':'default',opacity: hasAudio?1:0.4}}
            >15⟳</button>
          </div>
        )}
      </div>
      {state === 'error' && (
        <div style={{fontSize:'11px',color:'#e07a7a',marginTop:'6px',fontFamily:'Georgia,serif'}}>{errorMsg}</div>
      )}
    </div>
  )
}

function ExpandedPanel({
  book, t, shelfStatus, progress, exportingPDF, detailLoading,
  currentNote, noteSaved, chatMessages, chatInput, chatLoading, chatStreaming,
  summaryLoading, onClose, onShelf, onProgress, onExportPDF, onSaveNote,
  onNoteChange, onToggleChat, onGenerateSummary, onAudioCached, onSendMessage, onChatInput,
  chatEndRef
}: any) {
  const chatBusy = chatLoading || chatStreaming
  const [activeTab, setActiveTab] = useState<'about'|'full'|'insights'|'shelf'|'chat'>('about')
  const [fullSummaryPage, setFullSummaryPage] = useState(0)
  useEffect(()=>{setFullSummaryPage(0)},[book.id])
  // Memoized so the ~2000+ word long_summary isn't re-paginated on every
  // chat-stream tick (chatMessages, a prop here, mutates ~every 35ms during
  // the typewriter reveal regardless of which tab is active).
  const fullSummaryPages = useMemo(
    () => book.long_summary ? paginateSummary(book.long_summary) : [],
    [book.long_summary]
  )

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw',
        height: '100vh',
        background: '#0f0e0b',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* TOP BAR */}
      <div style={{
        display:'flex',alignItems:'center',gap:'12px',
        padding:'14px 16px',
        background:'rgba(15,14,11,0.85)',
        backdropFilter:'blur(12px)',
        WebkitBackdropFilter:'blur(12px)',
        borderBottom:'0.5px solid rgba(255,255,255,0.06)',
        flexShrink:0,
        position:'relative',zIndex:2,
      }}>
        <button
          onClick={onClose}
          style={{
            width:'36px',height:'36px',
            background:'rgba(255,255,255,0.06)',
            border:'none',borderRadius:'50%',
            color:'#e8e4d9',fontSize:'18px',
            cursor:'pointer',display:'flex',
            alignItems:'center',justifyContent:'center',
            fontFamily:'Georgia,serif',
            transition:'background .2s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.12)'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.06)'}}
        >←</button>
        <div style={{
          fontSize:'15px',color:'#e8e4d9',fontWeight:'500',
          flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
          fontFamily:'Georgia,serif',
        }}>{book.title}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button
            onClick={() => onShelf(shelfStatus === 'want' ? 'none' : 'want')}
            style={{
              width:'36px',height:'36px',
              background: shelfStatus !== 'none' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
              border:'none',borderRadius:'50%',
              color: shelfStatus !== 'none' ? '#c9a84c' : '#e8e4d9',
              fontSize:'14px',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'background .2s',
            }}
          >🔖</button>
        </div>
      </div>

      {/* HERO — blurred cover backdrop + cover + info */}
      <div style={{position:'relative',overflow:'hidden',flexShrink:0}}>
        <div style={{
          position:'absolute',inset:0,
          backgroundImage:`url(${book.cover_url || `https://picsum.photos/seed/${book.id}/200/300`})`,
          backgroundSize:'cover',backgroundPosition:'center',
          filter:'blur(28px) saturate(1.4) brightness(0.55)',
          transform:'scale(1.2)',
        }}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(10,9,7,0.35) 0%, rgba(10,9,7,0.88) 100%)'}}/>
        <div style={{
          position:'relative',zIndex:1,
          display:'flex',alignItems:'center',
          padding:'24px 20px',gap:'20px',
          borderBottom:'0.5px solid rgba(201,168,76,0.12)',
        }}>
          <img
            src={book.cover_url || `https://picsum.photos/seed/${book.id}/200/300`}
            alt={book.title}
            onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/200/300` }}
            style={{
              width:'96px',height:'138px',
              objectFit:'cover',borderRadius:'12px',
              border:'1.5px solid rgba(201,168,76,0.45)',
              boxShadow:'0 12px 32px rgba(0,0,0,0.6)',
              flexShrink:0,
            }}
          />
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'11px',color:'#c9a84c',marginBottom:'8px',fontFamily:'Georgia,serif',letterSpacing:'.04em'}}>
              {(book as any).read_time_mins || 15} min · AI Summary
            </div>
            <div style={{
              fontSize:'1.3rem',color:'#f2efe6',fontWeight:'600',
              lineHeight:'1.25',marginBottom:'6px',fontFamily:'Georgia,serif',
              textShadow:'0 2px 12px rgba(0,0,0,0.4)',
            }}>{book.title}</div>
            <div style={{fontSize:'12px',color:'#c4bfb2',fontStyle:'italic',marginBottom:'12px',fontFamily:'Georgia,serif'}}>
              by {book.author}
            </div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              <div style={{background:'rgba(201,168,76,0.14)',border:'0.5px solid rgba(201,168,76,0.3)',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',color:'#e8cf8a'}}>
                {book.category}
              </div>
              <div style={{background:'rgba(201,168,76,0.14)',border:'0.5px solid rgba(201,168,76,0.3)',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',color:'#e8cf8a'}}>
                ✦ AI Ready
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{
        display:'flex',gap:'10px',padding:'16px',
        flexShrink:0,
        borderBottom:'0.5px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => setActiveTab('about')}
          style={{
            flex:2,padding:'13px',
            background:'linear-gradient(135deg,#e0be6f,#c9a84c)',color:'#0a0a0f',
            border:'none',borderRadius:'13px',
            fontSize:'14px',cursor:'pointer',
            fontFamily:'Georgia,serif',fontWeight:'700',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
            boxShadow:'0 6px 18px rgba(201,168,76,0.3)',
            transition:'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 8px 22px rgba(201,168,76,0.42)'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='none';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 6px 18px rgba(201,168,76,0.3)'}}
        >▶ Read Now</button>
        <button
          onClick={() => { setActiveTab('chat'); onToggleChat() }}
          style={{
            flex:1,padding:'13px',
            background:'rgba(201,168,76,0.12)',color:'#c9a84c',
            border:'0.5px solid rgba(201,168,76,0.3)',borderRadius:'13px',
            fontSize:'13px',cursor:'pointer',
            fontFamily:'Georgia,serif',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',
            transition:'background .2s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(201,168,76,0.2)'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(201,168,76,0.12)'}}
        >✦ AI Chat</button>
      </div>

      {/* TABS */}
      <div style={{
        display:'flex',position:'relative',
        borderBottom:'0.5px solid rgba(255,255,255,0.06)',
        flexShrink:0,padding:'0 16px',
        overflowX:'auto',
        scrollbarWidth:'none' as any,
      }}>
        {(['about','full','insights','shelf','chat'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              position:'relative',
              padding:'12px 16px',
              fontSize:'13px',
              color: activeTab === tab ? '#c9a84c' : '#9a9080',
              cursor:'pointer',border:'none',background:'none',
              fontFamily:'Georgia,serif',
              transition:'color .2s',
              whiteSpace:'nowrap',flexShrink:0,
            }}
          >
            {tab === 'about' ? 'About' : tab === 'full' ? t.fullSummary : tab === 'insights' ? 'Key Insights' : tab === 'shelf' ? 'My Shelf' : '✦ AI Chat'}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                style={{position:'absolute',left:8,right:8,bottom:0,height:'2px',background:'#c9a84c',borderRadius:'2px'}}
              />
            )}
          </button>
        ))}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{
        flex:1,overflowY:'auto',
        padding:'20px 16px',
        WebkitOverflowScrolling:'touch' as any,
      }}>
      {/* Tab content renders as plain keyed conditionals — this was wrapped in
          <AnimatePresence mode="wait">, whose exit step never completed and
          permanently froze the panel on the About tab (tabs unreachable). */}
        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'6px',fontFamily:'Georgia,serif'}}>
              What's it about?
            </div>
            <div style={{fontSize:'10px',color:'#6a6458',marginBottom:'12px',fontFamily:'Georgia,serif',fontStyle:'italic'}}>
              AI-generated summary for informational purposes — not affiliated with or endorsed by the author or publisher.
            </div>
            <div style={{fontSize:'14px',color:'#9a9080',lineHeight:'1.8',marginBottom:'20px',fontFamily:'Georgia,serif'}}>
              {book.summary || (detailLoading ? '✦ Loading summary…' : 'Click ✦ AI Summary to generate a comprehensive summary of this book.')}
            </div>
            {!book.summary && !detailLoading && (
              <button
                onClick={onGenerateSummary}
                style={{
                  width:'100%',padding:'12px',
                  background:'rgba(201,168,76,0.12)',
                  color:'#c9a84c',
                  border:'0.5px solid rgba(201,168,76,0.3)',
                  borderRadius:'12px',fontSize:'14px',
                  cursor:'pointer',fontFamily:'Georgia,serif',
                  marginBottom:'16px',
                }}
              >
                {summaryLoading ? '✦ Generating...' : '✦ Generate AI Summary'}
              </button>
            )}
            <div style={{fontSize:'13px',color:'#e8e4d9',fontWeight:'500',marginBottom:'8px',fontFamily:'Georgia,serif'}}>
              Audio Summary
            </div>
            <AudioSummary text={book.summary} bookId={book.id} category={book.category} audioUrl={book.audio_url} onCached={onAudioCached} />
          </motion.div>
        )}

        {/* FULL SUMMARY TAB — long-form, paginated */}
        {activeTab === 'full' && (
          <motion.div key="full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'6px',fontFamily:'Georgia,serif'}}>
              {t.fullSummary}
            </div>
            <div style={{fontSize:'10px',color:'#6a6458',marginBottom:'16px',fontFamily:'Georgia,serif',fontStyle:'italic'}}>
              AI-generated summary for informational purposes — not affiliated with or endorsed by the author or publisher.
            </div>
            {book.long_summary ? (() => {
              const pages = fullSummaryPages
              const page = Math.min(fullSummaryPage, pages.length - 1)
              return (
                <>
                  <div style={{
                    background:'rgba(201,168,76,0.05)',
                    border:'0.5px solid rgba(201,168,76,0.15)',
                    borderRadius:'14px',padding:'18px 20px',marginBottom:'14px',
                    fontSize:'14px',color:'#e8e4d9',lineHeight:'1.85',
                    fontFamily:'Georgia,serif',whiteSpace:'pre-line',
                    minHeight:'240px',
                  }}>
                    {pages[page]}
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
                    <button
                      onClick={() => setFullSummaryPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      style={{
                        padding:'9px 16px',borderRadius:'10px',fontFamily:'Georgia,serif',fontSize:'13px',
                        background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(201,168,76,0.25)',
                        color: page === 0 ? '#4a463d' : '#c9a84c',
                        cursor: page === 0 ? 'default' : 'pointer',
                      }}
                    >← Previous</button>
                    <div style={{fontSize:'11px',color:'#9a9080',letterSpacing:'.05em'}}>
                      Page {page + 1} of {pages.length}
                    </div>
                    <button
                      onClick={() => setFullSummaryPage(p => Math.min(pages.length - 1, p + 1))}
                      disabled={page === pages.length - 1}
                      style={{
                        padding:'9px 16px',borderRadius:'10px',fontFamily:'Georgia,serif',fontSize:'13px',
                        background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(201,168,76,0.25)',
                        color: page === pages.length - 1 ? '#4a463d' : '#c9a84c',
                        cursor: page === pages.length - 1 ? 'default' : 'pointer',
                      }}
                    >Next →</button>
                  </div>
                </>
              )
            })() : (
              <div style={{fontSize:'14px',color:'#9a9080',lineHeight:'1.8',marginBottom:'20px',fontFamily:'Georgia,serif'}}>
                Full summary not available yet — check back soon.
              </div>
            )}
            <div style={{
              display:'flex',alignItems:'center',gap:'10px',
              background:'rgba(201,168,76,0.07)',border:'0.5px solid rgba(201,168,76,0.2)',
              borderRadius:'14px',padding:'14px 16px',
            }}>
              <span style={{fontSize:'16px'}}>🎧</span>
              <span style={{fontSize:'13px',color:'#c9a84c',fontFamily:'Georgia,serif'}}>{t.audioComingSoon}</span>
            </div>
          </motion.div>
        )}

        {/* KEY INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <motion.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'8px',fontFamily:'Georgia,serif'}}>
              Key Insights
            </div>
            <div style={{fontSize:'12px',color:'#9a9080',marginBottom:'16px',fontFamily:'Georgia,serif'}}>
              Core ideas distilled by AI
            </div>
            {book.key_insights ? (
              book.key_insights.split('\n').filter((i: string) => i.trim()).map((insight: string, idx: number) => (
                <div key={idx} style={{
                  display:'flex',gap:'12px',alignItems:'flex-start',
                  background:'rgba(201,168,76,0.05)',
                  border:'0.5px solid rgba(201,168,76,0.15)',
                  borderRadius:'14px',padding:'14px 16px',
                  fontSize:'13px',color:'#e8e4d9',lineHeight:'1.65',
                  marginBottom:'10px',fontFamily:'Georgia,serif',
                  transition:'background .2s, border-color .2s',
                }}>
                  <div style={{
                    width:'24px',height:'24px',borderRadius:'50%',flexShrink:0,
                    background:'linear-gradient(135deg,#e0be6f,#c9a84c)',
                    color:'#0a0a0f',fontSize:'11px',fontWeight:'700',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    marginTop:'1px',
                  }}>{idx+1}</div>
                  <div>{insight.replace(/^[-•*]\s*/,'')}</div>
                </div>
              ))
            ) : detailLoading ? (
              <div style={{fontSize:'13px',color:'#c9a84c',fontFamily:'Georgia,serif',padding:'8px 0'}}>✦ Loading insights…</div>
            ) : (
              <button
                onClick={onGenerateSummary}
                style={{
                  width:'100%',padding:'12px',
                  background:'rgba(201,168,76,0.12)',color:'#c9a84c',
                  border:'0.5px solid rgba(201,168,76,0.3)',
                  borderRadius:'12px',fontSize:'14px',
                  cursor:'pointer',fontFamily:'Georgia,serif',
                }}
              >
                {summaryLoading ? '✦ Generating...' : '✦ Generate Key Insights'}
              </button>
            )}
          </motion.div>
        )}

        {/* MY SHELF TAB */}
        {activeTab === 'shelf' && (
          <motion.div key="shelf" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'16px',fontFamily:'Georgia,serif'}}>
              My Reading
            </div>
            {/* Shelf status buttons */}
            <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
              {(['want','reading','finished'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => onShelf(s)}
                  style={{
                    flex:1,padding:'9px 6px',
                    background: shelfStatus === s ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                    border: shelfStatus === s ? '0.5px solid rgba(201,168,76,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius:'10px',
                    color: shelfStatus === s ? '#c9a84c' : '#9a9080',
                    fontSize:'11px',cursor:'pointer',
                    fontFamily:'Georgia,serif',textAlign:'center' as any,
                    transition:'all .2s',
                  }}
                >
                  {s === 'want' ? '🔖 Want' : s === 'reading' ? '📖 Reading' : '✅ Finished'}
                </button>
              ))}
            </div>
            {/* Progress */}
            <div style={{marginBottom:'20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#9a9080',marginBottom:'6px',letterSpacing:'.06em',textTransform:'uppercase',fontFamily:'Georgia,serif'}}>
                <span>Reading Progress</span>
                <span style={{color:'#c9a84c'}}>{progress}%</span>
              </div>
              <div style={{width:'100%',background:'rgba(255,255,255,0.06)',borderRadius:'4px',height:'5px',marginBottom:'10px'}}>
                <div style={{height:'5px',background:'linear-gradient(90deg,#c9a84c,#e0be6f)',borderRadius:'4px',width:`${progress}%`,transition:'width .3s'}}/>
              </div>
              <input
                type="range" min="0" max="100" value={progress}
                onChange={e => onProgress(Number(e.target.value))}
                style={{width:'100%',accentColor:'#c9a84c'}}
              />
            </div>
            {/* Notes */}
            <div style={{fontSize:'13px',color:'#e8e4d9',fontWeight:'500',marginBottom:'12px',fontFamily:'Georgia,serif'}}>My Notes</div>
            <textarea
              value={currentNote}
              onChange={e => onNoteChange(e.target.value)}
              placeholder={t.notesPlaceholder}
              style={{
                width:'100%',minHeight:'100px',
                background:'rgba(255,255,255,0.03)',
                border:'0.5px solid rgba(201,168,76,0.2)',
                borderRadius:'12px',padding:'12px',
                color:'#e8e4d9',fontSize:'13px',
                fontFamily:'Georgia,serif',resize:'none',outline:'none',
              }}
            />
            <button
              onClick={() => onSaveNote(currentNote)}
              style={{
                marginTop:'10px',width:'100%',padding:'10px',
                background:'rgba(201,168,76,0.12)',
                border:'0.5px solid rgba(201,168,76,0.3)',
                borderRadius:'10px',color:'#c9a84c',
                fontSize:'13px',cursor:'pointer',fontFamily:'Georgia,serif',
              }}
            >{noteSaved ? 'Saved ✓' : 'Save Notes'}</button>
            <button
              onClick={onExportPDF}
              style={{
                marginTop:'8px',width:'100%',padding:'10px',
                background:'rgba(255,255,255,0.03)',
                border:'0.5px solid rgba(255,255,255,0.08)',
                borderRadius:'10px',color:'#9a9080',
                fontSize:'12px',cursor:'pointer',fontFamily:'Georgia,serif',
              }}
            >{exportingPDF ? 'Exporting…' : 'Export Insights PDF'}</button>
          </motion.div>
        )}

        {/* AI CHAT TAB */}
        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'8px',fontFamily:'Georgia,serif'}}>
              ✦ AI Book Expert
            </div>
            <div style={{fontSize:'12px',color:'#9a9080',marginBottom:'16px',fontFamily:'Georgia,serif'}}>
              Ask me anything about "{book.title}"
            </div>
            <div style={{
              background:'rgba(201,168,76,0.04)',
              border:'0.5px solid rgba(201,168,76,0.15)',
              borderRadius:'14px',padding:'16px',marginBottom:'16px',
            }}>
              {chatMessages.length === 0 && (
                <div style={{
                  fontSize:'13px',color:'#9a9080',lineHeight:'1.6',
                  padding:'10px 12px',borderRadius:'14px 14px 14px 4px',
                  background:'rgba(255,255,255,0.04)',
                  marginBottom:'8px',fontFamily:'Georgia,serif',
                  marginRight:'20px',
                }}>
                  Hello! I have read every word of "{book.title}". What would you like to explore?
                </div>
              )}
              {chatMessages.map((msg: any, i: number) => {
                const isTyping = chatStreaming && msg.role === 'assistant' && i === chatMessages.length - 1
                return (
                <div key={i} style={{
                  fontSize:'13px',color:'#e8e4d9',lineHeight:'1.6',
                  padding:'10px 12px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  marginBottom:'8px',fontFamily:'Georgia,serif',
                  background: msg.role === 'user' ? 'rgba(201,168,76,0.14)' : 'rgba(255,255,255,0.04)',
                  marginLeft: msg.role === 'user' ? '20px' : '0',
                  marginRight: msg.role === 'assistant' ? '20px' : '0',
                }}>
                  {msg.content}
                  {isTyping && <span style={{display:'inline-block',width:'2px',height:'1em',background:'#c9a84c',marginLeft:'2px',verticalAlign:'text-bottom',animation:'hobBlink 1s step-end infinite'}}/>}
                </div>
              )})}
              {chatLoading && (
                <div style={{fontSize:'12px',color:'#c9a84c',padding:'8px',fontFamily:'Georgia,serif'}}>✦ Thinking...</div>
              )}
              <div ref={chatEndRef}/>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <textarea
                  value={chatInput}
                  onChange={e => onChatInput(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(!chatBusy)onSendMessage(chatInput)} }}
                  placeholder={t.askPlaceholder}
                  rows={2}
                  style={{
                    flex:1,background:'rgba(255,255,255,0.04)',
                    border:'0.5px solid rgba(201,168,76,0.3)',
                    borderRadius:'10px',padding:'9px 12px',
                    fontSize:'13px',color:'#e8e4d9',
                    fontFamily:'Georgia,serif',resize:'none',outline:'none',
                  }}
                />
                <button
                  onClick={() => onSendMessage(chatInput)}
                  disabled={chatBusy || !chatInput.trim()}
                  style={{
                    background:'#c9a84c',border:'none',
                    borderRadius:'10px',width:'40px',
                    cursor:'pointer',fontSize:'16px',
                    color:'#0a0a0f',flexShrink:0,
                    opacity: chatBusy || !chatInput.trim() ? 0.5 : 1,
                  }}
                >→</button>
              </div>
            </div>
            <div style={{fontSize:'10px',color:'#9a9080',textAlign:'center',paddingBottom:'1rem',fontFamily:'Georgia,serif'}}>
              10 free AI chats · Resets every 6 hours
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main App Component ─────────────────────────────
export default function App() {
  const [loading,setLoading]=useState(true)
  const [appReady, setAppReady] = useState(false)
  const [books,setBooks]=useState<Book[]>([])
  const [selectedBook,setSelectedBook]=useState<Book|null>(null)
  const [searchQuery,setSearchQuery]=useState('')
  const [activeView,setActiveView]=useState<'all'|'shelf'>('all')
  const [activeCategory,setActiveCategory]=useState('All')
  const [searchInside,setSearchInside]=useState('')
  const [chatMessages,setChatMessages]=useState<ChatMessage[]>([])
  const [chatInput,setChatInput]=useState('')
  const [chatLoading,setChatLoading]=useState(false)
  const [chatStreaming,setChatStreaming]=useState(false)
  const [summaryLoading,setSummaryLoading]=useState(false)
  const [showEmailModal,setShowEmailModal]=useState(false)
  const [showPaymentModal,setShowPaymentModal]=useState(false)
  const [paypalReturnStatus,setPaypalReturnStatus]=useState<'idle'|'confirming'|'done'|'error'>('idle')
  const [themeId,setThemeId]=useState('classic')
  const [langId,setLangId]=useState('en')
  const [showThemeMenu,setShowThemeMenu]=useState(false)
  const [showMusicMenu,setShowMusicMenu]=useState(false)
  const [showLangMenu,setShowLangMenu]=useState(false)
  const [currentTrack,setCurrentTrack]=useState('')
  const [isPlaying,setIsPlaying]=useState(false)
  const [volume,setVolume]=useState(0.4)
  const [userEmail,setUserEmail]=useState<string>(
    () => localStorage.getItem('userEmail') || ''
  )
  // Set ONLY from a verified Supabase session (never from localStorage on
  // mount, a typed input, or any other client-controlled source). This is
  // the sole source of truth for admin gating — `userEmail` above is also
  // used for the self-serve "check premium by email" flow and is trivially
  // editable by the user, so it must never be trusted for admin access.
  const [authedEmail,setAuthedEmail]=useState<string>('')
  const [isPremium,setIsPremium]=useState(false)
  const [shelf,setShelf]=useState<BookShelf>({})
  const [notes,setNotes]=useState<BookNotes>({})
  const [currentNote,setCurrentNote]=useState('')
  const [noteSaved,setNoteSaved]=useState(false)
  const [streak,setStreak]=useState(0)
  const [recommendations,setRecommendations]=useState<Book[]>([])
  const [loadingRecs,setLoadingRecs]=useState(false)
  const [readingProgress,setReadingProgress]=useState<ReadingProgress>({})
  const [exportingPDF,setExportingPDF]=useState(false)
  const [showUserDashboard,setShowUserDashboard]=useState(false)
  const [aiChatCount,setAiChatCount]=useState(()=>getChatUses().count)
  const [isTrial,setIsTrial]=useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('library')
  const [emailInput, setEmailInput] = useState('')
  const [appFlow, setAppFlow] = useState<AppFlow>(
    () => IS_DEMO ? 'app' : (localStorage.getItem('userEmail') ? 'app' : 'login')
  )
  const [loginStatus, setLoginStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [loginError, setLoginError] = useState('')
  const [booksError, setBooksError] = useState(false)
  const [booksRetryNonce, setBooksRetryNonce] = useState(0)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [dailyQuote, setDailyQuote] = useState<{text:string;source:string}|null>(null)
  const [insideIds, setInsideIds] = useState<Set<string>|null>(null)

  const audioRef=useRef<HTMLAudioElement|null>(null)
  const lastRecsFinishedCount=useRef(0)
  const chatEndRef=useRef<HTMLDivElement|null>(null)
  const themeMenuRef=useRef<HTMLDivElement>(null!)
  const musicMenuRef=useRef<HTMLDivElement>(null!)
  const langMenuRef=useRef<HTMLDivElement>(null!)

  const theme=THEMES.find(t=>t.id===themeId)||THEMES[0]
  const lang=LANGUAGES.find(l=>l.id===langId)||LANGUAGES[0]
  const t=T[langId]||T.en

  useEffect(() => {
    // Check for existing Supabase session. The app must become interactive no
    // matter what this returns — a rejected/hung session check used to leave
    // visitors on the loading screen forever.
    const readyFallback = setTimeout(() => setAppReady(true), 4000)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const email = session.user.email
        setUserEmail(email)
        setAuthedEmail(email)
        localStorage.setItem('userEmail', email)
        if (isAdmin(email)) setIsPremium(true)
        else checkPremium(email)
        setAppFlow('app')
      }
    }).catch(() => {}).finally(() => {
      clearTimeout(readyFallback)
      setAppReady(true)
    })

    // Listen for auth changes (OAuth redirect callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          const email = session.user.email
          setUserEmail(email)
          setAuthedEmail(email)
          localStorage.setItem('userEmail', email)
          if (isAdmin(email)) setIsPremium(true)
          else checkPremium(email)
          setAppFlow('app')
        }
        if (event === 'SIGNED_OUT') {
          setUserEmail('')
          setAuthedEmail('')
          setAppFlow('landing')
          // Only clear auth-related keys — SIGNED_OUT can fire involuntarily
          // (expired/invalidated refresh token), and wiping hob_shelf/hob_notes/
          // hob_progress here would silently destroy reading data that only
          // ever lives in localStorage, with no way to recover it.
          localStorage.removeItem('userEmail')
          localStorage.removeItem('hob_email')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // PayPal redirects back here after subscription approval with
  // ?paypal_return=1&plan=...&subscription_id=I-XXXXX&ba_token=...&token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paypal_cancel')) {
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    if (!params.get('paypal_return')) return
    const subscriptionID = params.get('subscription_id')
    const plan = params.get('plan')
    const email = localStorage.getItem('userEmail')
    window.history.replaceState({}, '', window.location.pathname)
    if (!subscriptionID || !plan || !email) return

    setPaypalReturnStatus('confirming')
    fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm-paypal-subscription', subscriptionID, plan, email }),
    })
      .then(r => r.json())
      .then(j => {
        if (j.success) { setPaypalReturnStatus('done'); checkPremium(email) }
        else setPaypalReturnStatus('error')
      })
      .catch(() => setPaypalReturnStatus('error'))
  }, [])

  // PWA install detection
  // Show feedback widget after every 3rd message
  // useEffect(() => {
  //   if (chatMessages.length > 0 && chatMessages.length % 3 === 0 && !feedbackGiven) {
  //     setShowFeedbackWidget(true)
  //   }
  // }, [chatMessages.length, feedbackGiven])

  useEffect(()=>{
    // Load books with retry + backoff so a transient Supabase hiccup
    // (cold start, network blip) doesn't leave visitors with an empty library.
    //
    // Load-isolation: the list query only fetches the light columns needed to
    // render the grid (~75KB) instead of select('*') which shipped every
    // summary + insights (~1MB per visitor). summary/key_insights are fetched
    // per book on open. The list is also cached in localStorage for an hour,
    // so returning visitors within the window don't hit the DB at all.
    let cancelled=false
    if(!IS_DEMO){
      try{
        const c=JSON.parse(localStorage.getItem(BOOKS_CACHE_KEY)||'null')
        if(c && Date.now()-c.at<BOOKS_CACHE_TTL && Array.isArray(c.books) && c.books.length){
          setBooks(c.books);setBooksError(false);setLoading(false)
          return
        }
      }catch{}
    }
    const load=async(attempt=0)=>{
      // Demo loads only the curated sample books (tiny, cached, full columns —
      // 6 rows) so public sample traffic barely touches the DB.
      const {data,error}=await (IS_DEMO
        ? supabase.from('books').select('*').in('id',DEMO_BOOK_IDS).order('title')
        : supabase.from('books').select(BOOK_LIST_COLUMNS).order('title'))
      if(cancelled)return
      if(!error&&data&&data.length){
        setBooks(data as Book[]);setBooksError(false);setLoading(false)
        if(!IS_DEMO){
          try{localStorage.setItem(BOOKS_CACHE_KEY,JSON.stringify({at:Date.now(),books:data}))}catch{}
        }
        return
      }
      if(attempt<3){setTimeout(()=>load(attempt+1),1500*(attempt+1));return}
      setBooksError(true);setLoading(false)
    }
    load()
    return()=>{cancelled=true}
  },[booksRetryNonce])
  useEffect(()=>{
    // Daily quote. Demo books carry key_insights already; the full app picks
    // one deterministic book per day and fetches just that row's insights.
    if(!books.length)return
    if(IS_DEMO){setDailyQuote(getDailyQuote(books));return}
    const b=books[Math.floor(Date.now()/86400000)%books.length]
    if(b.key_insights){setDailyQuote(getDailyQuote([b]));return}
    let cancelled=false
    ;(async()=>{
      try{
        const {data}=await supabase.from('books').select('key_insights').eq('id',b.id).single()
        if(cancelled)return
        const line=(data?.key_insights||'').split('\n').map((s:string)=>s.trim().replace(/^[-•*]\s*/,'')).filter(Boolean)[0]
        if(line)setDailyQuote({text:line,source:b.title})
      }catch{}
    })()
    return()=>{cancelled=true}
  },[books.length])
  useEffect(()=>{
    // "Search inside summaries": summaries aren't shipped with the list
    // anymore, so search server-side (debounced) and keep just matching ids.
    const q=searchInside.trim()
    if(!q||IS_DEMO){setInsideIds(null);return}
    const h=setTimeout(async()=>{
      try{
        const esc=q.replace(/[%_\\]/g,'\\$&')
        const [r1,r2]=await Promise.all([
          supabase.from('books').select('id').ilike('summary',`%${esc}%`),
          supabase.from('books').select('id').ilike('key_insights',`%${esc}%`),
        ])
        setInsideIds(new Set([...(r1.data||[]),...(r2.data||[])].map(r=>r.id)))
      }catch{setInsideIds(null)} // fail open — show everything rather than nothing
    },400)
    return()=>clearTimeout(h)
  },[searchInside])
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[chatMessages])
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(!themeMenuRef.current?.contains(e.target as Node))setShowThemeMenu(false)
      if(!musicMenuRef.current?.contains(e.target as Node))setShowMusicMenu(false)
      if(!langMenuRef.current?.contains(e.target as Node))setShowLangMenu(false)
    }
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])
  useEffect(()=>{
    const saved=localStorage.getItem('hob_theme');if(saved)setThemeId(saved)
    const savedLang=localStorage.getItem('hob_lang');if(savedLang)setLangId(savedLang)
    const savedShelf=localStorage.getItem('hob_shelf');if(savedShelf)setShelf(JSON.parse(savedShelf))
    const savedNotes=localStorage.getItem('hob_notes');if(savedNotes)setNotes(JSON.parse(savedNotes))
    const savedProgress=localStorage.getItem('hob_progress');if(savedProgress)setReadingProgress(JSON.parse(savedProgress))
    const savedEmail=localStorage.getItem('hob_email');if(savedEmail)setUserEmail(savedEmail)
    // NOTE: no admin bypass here — hob_email is a user-editable localStorage
    // value (also used for the self-serve "check premium by email" box), so
    // it must never grant admin/premium on its own. Admin status is set only
    // from a verified Supabase session (see the auth effect above), and real
    // premium status is confirmed server-side via checkPremium().
    setStreak(updateStreak())
  },[])
  useEffect(()=>{localStorage.setItem('hob_theme',themeId)},[themeId])
  useEffect(()=>{localStorage.setItem('hob_lang',langId)},[langId])
  useEffect(()=>{localStorage.setItem('hob_shelf',JSON.stringify(shelf))},[shelf])
  useEffect(()=>{localStorage.setItem('hob_notes',JSON.stringify(notes))},[notes])
  useEffect(()=>{localStorage.setItem('hob_progress',JSON.stringify(readingProgress))},[readingProgress])
  useEffect(()=>{localStorage.setItem('hob_email',userEmail)},[userEmail])
  useEffect(()=>{
    if(currentTrack){
      const track=TRACKS.find(t=>t.id===currentTrack)
      if(track){
        if(audioRef.current)audioRef.current.src=track.src
        else audioRef.current=new Audio(track.src)
        audioRef.current.loop=true // ambient music repeats until the user stops it
        audioRef.current.volume=volume
        audioRef.current.play().catch(()=>{})
        setIsPlaying(true)
      }
    }else if(audioRef.current){audioRef.current.pause();setIsPlaying(false)}
  },[currentTrack])
  useEffect(()=>{if(audioRef.current)audioRef.current.volume=volume},[volume])
  useEffect(()=>{
    const ids=Object.keys(shelf).filter(id=>shelf[id]==='finished')
    // Re-run whenever the finished-book count actually changes (not just
    // once per session) so recommendations reflect the fuller reading
    // history as the user finishes more books.
    if(ids.length>0&&ids.length!==lastRecsFinishedCount.current){
      lastRecsFinishedCount.current=ids.length
      loadRecommendations(ids)
    }
  },[shelf])

  const selectTheme=(id:string)=>{setThemeId(id);setShowThemeMenu(false)}
  const selectLang=(id:string)=>{setLangId(id);setShowLangMenu(false)}
  const toggleTrack=(id:string)=>{setCurrentTrack(currentTrack===id?'':id)}
  const checkPremium=async(email:string)=>{
    // No client-side admin shortcut here — this fn is also reachable from a
    // freely-typed input (the "unlock access" box), and ADMIN_EMAILS is
    // public in the JS bundle, so trusting a passed-in `email` here would let
    // anyone grant themselves premium by typing the admin's address. Real
    // admin auto-premium happens in the auth effect above, gated on a
    // verified Supabase session email.
    try{
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-premium', email }),
      })
      const j = await r.json().catch(() => ({ active: false }))
      setIsPremium(!!j.active)
      if (j.active) setShowEmailModal(false)
    }catch{
      setIsPremium(false)
    }
  }
  const logout = async () => {
  await signOut()
  setUserEmail('')
  setAuthedEmail('')
  setEmailInput('')
  setIsPremium(false)
  setIsTrial(false)
  setShelf({})
  setReadingProgress({})
  setNotes({})
  setAiChatCount(0)
  setCurrentPage('library')
  setAppFlow('landing')
  localStorage.clear()
}
  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and all your data? This cannot be undone.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.access_token }),
        }).catch(() => {})
      }
    } catch {}
    try { await signOut() } catch {}
    localStorage.clear()
    setUserEmail(''); setEmailInput(''); setIsPremium(false); setIsTrial(false)
    setShelf({}); setReadingProgress({}); setNotes({}); setAiChatCount(0)
    setShowUserDashboard(false); setCurrentPage('library'); setAppFlow('login')
    window.alert('Your account and data have been deleted.')
  }
  const [cancelling,setCancelling]=useState(false)
  const cancelSubscription = async () => {
    if (!window.confirm("Cancel your subscription? You'll keep Premium until the end of your current paid period, and it won't renew after that.")) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        window.alert('Please sign in again to cancel, or cancel directly from your PayPal account.')
        return
      }
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-paypal-subscription', accessToken: session.access_token }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.success) {
        setIsPremium(false)
        window.alert("Your subscription has been cancelled. You'll keep Premium access until your current period ends.")
      } else {
        window.alert(j.error || 'Could not cancel. You can also cancel from your PayPal account, or contact support.')
      }
    } catch {
      window.alert('Could not cancel right now. Please try again or contact support.')
    } finally {
      setCancelling(false)
    }
  }
  const handleLogin = async () => {
    const email = emailInput.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setLoginError('Please enter a valid email address.')
      return
    }
    setLoginError('')
    setLoginStatus('sending')
    const { error } = await signInWithEmail(email)
    if (error) {
      setLoginStatus('idle')
      setLoginError(error.message || 'Could not send the login link. Please try again.')
    } else {
      setLoginStatus('sent')
    }
  }
  const handleGoogleLogin = async () => {
    setLoginError('')
    track('signin_click', { provider: 'google' })
    const { error } = await signInWithGoogle()
    if (error) setLoginError(error.message || 'Google sign-in failed. Please try again.')
  }
  const handleTwitterLogin = async () => {
    setLoginError('')
    track('signin_click', { provider: 'twitter' })
    const { error } = await signInWithTwitter()
    if (error) setLoginError(error.message || 'X sign-in failed. Please try again.')
  }
  const updateShelf=(bookId:string,status:ShelfStatus)=>{setShelf(p=>({...p,[bookId]:status}))}
  const updateProgress=(bookId:string,pct:number)=>{setReadingProgress(p=>({...p,[bookId]:pct}))}
  const saveNote=(bookId:string,text:string)=>{setNotes(p=>({...p,[bookId]:text}));setNoteSaved(true);setTimeout(()=>setNoteSaved(false),2000)}
  const exportPDF=async()=>{
    if(!selectedBook)return
    if(!isPremium){window.alert(t.pdfPremium||'PDF export is a premium feature');return}
    setExportingPDF(true)
    try{
      // Book title/author/insights come from the DB (LLM-generated content),
      // never from a fixed set of literals — escape before building an HTML
      // string for document.write, or a book row containing markup would
      // execute as script in the app's own origin.
      const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
      const insights:string[]=(selectedBook.key_insights||'').split('\n').map(s=>s.trim().replace(/^[-•*]\s*/,'')).filter(Boolean).map(esc)
      if(!insights.length){window.alert('This book has no key insights yet — open it and generate the AI summary first.');return}
      const safeTitle=esc(selectedBook.title)
      const safeAuthor=esc(selectedBook.author)
      const html=`<!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>${safeTitle} — Insights</title>
      <style>
        body{font-family:Georgia,serif;line-height:1.6;max-width:700px;margin:40px auto;color:#333}
        h1{font-size:2rem;color:#c9a84c;margin-bottom:16px}
        .author{color:#666;font-size:1rem;margin-bottom:32px}
        .divider{width:60px;height:2px;background:#c9a84c;margin:16px 0 32px}
        h2{font-size:1rem;letter-spacing:.1em;text-transform:uppercase;color:#8a5c20;margin-bottom:20px}
        .insight{display:flex;gap:16px;padding:16px;margin-bottom:12px;background:#faf6ef;border-left:3px solid #c9a84c;border-radius:4px}
        .num{font-size:1.4rem;color:#c9a84c;font-weight:700;min-width:28px;line-height:1.3}
        .text{font-size:0.95rem;color:#333}
        .footer{margin-top:48px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center}
        @media print{body{margin:20px auto}}
      </style></head><body>
      <h1>${safeTitle}</h1>
      <div class="author">by ${safeAuthor}</div>
      <div class="divider"></div>
      <h2>✦ Key Insights</h2>
      ${insights.map((ins,i)=>`<div class="insight"><div class="num">${String(i+1).padStart(2,'0')}</div><div class="text">${ins}</div></div>`).join('')}
      <div class="footer">Generated by House of Books · houseofbooks.app</div>
      </body></html>`

      const win=window.open('','_blank')
      if(win){win.document.write(html);win.document.close();win.print()}
    }finally{setExportingPDF(false)}
  }
  // Shared updater: a book's summary/audio_url is generated once and cached
  // server-side. Reflect that in both the list and the open panel so it's
  // never re-requested for the rest of the session.
  const updateBookField=(bookId:string, patch: Partial<Book>)=>{
    setBooks(prev=>prev.map(b=>b.id===bookId?{...b,...patch}:b))
    setSelectedBook(prev=>prev&&prev.id===bookId?{...prev,...patch}:prev)
  }
  const updateBookAudio=(bookId:string, url:string)=>updateBookField(bookId,{audio_url:url} as Partial<Book>)

  const generateAISummary=async()=>{
    if(!selectedBook||summaryLoading)return
    setSummaryLoading(true);setChatMessages([{role:'assistant',content:t.summarizing}])
    try{
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'summary',bookId:selectedBook.id,bookTitle:selectedBook.title,bookAuthor:selectedBook.author,langId})})
      const data=await res.json()
      setChatMessages([{role:'assistant',content:data.content||t.noResponse}])
      if(data.content) updateBookField(selectedBook.id,{summary:data.content} as Partial<Book>)

      // Collect feedback silently
      collectChatFeedback({
        message: `summary request for ${selectedBook.category}`,
        bookCategory: selectedBook.category,
        messageCount: 1,
      })
    }catch{setChatMessages([{role:'assistant',content:t.failedSummary}])}
    finally{setSummaryLoading(false)}
  }
  const loadRecommendations=async(ids:string[])=>{
    setLoadingRecs(true)
    try{
      const finished=ids.map(id=>books.find(b=>b.id===id)?.title).filter(Boolean).slice(0,5)
      const pool=books.filter(b=>!ids.includes(b.id)).map(b=>b.title).slice(0,30)
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'recommendations',finishedTitles:finished,remainingTitles:pool})})
      const data=await res.json()
      setRecommendations((data.titles||[]).map((title:string)=>books.find(b=>b.title===title)).filter(Boolean) as Book[])
    }catch{}finally{setLoadingRecs(false)}
  }
  const openBook=(book:Book)=>{
    const idx=books.findIndex(b=>b.id===book.id)
    if(idx>=FREE_BOOKS&&!isPremium){track('locked_book_click',{category:book.category});setShowEmailModal(true);return}
    track('book_open',{category:book.category})
    setSelectedBook(book);setChatMessages([])
    setCurrentNote(notes[book.id]||'');setNoteSaved(false)
    // The list ships without summary/insights — fetch this one book's detail
    // on open (single cached row). If it fails, the Generate button still
    // works: /api/ai returns the stored summary from its own DB cache check.
    if(!IS_DEMO && book.summary===undefined && !book.detail_loaded){
      setDetailLoading(true)
      ;(async()=>{
        try{
          const {data,error}=await supabase.from('books').select('summary,key_insights,audio_url,long_summary').eq('id',book.id).single()
          // Only mark detail_loaded on a real success — otherwise a transient
          // network/DB blip permanently skips the fetch for this book for
          // the rest of the session, leaving it stuck with no summary.
          if(!error&&data) updateBookField(book.id,{...data,detail_loaded:true})
        }catch{}
        finally{setDetailLoading(false)}
      })()
    }
  }
  const closeBook=()=>{setSelectedBook(null);setChatMessages([])}
  // Reveal an assistant reply word-by-word (typewriter) instead of dropping the
  // whole block at once — feels like the AI is typing. The reveal pace is
  // effectively a display rate limit on the response.
  const streamAssistant=(full:string)=>new Promise<void>(resolve=>{
    const tokens=full.split(/(\s+)/) // keep whitespace so spacing is preserved
    let i=0
    setChatStreaming(true)
    setChatMessages(p=>[...p,{role:'assistant',content:''}])
    const step=()=>{
      const chunk=tokens.slice(i,i+2).join('') // ~one word + its space per tick
      i+=2
      setChatMessages(p=>{
        const copy=p.slice()
        const last=copy[copy.length-1]
        if(last&&last.role==='assistant')copy[copy.length-1]={...last,content:last.content+chunk}
        return copy
      })
      if(i<tokens.length){setTimeout(step,35)}
      else{setChatStreaming(false);resolve()}
    }
    setTimeout(step,35)
  }
)
  const sendMessage=async(messageValue?: string)=>{
    const content = messageValue ?? chatInput
    if(!content.trim()||chatLoading||chatStreaming||!selectedBook)return
    const msg:ChatMessage={role:'user',content}
    // Enforce the advertised free-chat allowance (10 per 6h) client-side —
    // the per-IP server rate limit stays as the hard backstop.
    if(!isPremium&&!isAdmin(authedEmail)){
      const uses=getChatUses()
      if(uses.count>=FREE_AI_CHATS){
        setChatMessages(p=>[...p,msg,{role:'assistant',content:`You've used all ${FREE_AI_CHATS} free AI chats for now — they reset every 6 hours. ✦`}])
        setChatInput('')
        return
      }
      const next={count:uses.count+1,resetAt:uses.resetAt}
      try{localStorage.setItem(CHAT_USES_KEY,JSON.stringify(next))}catch{}
      setAiChatCount(next.count)
    }
    setChatMessages(p=>[...p,msg]);setChatInput('');setChatLoading(true)
    try{
      const res=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          messages:[...chatMessages,msg],
          bookTitle:selectedBook.title,
          bookCategory:selectedBook.category,
          demo:IS_DEMO, // demo chat runs on NVIDIA's free tier
          systemPrompt:`You are an expert on "${selectedBook.title}" by ${selectedBook.author}. Answer in 2-3 paragraphs maximum. Be conversational, insightful and specific to this book.`
        })
      })
      const data=await res.json()
      setChatLoading(false)
      await streamAssistant(data.content||t.noResponse) // typewriter reveal

      // Collect feedback silently
      collectChatFeedback({
        message: content,
        bookCategory: selectedBook.category,
        messageCount: chatMessages.length,
      })
    }catch{
      setChatLoading(false)
      setChatMessages(p=>[...p,{role:'assistant',content:t.connectionError}])
    }
  }

  const categories=['All',...Array.from(new Set(books.map(b=>b.category).filter(Boolean))).sort()]
  const shelfCount=Object.values(shelf).filter(v=>v&&v!=='none').length

  const filteredBooks=books.filter(book=>{
    const matchesSearch=book.title.toLowerCase().includes(searchQuery.toLowerCase())||book.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory=activeCategory==='All'||book.category===activeCategory
    const matchesView=activeView==='all'||(activeView==='shelf'&&shelf[book.id]&&shelf[book.id]!=='none')
    // Demo books carry their summaries locally; the full app matches against
    // the ids the debounced server-side search returned (null = still typing
    // or search failed → don't filter anything out).
    const insideQ=searchInside.trim().toLowerCase()
    const matchesInside=!insideQ||(IS_DEMO
      ? `${book.summary||''}\n${book.key_insights||''}`.toLowerCase().includes(insideQ)
      : (insideIds?insideIds.has(book.id):true))
    return matchesSearch&&matchesCategory&&matchesView&&matchesInside
  })

  // ── Library Page Component ─────────────────────────────
  const LibraryPage = () => (
    <>
      {dailyQuote&&<div className="daily-quote"><div className="quote-label">✦ {t.dailyQuote}</div><div className="quote-text">"{dailyQuote.text}"</div><div className="quote-source">— {dailyQuote.source}</div></div>}
      {streak>=2&&<div className="streak-bar"><span className="streak-fire">🔥</span><span className="streak-count">{streak}</span><span className="streak-label">{t.streak}</span></div>}
      {recommendations.length>0&&<div className="recs-section"><div className="recs-title">✨ {t.recommendations}</div><div className="recs-grid">{recommendations.map(b=><div key={b.id} className="rec-card" onClick={()=>openBook(b)}><img src={b.cover_url} alt={b.title} onError={e=>{(e.target as HTMLImageElement).src=`https://picsum.photos/seed/${b.id}/110/165`}}/><div className="rec-card-title">{b.title}</div></div>)}</div></div>}
      {loadingRecs&&<div style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'1.5rem'}}>✨ {t.loadingRecs}</div>}

      <div className="section-header">
        <h2 className="section-title">{t.sectionTitle}<br/><span>{t.sectionTitleSpan}</span></h2>
        <div className="section-count">{filteredBooks.length} {t.books}</div>
      </div>
      <div className="view-tabs">
        <button className={`view-tab${activeView==='all'?' active':''}`} onClick={()=>setActiveView('all')}>📚 {t.allBooks}</button>
        <button className={`view-tab${activeView==='shelf'?' active':''}`} onClick={()=>setActiveView('shelf')}>🔖 {t.myShelf}{shelfCount>0?` (${shelfCount})`:''}</button>
      </div>
      <div className="cat-tabs">{categories.map(c=><button key={c} className={`cat-tab${activeCategory===c?' active':''}`} onClick={()=>setActiveCategory(c)}>{c}</button>)}</div>
      <div className="search-inside-wrap"><span className="search-inside-icon">🔍</span><input className="search-inside-input" placeholder={`${t.searchInside}…`} value={searchInside} onChange={e=>setSearchInside(e.target.value)}/></div>
      {!isPremium&&<div className="upgrade-banner"><div className="upgrade-text"><h3>{IS_DEMO?'🚀 App coming soon':t.unlockTitle}</h3><p>{IS_DEMO?"You're exploring an early preview of House of Books":t.unlockDesc}</p></div>{!IS_DEMO&&<button className="btn-premium" onClick={()=>{track('upgrade_click');setShowPaymentModal(true)}}>{t.startFor}</button>}</div>}

      {booksError&&(
        <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--text-muted)'}}>
          <div style={{fontSize:'2rem',marginBottom:'10px'}}>📡</div>
          <div style={{marginBottom:'14px'}}>{t.connectionError} The library couldn't load.</div>
          <button className="btn-premium" style={{padding:'10px 24px'}} onClick={()=>{setBooksError(false);setLoading(true);setBooksRetryNonce(n=>n+1)}}>↻ Try again</button>
        </div>
      )}
      {!booksError&&(filteredBooks.length===0
        ? <div style={{textAlign:'center',padding:'4rem',color:'var(--text-muted)'}}>{t.noResults}</div>
        : <div className="books-grid">
            {filteredBooks.map((book,index)=>(
              <FocusCard
                key={book.id}
                book={book}
                index={index}
                hovered={hovered}
                setHovered={setHovered}
                isLocked={books.findIndex(b=>b.id===book.id)>=FREE_BOOKS&&!isPremium&&!isAdmin(authedEmail)}
                shelfStatus={shelf[book.id]||'none'}
                onToggleShelf={()=>updateShelf(book.id,(shelf[book.id]&&shelf[book.id]!=='none')?'none':'want')}
                progress={readingProgress[book.id]||0}
                onOpen={()=>openBook(book)}
                t={t}
              />
            ))}
          </div>
      )}
    </>
  )

  if (!appReady) return (
    <>
      <style>{buildStyles(theme, lang.dir)}</style>
      <div className="app-bg"/>
      <div className="loading-screen" style={{position: 'relative', zIndex: 10}}>
        <div className="loading-logo">📚 House of Books</div>
        <div className="loading-bar"/>
      </div>
    </>
  )

  if(loading) return(<><style>{buildStyles(theme,lang.dir)}</style><div className="loading-screen"><div className="loading-logo">{t.loading}</div><div className="loading-bar"/></div></>)

  // Landing page
  if (appFlow === 'landing') {
    return (
      <>
        <style>{buildStyles(theme, lang.dir)}</style>
        <style>{`
          .landing-wrap {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Georgia, serif;
            text-align: center;
            padding: 5rem 2rem 2rem;
            position: relative;
            z-index: 10;
          }
          .landing-title {
            font-size: clamp(2rem, 5vw, 3.2rem);
            color: #c9a84c;
            line-height: 1.2;
            margin-bottom: 1rem;
          }
          .landing-sub {
            font-size: 1.1rem;
            color: #e8e4d9;
            line-height: 1.7;
            margin-bottom: 2.5rem;
            max-width: 480px;
          }
          .landing-stat-num { font-size: 2rem; color: #c9a84c; font-weight: 500; }
          .landing-stat-label { font-size: 10px; color: #9a9080; letter-spacing: .1em; }
          .landing-feature {
            background: rgba(255,255,255,0.04);
            border: 0.5px solid rgba(201,168,76,0.25);
            border-left: 3px solid rgba(201,168,76,0.4);
            border-radius: 14px;
            padding: 1.25rem;
            text-align: left;
          }
          .landing-feature-title { font-size: 14px; color: #c9a84c; margin-bottom: 6px; }
          .landing-feature-desc { font-size: 12px; color: #9a9080; line-height: 1.5; }
        `}</style>
        <div className="app-bg"/>

        {/* Beta top bar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: '#c9a84c', color: '#0a0a0f',
          padding: '10px', fontSize: '13px',
          textAlign: 'center', letterSpacing: '.05em',
          zIndex: 100, fontFamily: 'Georgia, serif'
        }}>
          ✦ We're in Beta — Everything is free right now
        </div>

        <div className="landing-wrap">
          <img src="/logo-icon.png" alt="House of Books" style={{width:'88px',height:'88px',objectFit:'contain',margin:'0 auto 1.25rem',display:'block',filter:'drop-shadow(0 4px 24px rgba(201,168,76,0.35))'}} />

          <h1 className="landing-title">
            The World's Greatest Books<br/>
            <em style={{color: '#e8e4d9'}}>Distilled by AI</em>
          </h1>

          <p className="landing-sub">
            Read smarter. Explore 304 books with AI summaries,
            audio narration, and an AI companion. Free during beta.
          </p>

          {/* Stats */}
          <div style={{display:'flex', justifyContent:'center', gap:'3rem', marginBottom:'3rem'}}>
            {[['304','BOOKS'],[String(FREE_BOOKS),'FREE'],['5','LANGUAGES']].map(([n,l]) => (
              <div key={l}>
                <div className="landing-stat-num">{n}</div>
                <div className="landing-stat-label">{l}</div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'2.5rem'}}>
            <button
              className="btn-premium"
              style={{padding:'14px 32px', fontSize:'15px'}}
              onClick={() => setAppFlow('login')}
            >
              Start Reading Free →
            </button>
          </div>

          {/* Feature cards */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',
            gap:'16px', maxWidth:'800px', width:'100%'
          }}>
            {[
              ['📚','304 Books','Classics and modern titles from 15+ countries in 5 languages'],
              ['✦','AI Book Chat','10 free AI chats per session — ask anything about any book'],
              ['🎧','Audio Summaries','Listen to any book, narrated by a natural AI voice'],
              ['⭐','Go Premium','Unlimited AI, full library access, PDF exports and more']
            ].map(([icon, title, desc]) => (
              <div key={title} className="landing-feature">
                <div style={{fontSize:'1.5rem', marginBottom:'8px'}}>{icon}</div>
                <div className="landing-feature-title">{title}</div>
                <div className="landing-feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  // Login screen
  function LoginScreen() {
    return (
      <>
        <style>{buildStyles(theme, lang.dir)}</style>
        <div className="app-bg"/>
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
          <div style={{background:'linear-gradient(180deg, rgba(24,22,30,0.98) 0%, rgba(12,12,17,0.98) 100%)',border:'1px solid rgba(201,168,76,0.28)',borderRadius:'20px',padding:'2.75rem 2.5rem',maxWidth:'400px',width:'100%',textAlign:'center' as const,boxShadow:'0 24px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)'}}>
            <img src="/logo-icon.png" alt="House of Books" style={{width:'80px',height:'80px',objectFit:'contain',margin:'0 auto 12px',display:'block',filter:'drop-shadow(0 4px 20px rgba(201,168,76,0.35))'}} />
            <h2 style={{fontSize:'1.7rem',color:'#c9a84c',marginBottom:'8px',fontFamily:'Georgia,serif',letterSpacing:'0.01em'}}>House of Books</h2>
            {loginStatus === 'sent' ? (
              <>
                <div style={{fontSize:'2.2rem',margin:'8px 0 12px'}}>✉️</div>
                <p style={{color:'#e8e4d9',fontSize:'15px',marginBottom:'8px',fontFamily:'Georgia,serif'}}>Check your email</p>
                <p style={{color:'#9a9080',fontSize:'13px',marginBottom:'1.5rem',lineHeight:1.6}}>
                  We sent a login link to <span style={{color:'#c9a84c'}}>{emailInput.trim().toLowerCase()}</span>. Open it on this device to sign in. (Check your spam folder if you don't see it.)
                </p>
                <button
                  onClick={() => { setLoginStatus('idle'); setLoginError('') }}
                  style={{background:'none',border:'none',color:'#9a9080',fontSize:'12px',cursor:'pointer',fontFamily:'Georgia,serif',display:'block',width:'100%'}}
                >
                  ← Use a different email
                </button>
              </>
            ) : (
              <>
                <p style={{color:'#9a9080',fontSize:'13px',marginBottom:'1.75rem',lineHeight:1.6}}>Sign in to start reading — free during beta</p>
                <button
                  onClick={handleGoogleLogin}
                  style={{width:'100%',padding:'12px',background:'#fff',border:'none',borderRadius:'10px',color:'#1a1a1a',fontSize:'14px',cursor:'pointer',fontFamily:'Georgia,serif',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',fontWeight:600,transition:'transform .15s ease, box-shadow .15s ease'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.boxShadow='0 4px 16px rgba(0,0,0,0.35)';(e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.boxShadow='none';(e.currentTarget as HTMLButtonElement).style.transform='none'}}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Continue with Google
                </button>
                <button
                  onClick={handleTwitterLogin}
                  style={{width:'100%',padding:'12px',background:'#000',border:'1px solid rgba(255,255,255,0.18)',borderRadius:'10px',color:'#fff',fontSize:'14px',cursor:'pointer',fontFamily:'Georgia,serif',marginBottom:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',fontWeight:600,transition:'transform .15s ease, box-shadow .15s ease'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.boxShadow='0 4px 16px rgba(0,0,0,0.45)';(e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.boxShadow='none';(e.currentTarget as HTMLButtonElement).style.transform='none'}}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.48 3.24H4.29L17.61 20.65z"/></svg>
                  Continue with X
                </button>
                <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'0 0 14px'}}>
                  <div style={{flex:1,height:'1px',background:'rgba(201,168,76,0.2)'}}/>
                  <span style={{color:'#6a6458',fontSize:'11px'}}>or</span>
                  <div style={{flex:1,height:'1px',background:'rgba(201,168,76,0.2)'}}/>
                </div>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); if (loginError) setLoginError('') }}
                  onKeyDown={e => { if(e.key==='Enter') handleLogin() }}
                  style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'10px',color:'#e8e4d9',fontSize:'14px',outline:'none',marginBottom:'8px',fontFamily:'Georgia,serif',boxSizing:'border-box' as const}}
                />
                <button
                  onClick={handleLogin}
                  disabled={loginStatus === 'sending'}
                  style={{width:'100%',padding:'11px',background:'#c9a84c',border:'none',borderRadius:'10px',color:'#0a0a0f',fontSize:'14px',cursor:loginStatus==='sending'?'default':'pointer',fontFamily:'Georgia,serif',opacity:loginStatus==='sending'?0.7:1}}
                >
                  {loginStatus === 'sending' ? 'Sending link…' : 'Email me a login link →'}
                </button>
                {loginError && (
                  <p style={{color:'#e07a7a',fontSize:'12px',marginTop:'10px',fontFamily:'Georgia,serif'}}>{loginError}</p>
                )}
                <button
                  onClick={() => setAppFlow('landing')}
                  style={{background:'none',border:'none',color:'#9a9080',fontSize:'12px',cursor:'pointer',fontFamily:'Georgia,serif',marginTop:'12px',display:'block',width:'100%'}}
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      </>
    )
  }

  if (appFlow === 'login') {
    // Called as a function for the same reason as LibraryPage below — an
    // inline component type would remount (and drop input focus) per keystroke.
    return LoginScreen()
  }

  return(<><style>{buildStyles(theme,lang.dir)}</style>
  <div className="app-bg"/>
  <div className="app-root">

    {/* HEADER */}
    <header className="app-header">
      <div style={{display:'flex',alignItems:'center',gap:'11px'}}>
        <img src="/logo.png" alt="House of Books" style={{height:'38px',width:'auto',maxWidth:'210px',display:'block'}} />
      </div>
      
      {/* Navigation Tabs */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        background: 'var(--surface)',
        border: '0.5px solid var(--gold-border)',
        borderRadius: '999px',
        padding: '4px'
      }}>
        <button
          onClick={() => setCurrentPage('library')}
          style={{
            padding: '6px 16px', borderRadius: '999px', border: 'none',
            background: currentPage === 'library' ? 'var(--gold-dim)' : 'transparent',
            color: currentPage === 'library' ? 'var(--gold)' : 'var(--text-muted)',
            fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif',
            borderBottom: currentPage === 'library' ? '1px solid var(--gold)' : 'none'
          }}>
          📚 Library
        </button>
        {isAdmin(authedEmail) && (
          <>
            <button
              onClick={() => setCurrentPage('agent')}
              style={{
                padding: '6px 16px', borderRadius: '999px', border: 'none',
                background: currentPage === 'agent' ? 'var(--gold-dim)' : 'transparent',
                color: currentPage === 'agent' ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif'
              }}>
              🤖 Agents
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              style={{
                padding: '6px 16px', borderRadius: '999px', border: 'none',
                background: currentPage === 'dashboard' ? 'var(--gold-dim)' : 'transparent',
                color: currentPage === 'dashboard' ? 'var(--gold)' : 'var(--text-muted)',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif'
              }}>
              ⚙️ Dashboard
            </button>
          </>
        )}
      </nav>
      <div className="header-right">
        <div className="search-wrap">
          <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input className="search-input" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
        </div>
        <div style={{position:'relative'}} ref={langMenuRef}>
          <button className={`icon-btn${showLangMenu?' active':''}`} onClick={()=>{setShowLangMenu(v=>!v);setShowThemeMenu(false);setShowMusicMenu(false)}}>{lang.emoji}</button>
          {showLangMenu&&<div className="dropdown"><div className="dropdown-title">{t.language}</div>{LANGUAGES.map(l=><button key={l.id} className={`dropdown-item${langId===l.id?' active':''}`} onClick={()=>selectLang(l.id)}><span className="dropdown-item-emoji">{l.emoji}</span>{l.label}{langId===l.id&&<span style={{marginLeft:'auto',color:'var(--gold)',fontSize:'11px'}}>✓</span>}</button>)}</div>}
        </div>
        <div style={{position:'relative'}} ref={themeMenuRef}>
          <button className={`icon-btn${showThemeMenu?' active':''}`} onClick={()=>{setShowThemeMenu(v=>!v);setShowMusicMenu(false);setShowLangMenu(false)}}>🎨</button>
          {showThemeMenu&&<div className="dropdown"><div className="dropdown-title">{t.wallpaper}</div>{THEMES.map(th=><button key={th.id} className={`dropdown-item${themeId===th.id?' active':''}`} onClick={()=>selectTheme(th.id)}><span className="dropdown-item-emoji">{th.emoji}</span>{th.label}{themeId===th.id&&<span style={{marginLeft:'auto',color:'var(--gold)',fontSize:'11px'}}>✓</span>}</button>)}</div>}
        </div>
        <div style={{position:'relative'}} ref={musicMenuRef}>
          <button className={`icon-btn${(isPlaying||showMusicMenu)?' active':''}`} onClick={()=>{setShowMusicMenu(v=>!v);setShowThemeMenu(false);setShowLangMenu(false)}}>{isPlaying?'🎵':'🎧'}</button>
          {showMusicMenu&&<div className="dropdown" style={{minWidth:'200px'}}><div className="dropdown-title">{t.music}</div>{TRACKS.map(tr=><button key={tr.id} className={`dropdown-item${currentTrack===tr.id?' active':''}`} onClick={()=>toggleTrack(tr.id)}><span className="dropdown-item-emoji">{tr.emoji}</span>{tr.label}{currentTrack===tr.id&&isPlaying&&<span className="track-playing"><span className="track-bar"/><span className="track-bar"/><span className="track-bar"/></span>}</button>)}<div className="volume-row"><span className="volume-label">{t.vol}</span><input type="range" className="volume-slider" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(parseFloat(e.target.value))}/></div></div>}
        </div>
        {/* Mobile search toggle button — only visible on mobile */}
        <button
          className="icon-btn mobile-search-btn"
          onClick={() => setShowMobileSearch(v => !v)}
          style={{display: 'none'}} // shown via CSS media query
          title="Search"
        >
          🔍
        </button>
        {userEmail && (
          <button
            className="icon-btn"
            onClick={() => setShowUserDashboard(true)}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold), #8a6520)',
              border: 'none',
              color: '#0a0a0f',
              fontSize: '12px',
              fontWeight: '500',
              fontFamily: 'Georgia, serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {userEmail.slice(0,2).toUpperCase()}
          </button>
        )}
        {!IS_DEMO&&<button className="btn-premium" onClick={()=>{track('upgrade_click');setShowPaymentModal(true)}}>{t.upgrade}</button>}
      </div>
    </header>

    {/* Mobile search bar — full width below header */}
    {showMobileSearch && (
      <div style={{
        padding: '8px 0.75rem',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--gold-border)',
        position: 'sticky',
        top: '56px',
        zIndex: 99
      }}>
        <input
          className="search-input"
          placeholder="Search books, authors..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
          style={{width: '100%'}}
        />
      </div>
    )}

    <main className="main-content">
      {/* Called as a function, not <LibraryPage/> — a component type defined
          inside render remounts its whole subtree (and drops input focus)
          on every keystroke. */}
      {currentPage === 'library' && LibraryPage()}
      {currentPage === 'agent' && isAdmin(authedEmail) && <Agent />}
      {currentPage === 'dashboard' && isAdmin(authedEmail) && <Dashboard />}
    </main>

    {/* EXPANDED PANEL */}
    <AnimatePresence>
      {selectedBook&&(
        <ExpandedPanel
          book={selectedBook} t={t}
          isPremium={isPremium} shelfStatus={shelf[selectedBook.id]||'none'}
          progress={readingProgress[selectedBook.id]||0}
          exportingPDF={exportingPDF}
          detailLoading={detailLoading}
          currentNote={currentNote} noteSaved={noteSaved}
          chatMessages={chatMessages}
          chatInput={chatInput} chatLoading={chatLoading} chatStreaming={chatStreaming}
          summaryLoading={summaryLoading}
          onClose={closeBook}
          onShelf={s=>updateShelf(selectedBook.id,s)}
          onProgress={pct=>updateProgress(selectedBook.id,pct)}
          onExportPDF={exportPDF}
          onSaveNote={text=>saveNote(selectedBook.id,text)}
          onNoteChange={setCurrentNote}
          onToggleChat={()=>{}}
          onGenerateSummary={generateAISummary}
          onAudioCached={updateBookAudio}
          onSendMessage={sendMessage}
          onChatInput={setChatInput}
          chatEndRef={chatEndRef as React.RefObject<HTMLDivElement>}
        />
      )}
    </AnimatePresence>

    {/* EMAIL MODAL */}
    {showEmailModal&&(
      <div className="email-modal-wrap" onClick={e=>e.target===e.currentTarget&&setShowEmailModal(false)}>
        <div style={{background:'var(--modal-bg)',border:'1px solid var(--gold-border)',borderRadius:'12px',padding:'2rem',maxWidth:'400px',width:'100%'}}>
          <h3 style={{fontFamily:'Georgia,serif',fontSize:'1.5rem',color:'var(--gold)',marginBottom:'8px'}}>{t.premiumBook}</h3>
          <p style={{color:'var(--text-muted)',fontSize:'13px',marginBottom:'1.5rem',lineHeight:'1.6'}}>{t.alreadyMember}</p>
          <input type="email" placeholder="your@email.com" value={userEmail} onChange={e=>setUserEmail(e.target.value)} style={{width:'100%',padding:'9px 13px',background:'var(--input-bg)',border:'1px solid var(--gold-border)',borderRadius:'6px',color:'var(--text)',fontSize:'13px',outline:'none',marginBottom:'10px',direction:'ltr'}}/>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn-ai" style={{flex:1}} onClick={()=>{checkPremium(userEmail);setShowEmailModal(false)}}>{t.unlockAccess}</button>
            <button className="btn-premium" style={{flex:1}} onClick={()=>{track('upgrade_click');setShowEmailModal(false);setShowPaymentModal(true)}}>{t.upgradePremium}</button>
          </div>
        </div>
      </div>
    )}

    {/* PAYMENT MODAL */}
    {showPaymentModal && (
      <PaymentModal email={userEmail} onClose={()=>setShowPaymentModal(false)} />
    )}

    {/* PAYPAL RETURN STATUS TOAST */}
    {paypalReturnStatus !== 'idle' && (
      <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',zIndex:400,background:'var(--modal-bg)',border:'1px solid var(--gold-border)',borderRadius:'10px',padding:'12px 20px',fontFamily:'Georgia,serif',fontSize:'13px',color: paypalReturnStatus==='error' ? '#e07a7a' : 'var(--gold)'}}>
        {paypalReturnStatus === 'confirming' && '⏳ Confirming your PayPal payment…'}
        {paypalReturnStatus === 'done' && '✅ Premium unlocked — welcome aboard!'}
        {paypalReturnStatus === 'error' && '⚠️ Could not confirm payment. Contact support if you were charged.'}
      </div>
    )}

    {/* USER DASHBOARD MODAL */}
    {showUserDashboard && (
      <div className="email-modal-wrap"
        onClick={e => e.target === e.currentTarget && setShowUserDashboard(false)}>
        <div style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--gold-border)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '420px',
          width: '100%',
          fontFamily: 'Georgia, serif'
        }}>

          {/* Header */}
          <div style={{display:'flex', alignItems:'center', gap:'14px', marginBottom:'1.5rem', paddingBottom:'1.5rem', borderBottom:'1px solid var(--gold-border)'}}>
            <div style={{
              width:'52px', height:'52px', borderRadius:'50%',
              background:'linear-gradient(135deg, var(--gold), #8a6520)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'18px', fontWeight:'500', color:'#0a0a0f'
            }}>
              {userEmail.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:'15px', fontWeight:'500', color:'var(--text)'}}>
                {isAdmin(authedEmail) ? '👑 Admin' : isPremium ? '⭐ Premium' : isTrial ? '🎯 Trial' : '📚 Reader'}
              </div>
              <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'2px'}}>{userEmail}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'1.5rem'}}>
            <div style={{background:'var(--surface)', borderRadius:'10px', padding:'12px', textAlign:'center', border:'0.5px solid var(--gold-border)'}}>
              <div style={{fontSize:'20px', fontWeight:'500', color:'var(--gold)'}}>
                {Object.values(shelf).filter(v => v && v !== 'none').length}
              </div>
              <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'3px', letterSpacing:'.06em'}}>SHELF</div>
            </div>
            <div style={{background:'var(--surface)', borderRadius:'10px', padding:'12px', textAlign:'center', border:'0.5px solid var(--gold-border)'}}>
              <div style={{fontSize:'20px', fontWeight:'500', color:'var(--gold)'}}>
                {Object.values(shelf).filter(v => v === 'finished').length}
              </div>
              <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'3px', letterSpacing:'.06em'}}>FINISHED</div>
            </div>
            <div style={{background:'var(--surface)', borderRadius:'10px', padding:'12px', textAlign:'center', border:'0.5px solid var(--gold-border)'}}>
              <div style={{fontSize:'20px', fontWeight:'500', color:'var(--gold)'}}>
                {streak}
              </div>
              <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'3px', letterSpacing:'.06em'}}>STREAK</div>
            </div>
          </div>

          {/* AI chats remaining */}
          {!isPremium && !isAdmin(authedEmail) && (
            <div style={{
              background:'var(--surface)', borderRadius:'10px',
              padding:'12px 14px', marginBottom:'1rem',
              border:'0.5px solid var(--gold-border)',
              display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <span style={{fontSize:'13px', color:'var(--text-muted)'}}>AI chats remaining</span>
              <span style={{fontSize:'13px', color:'var(--gold)', fontWeight:'500'}}>
                {Math.max(0, FREE_AI_CHATS - aiChatCount)} / {FREE_AI_CHATS}
              </span>
            </div>
          )}

          {/* Admin badge */}
          {isAdmin(authedEmail) && (
            <div style={{
              background:'rgba(201,168,76,0.1)', border:'1px solid var(--gold-border)',
              borderRadius:'10px', padding:'12px 14px', marginBottom:'1rem',
              fontSize:'12px', color:'var(--gold)', textAlign:'center', letterSpacing:'.06em'
            }}>
              👑 ADMIN — Unlimited access to all features
            </div>
          )}

          {/* Action buttons */}
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {isAdmin(authedEmail) && (
              <button
                onClick={() => { setShowUserDashboard(false); setCurrentPage('dashboard') }}
                style={{
                  background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                  borderRadius:'10px', padding:'11px', color:'var(--text)',
                  fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                  textAlign:'left', paddingLeft:'16px'
                }}>
                ⚙️ Admin Dashboard
              </button>
            )}
            {isAdmin(authedEmail) && (
              <button
                onClick={() => { setShowUserDashboard(false); setCurrentPage('agent') }}
                style={{
                  background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                  borderRadius:'10px', padding:'11px', color:'var(--text)',
                  fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                  textAlign:'left', paddingLeft:'16px'
                }}>
                🤖 AI Agents
              </button>
            )}
            {/* Premium subscribers: cancel + refund info */}
            {isPremium && !isAdmin(authedEmail) && (
              <>
                <button
                  onClick={cancelSubscription}
                  disabled={cancelling}
                  style={{
                    background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                    borderRadius:'10px', padding:'11px', color:'var(--text)',
                    fontSize:'13px', cursor: cancelling ? 'default' : 'pointer', fontFamily:'Georgia, serif',
                    textAlign:'left', paddingLeft:'16px', marginTop:'4px', opacity: cancelling ? 0.6 : 1
                  }}>
                  {cancelling ? '⏳ Cancelling…' : '✕ Cancel subscription'}
                </button>
                <div style={{fontSize:'11px', color:'var(--text-muted)', padding:'2px 4px 2px 16px', lineHeight:1.5}}>
                  Cancel anytime — you keep Premium until your period ends. Need a refund? Email{' '}
                  <a href="mailto:abdalrahimmakkawi@gmail.com" style={{color:'var(--gold)'}}>support</a>.
                </div>
              </>
            )}
            <button
              onClick={logout}
              style={{
                background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                borderRadius:'10px', padding:'11px', color:'var(--text)',
                fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                textAlign:'left', paddingLeft:'16px', marginTop:'4px'
              }}>
              🚪 Log Out
            </button>
            <button
              onClick={deleteAccount}
              style={{
                background:'rgba(220,50,50,0.08)', border:'0.5px solid rgba(220,50,50,0.3)',
                borderRadius:'10px', padding:'11px', color:'#e05555',
                fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                textAlign:'left', paddingLeft:'16px'
              }}>
              🗑️ Delete my account
            </button>
          </div>

          {/* Legal + Close */}
          <div style={{marginTop:'1rem',display:'flex',gap:'14px',justifyContent:'center',fontSize:'11px'}}>
            <a href="/privacy.html" target="_blank" rel="noopener" style={{color:'var(--text-muted)',textDecoration:'none'}}>Privacy</a>
            <a href="/terms.html" target="_blank" rel="noopener" style={{color:'var(--text-muted)',textDecoration:'none'}}>Terms</a>
            <button
              onClick={() => setShowUserDashboard(false)}
              style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:'11px',cursor:'pointer',fontFamily:'Georgia, serif',padding:0}}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    
  </div></>)
}
