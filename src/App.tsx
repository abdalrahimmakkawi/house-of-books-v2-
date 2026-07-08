import { useState, useEffect, useRef, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, signInWithEmail, signOut } from './lib/supabase'
import type { Book } from './lib/supabase'
import CommunityHub from './pages/CommunityHub'
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
  en:{ appName:'House of Books',appSub:'AI-Powered Reading',searchPlaceholder:'Search books, authors, topics…',upgrade:'Upgrade',wallpaper:'Theme',music:'Ambient Music',language:'Language',sectionTitle:"The World's Greatest Books,",sectionTitleSpan:'Distilled by AI',books:'books',unlockTitle:'✦ Premium Coming Soon',unlockDesc:'Full library · Unlimited AI chat · PDF exports — coming soon',startFor:'✦ Coming Soon',overview:'Overview',fullSummary:'Full Summary',keyInsights:'Key Insights',aboutBook:'About This Book',aboutBookDesc:'Click ✦ AI Summary to generate a comprehensive summary, or open ✦ AI Chat to ask any question.',aiSummary:'✦ AI Summary',generating:'✦ Generating…',aiChat:'✦ AI Chat',hideChat:'Hide Chat',aiExpert:'AI Book Expert',askAnything:'Ask me anything about this book.',askPlaceholder:'Ask a question…',send:'→',premium:'Premium',audioComingSoon:'Audio Summary — Coming Soon',minRead:'min read',loading:'House of Books',alreadyMember:'Already a member? Enter your email to unlock.',unlockAccess:'Unlock Access',upgradePremium:'Premium',premiumBook:'Premium Book',connectionError:'Connection error.',noResponse:'No response.',failedSummary:'Failed to generate summary.',summarizing:'✦ Generating summary…',by:'by',vol:'Vol',wantRead:'Want to Read',reading:'Reading',finished:'Finished',myShelf:'My Shelf',allBooks:'All Books',notes:'My Notes',notesPlaceholder:'Write your personal notes about this book…',saveNotes:'Save Notes',notesSaved:'Saved ✓',streak:'day streak',dailyQuote:'Quote of the Day',recommendations:'Recommended for You',loadingRecs:'Finding books for you…',searchInside:'Search inside summaries',noResults:'No results found.',readProgress:'Reading Progress',exportPDF:'Export Insights PDF',exportingPDF:'Exporting…',pdfPremium:'PDF export is a premium feature' },
  ar:{ appName:'بيت الكتب',appSub:'قراءة مدعومة بالذكاء الاصطناعي',searchPlaceholder:'ابحث في الكتب…',upgrade:'ترقية',wallpaper:'المظهر',music:'موسيقى محيطية',language:'اللغة',sectionTitle:'أعظم كتب العالم،',sectionTitleSpan:'مُقطَّرة بالذكاء الاصطناعي',books:'كتاب',unlockTitle:'✦ Premium قريباً',unlockDesc:'مكتبة كاملة · دردشة ذكاء اصطناعي غير محدودة · تصدير PDF — قريباً',startFor:'✦ قريباً',overview:'نظرة عامة',fullSummary:'الملخص الكامل',keyInsights:'الأفكار الرئيسية',aboutBook:'عن هذا الكتاب',aboutBookDesc:'اضغط ✦ ملخص ذكاء اصطناعي.',aiSummary:'✦ ملخص',generating:'✦ جارٍ…',aiChat:'✦ دردشة',hideChat:'إخفاء',aiExpert:'خبير الكتاب',askAnything:'اسألني أي شيء.',askPlaceholder:'اطرح سؤالاً…',send:'→',premium:'مميز',audioComingSoon:'الملخص الصوتي — قريباً',minRead:'دقيقة',loading:'بيت الكتب',alreadyMember:'عضو بالفعل؟ أدخل بريدك.',unlockAccess:'فتح الوصول',upgradePremium:'Premium',premiumBook:'كتاب مميز',connectionError:'خطأ في الاتصال.',noResponse:'لا يوجد رد.',failedSummary:'فشل.',summarizing:'✦ جارٍ…',by:'بقلم',vol:'صوت',wantRead:'أريد قراءته',reading:'أقرأه',finished:'أنهيته',myShelf:'رفي',allBooks:'كل الكتب',notes:'ملاحظاتي',notesPlaceholder:'اكتب ملاحظاتك…',saveNotes:'حفظ',notesSaved:'تم ✓',streak:'أيام',dailyQuote:'اقتباس اليوم',recommendations:'موصى لك',loadingRecs:'جارٍ البحث…',searchInside:'البحث داخل الملخصات',noResults:'لا توجد نتائج.',readProgress:'تقدم القراءة',exportPDF:'تصدير ملف PDF',exportingPDF:'جا...',pdfPremium:'PDF export is a premium feature' },
  fr:{ appName:'House of Books',appSub:'Lecture par IA',searchPlaceholder:'Rechercher…',upgrade:'Premium',wallpaper:'Thème',music:"Musique d'ambiance",language:'Langue',sectionTitle:'Les Plus Grands Livres,',sectionTitleSpan:"Distillés par l'IA",books:'livres',unlockTitle:'✦ Premium Bientôt',unlockDesc:'Bibliothèque complète · Chat IA illimité · Exports PDF — bientôt',startFor:'✦ Bientôt',overview:'Aperçu',fullSummary:'Résumé Complet',keyInsights:'Points Clés',aboutBook:'À Propos',aboutBookDesc:'Cliquez ✦ Résumé IA.',aiSummary:'✦ Résumé IA',generating:'✦ Génération…',aiChat:'✦ Chat IA',hideChat:'Masquer',aiExpert:'Expert IA',askAnything:'Posez une question.',askPlaceholder:'Question…',send:'→',premium:'Premium',audioComingSoon:'Audio — Bientôt',minRead:'min',loading:'House of Books',alreadyMember:'Déjà membre?',unlockAccess:'Débloquer',upgradePremium:'Premium',premiumBook:'Livre Premium',connectionError:'Erreur.',noResponse:'Pas de réponse.',failedSummary:'Échec.',summarizing:'✦ Génération…',by:'par',vol:'Vol',wantRead:'À lire',reading:'En cours',finished:'Terminé',myShelf:'Ma Bibliothèque',allBooks:'Tous',notes:'Notes',notesPlaceholder:'Vos notes…',saveNotes:'Sauvegarder',notesSaved:'Sauvegardé ✓',streak:'jours',dailyQuote:'Citation du Jour',recommendations:'Recommandé',loadingRecs:'Recherche…',searchInside:'Rechercher',noResults:'Aucun résultat.',readProgress:'Progression',exportPDF:'Exporter PDF',exportingPDF:'Exportation…',pdfPremium:'Export PDF est premium' },
  es:{ appName:'House of Books',appSub:'Lectura con IA',searchPlaceholder:'Buscar…',upgrade:'Premium',wallpaper:'Tema',music:'Música',language:'Idioma',sectionTitle:'Los Mejores Libros,',sectionTitleSpan:'Destilados por IA',books:'libros',unlockTitle:'✦ Premium Próximamente',unlockDesc:'Biblioteca completa · Chat IA ilimitado · Exports PDF — próximamente',startFor:'✦ Próximamente',overview:'Resumen',fullSummary:'Resumen Completo',keyInsights:'Ideas Clave',aboutBook:'Sobre el Libro',aboutBookDesc:'Haz clic en ✦ Resumen IA.',aiSummary:'✦ Resumen IA',generating:'✦ Generando…',aiChat:'✦ Chat IA',hideChat:'Ocultar',aiExpert:'Experto IA',askAnything:'Pregúntame.',askPlaceholder:'Pregunta…',send:'→',premium:'Premium',audioComingSoon:'Audio — Próximamente',minRead:'min',loading:'House of Books',alreadyMember:'¿Ya eres miembro?',unlockAccess:'Desbloquear',upgradePremium:'Premium',premiumBook:'Libro Premium',connectionError:'Error.',noResponse:'Sin respuesta.',failedSummary:'Error.',summarizing:'✦ Generando…',by:'por',vol:'Vol',wantRead:'Quiero leer',reading:'Leyendo',finished:'Terminado',myShelf:'Mi Biblioteca',allBooks:'Todos',notes:'Notas',notesPlaceholder:'Tus notas…',saveNotes:'Guardar',notesSaved:'Guardado ✓',streak:'días',dailyQuote:'Cita del Día',recommendations:'Recomendado',loadingRecs:'Buscando…',searchInside:'Buscar',noResults:'Sin resultados.',readProgress:'Progreso',exportPDF:'Exportar PDF',exportingPDF:'Exportando…',pdfPremium:'Export PDF es premium' },
  zh:{ appName:'书之屋',appSub:'AI 智能阅读',searchPlaceholder:'搜索书籍…',upgrade:'升级',wallpaper:'主题',music:'环境音乐',language:'语言',sectionTitle:'世界最伟大的书籍，',sectionTitleSpan:'由AI精炼提取',books:'本书',unlockTitle:'✦ Premium 即将推出',unlockDesc:'完整书库 · 无限AI聊天 · PDF导出 — 即将推出',startFor:'✦ 即将推出',overview:'概述',fullSummary:'完整摘要',keyInsights:'核心洞见',aboutBook:'关于本书',aboutBookDesc:'点击 ✦ AI摘要。',aiSummary:'✦ AI摘要',generating:'✦ 生成中…',aiChat:'✦ AI对话',hideChat:'隐藏',aiExpert:'AI图书专家',askAnything:'向我提问。',askPlaceholder:'提问…',send:'→',premium:'高级',audioComingSoon:'语音摘要 — 即将推出',minRead:'分钟',loading:'书之屋',alreadyMember:'已是会员？',unlockAccess:'解锁',upgradePremium:'Premium',premiumBook:'高级书籍',connectionError:'连接错误。',noResponse:'无响应。',failedSummary:'生成失败。',summarizing:'✦ 生成中…',by:'作者',vol:'音量',wantRead:'想读',reading:'正在读',finished:'已读完',myShelf:'我的书架',allBooks:'全部',notes:'笔记',notesPlaceholder:'写下笔记…',saveNotes:'保存',notesSaved:'已保存 ✓',streak:'天',dailyQuote:'每日书摘',recommendations:'为你推荐',loadingRecs:'搜索中…',searchInside:'搜索摘要',noResults:'未找到。',readProgress:'阅读进度',exportPDF:'导出PDF',exportingPDF:'导出中…',pdfPremium:'PDF导出是高级功能' },
}

const THEMES = [
  { id:'classic',label:'Classic',emoji:'🏛️',image:'/wallpaper/classic.jpg',accent:'#c9a84c',accentLight:'#e8c97a',overlay:'rgba(8,6,2,0.82)',isLight:false,bg:'#0a0a0f',text:'#e8e4d9',textMuted:'rgba(232,228,217,0.52)',border:'rgba(201,168,76,0.22)',headerBg:'rgba(10,10,15,0.92)',modalBg:'rgba(14,14,20,0.97)',surface:'rgba(255,255,255,0.04)',inputBg:'rgba(255,255,255,0.04)' },
  { id:'cosmos', label:'Cosmos', emoji:'🌌',image:'/wallpaper/cosmos.jpg', accent:'#7eb8f7',accentLight:'#b3d4ff',overlay:'rgba(2,4,18,0.80)', isLight:false,bg:'#02040f',text:'#dde8f8',textMuted:'rgba(221,232,248,0.5)', border:'rgba(126,184,247,0.22)',headerBg:'rgba(2,4,18,0.92)',  modalBg:'rgba(4,8,22,0.97)',  surface:'rgba(255,255,255,0.04)',inputBg:'rgba(255,255,255,0.04)' },
  { id:'nature', label:'Nature', emoji:'🌿',image:'/wallpaper/nature.jpg', accent:'#7ec87e',accentLight:'#a8e6a8',overlay:'rgba(2,10,4,0.80)',  isLight:false,bg:'#020a04',text:'#d8edd8',textMuted:'rgba(216,237,216,0.5)', border:'rgba(126,200,126,0.22)',headerBg:'rgba(2,10,4,0.92)',  modalBg:'rgba(4,14,6,0.97)',  surface:'rgba(255,255,255,0.04)',inputBg:'rgba(255,255,255,0.04)' },
  { id:'beach',  label:'Beach',  emoji:'🌊',image:'/wallpaper/beach.jpg',  accent:'#4fc3c3',accentLight:'#88e0e0',overlay:'rgba(2,12,18,0.78)', isLight:false,bg:'#020c12',text:'#d4eef0',textMuted:'rgba(212,238,240,0.5)', border:'rgba(79,195,195,0.22)', headerBg:'rgba(2,12,18,0.92)', modalBg:'rgba(4,16,22,0.97)',  surface:'rgba(255,255,255,0.04)',inputBg:'rgba(255,255,255,0.04)' },
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

const FREE_BOOKS = 220
const FREE_AI_CHATS = 10

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
body{font-family:${dir==='rtl'?"'Noto Sans Arabic',":""}Georgia,serif;font-size:14px;min-height:100vh;background:var(--bg);color:var(--text);direction:${dir}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${th.accent}33;border-radius:2px}

.app-bg{position:fixed;inset:0;z-index:0;background-color:var(--bg);${th.image!=='none'?`background-image:url('${th.image}');background-size:cover;background-position:center;`:''}}
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
.btn-premium{padding:7px 16px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:${th.isLight?'#fff':'#0a0a0f'};border:none;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:opacity .2s,transform .15s;white-space:nowrap;flex-shrink:0}
.btn-premium:hover{opacity:.9;transform:translateY(-1px)}
.dropdown{position:absolute;top:calc(100% + 8px);${dir==='rtl'?'left':'right'}:0;background:var(--modal-bg);border:1px solid var(--gold-border);border-radius:10px;padding:10px;min-width:190px;z-index:300;box-shadow:0 12px 40px rgba(0,0,0,.4);animation:dropIn .18s ease}
@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.dropdown-title{font-size:10px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;padding:2px 6px 8px;border-bottom:1px solid var(--gold-border);margin-bottom:8px}
.dropdown-item{display:flex;align-items:center;gap:10px;padding:11px 10px;border-radius:6px;cursor:pointer;transition:background .15s;font-size:14px;color:var(--text-muted);border:none;background:transparent;width:100%;text-align:${dir==='rtl'?'right':'left'};direction:${dir};-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.dropdown-item:hover,.dropdown-item:active{background:var(--gold-dim);color:var(--text)}.dropdown-item.active{background:var(--gold-dim);color:var(--gold)}
.dropdown-item-emoji{font-size:16px;flex-shrink:0}
.track-playing{margin-${dir==='rtl'?'right':'left'}:auto;display:flex;gap:2px;align-items:flex-end;height:14px}
.track-bar{width:3px;background:var(--gold);border-radius:1px;animation:eq .8s ease-in-out infinite alternate}
.track-bar:nth-child(1){height:6px}.track-bar:nth-child(2){height:10px;animation-delay:.2s}.track-bar:nth-child(3){height:13px;animation-delay:.4s}
@keyframes eq{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
.volume-row{padding:8px 8px 2px;display:flex;align-items:center;gap:8px;border-top:1px solid var(--gold-border);margin-top:8px}
.volume-label{font-size:11px;color:var(--text-muted);flex-shrink:0}
.volume-slider{flex:1;-webkit-appearance:none;height:3px;background:var(--gold-border);border-radius:2px;outline:none;cursor:pointer}
.volume-slider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:var(--gold);border-radius:50%}

.main-content{padding:2.5rem 1.5rem 6rem;max-width:1400px;margin:0 auto}
.daily-quote{margin-bottom:2rem;padding:1.2rem 1.6rem;background:${th.accent}0f;border:1px solid var(--gold-border);border-radius:8px;position:relative;overflow:hidden}
.daily-quote::before{content:'❝';position:absolute;top:-10px;${dir==='rtl'?'left':'right'}:16px;font-size:5rem;color:var(--gold);opacity:.06;font-family:Georgia,serif;line-height:1}
.quote-label{font-size:9px;color:var(--gold);letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px;opacity:.7}
.quote-text{font-family:Georgia,serif;font-size:14px;color:var(--text);line-height:1.65;font-style:italic}
.quote-source{font-size:11px;color:var(--text-muted);margin-top:6px}
.streak-bar{display:inline-flex;align-items:center;gap:8px;padding:5px 13px;background:rgba(255,140,0,.1);border:1px solid rgba(255,140,0,.3);border-radius:20px;margin-bottom:1.5rem}
.streak-fire{font-size:14px}.streak-count{font-size:13px;font-weight:600;color:#e07800}.streak-label{font-size:11px;color:var(--text-muted)}
.section-header{margin-bottom:2rem;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.section-title{font-family:Georgia,serif;font-size:2rem;font-weight:500;color:var(--text);line-height:1.2}
.section-title span{color:var(--gold);font-style:italic}
.section-count{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;padding-bottom:4px}
.view-tabs{display:flex;gap:6px;margin-bottom:1.5rem}
.view-tab{padding:5px 14px;background:transparent;border:1px solid var(--gold-border);border-radius:20px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:all .2s}
.view-tab:hover,.view-tab.active{background:var(--gold-dim);border-color:var(--gold);color:var(--gold)}
.cat-tabs{display:flex;gap:7px;margin-bottom:1.75rem;flex-wrap:wrap}
.cat-tab{padding:4px 13px;background:transparent;border:1px solid var(--gold-border);border-radius:20px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:all .2s}
.cat-tab:hover,.cat-tab.active{background:var(--gold-dim);border-color:var(--gold);color:var(--gold)}
.search-inside-wrap{margin-bottom:1.5rem;position:relative}
.search-inside-input{width:100%;padding:9px 14px 9px 36px;background:var(--input-bg);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:12px;outline:none;transition:border-color .2s}
.search-inside-input:focus{border-color:var(--gold)}.search-inside-input::placeholder{color:var(--text-muted)}
.search-inside-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;pointer-events:none}
.upgrade-banner{margin:0 0 2rem;padding:1.1rem 1.5rem;background:${th.accent}10;border:1px solid var(--gold-border);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
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
  position:relative;border-radius:10px;overflow:hidden;cursor:pointer;
  aspect-ratio:2/3;
  transition:filter 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  border:1px solid var(--gold-border);
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
  books.forEach(b => ((b as any).summaries?.[0]?.key_insights||[]).forEach((i:string)=>all.push({text:i,source:b.title})))
  if(!all.length) return null
  return all[Math.floor(Date.now()/86400000) % all.length]
}
function updateStreak() {
  const today=new Date().toDateString(), last=localStorage.getItem('hob_last_visit')
  const n=parseInt(localStorage.getItem('hob_streak')||'0'), yesterday=new Date(Date.now()-86400000).toDateString()
  const s=last===today?n:last===yesterday?n+1:1
  localStorage.setItem('hob_last_visit',today); localStorage.setItem('hob_streak',String(s)); return s
}

// ── Focus Card ───────────────────────────────────────────────────────
const FocusCard = memo(({ book, index, hovered, setHovered, isLocked, onOpen }: any) => {
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
      {isLocked ? (
        <div style={{
          position:'absolute',top:'8px',right:'8px',
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

// ── Expanded reader panel ─────────────────────────────────────────
function ExpandedPanel({
  book, t, shelfStatus, progress, exportingPDF,
  currentNote, noteSaved, chatMessages, chatInput, chatLoading,
  summaryLoading, onClose, onShelf, onProgress, onExportPDF, onSaveNote,
  onNoteChange, onToggleChat, onGenerateSummary, onSendMessage, onChatInput,
  chatEndRef
}: any) {
  const [activeTab, setActiveTab] = useState<'about'|'insights'|'shelf'|'chat'>('about')

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
        background:'#0f0e0b',
        borderBottom:'0.5px solid rgba(255,255,255,0.06)',
        flexShrink:0,
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
          }}
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
            }}
          >🔖</button>
        </div>
      </div>

      {/* HERO — cover + info side by side */}
      <div style={{
        display:'flex',alignItems:'center',
        padding:'20px',gap:'20px',
        background:'linear-gradient(135deg,#1a1208,#0d0c09)',
        borderBottom:'0.5px solid rgba(201,168,76,0.1)',
        flexShrink:0,
      }}>
        <img
          src={book.cover_url || `https://picsum.photos/seed/${book.id}/200/300`}
          alt={book.title}
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${book.id}/200/300` }}
          style={{
            width:'90px',height:'130px',
            objectFit:'cover',borderRadius:'10px',
            border:'1.5px solid rgba(201,168,76,0.4)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.7)',
            flexShrink:0,
          }}
        />
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:'11px',color:'#9a9080',marginBottom:'6px',fontFamily:'Georgia,serif'}}>
            {(book as any).read_time_mins || 15} min · AI Summary
          </div>
          <div style={{
            fontSize:'1.1rem',color:'#e8e4d9',fontWeight:'500',
            lineHeight:'1.3',marginBottom:'4px',fontFamily:'Georgia,serif',
          }}>{book.title}</div>
          <div style={{fontSize:'11px',color:'#9a9080',fontStyle:'italic',marginBottom:'10px',fontFamily:'Georgia,serif'}}>
            by {book.author}
          </div>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            <div style={{background:'rgba(201,168,76,0.1)',border:'0.5px solid rgba(201,168,76,0.25)',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',color:'#c9a84c'}}>
              {book.category}
            </div>
            <div style={{background:'rgba(201,168,76,0.1)',border:'0.5px solid rgba(201,168,76,0.25)',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',color:'#c9a84c'}}>
              ✦ AI Ready
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{
        display:'flex',gap:'10px',padding:'14px 16px',
        flexShrink:0,
        borderBottom:'0.5px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => setActiveTab('about')}
          style={{
            flex:2,padding:'12px',
            background:'#c9a84c',color:'#0a0a0f',
            border:'none',borderRadius:'12px',
            fontSize:'14px',cursor:'pointer',
            fontFamily:'Georgia,serif',fontWeight:'600',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
          }}
        >▶ Read Now</button>
        <button
          onClick={() => { setActiveTab('chat'); onToggleChat() }}
          style={{
            flex:1,padding:'12px',
            background:'rgba(201,168,76,0.12)',color:'#c9a84c',
            border:'0.5px solid rgba(201,168,76,0.3)',borderRadius:'12px',
            fontSize:'13px',cursor:'pointer',
            fontFamily:'Georgia,serif',
            display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',
          }}
        >✦ AI Chat</button>
      </div>

      {/* TABS */}
      <div style={{
        display:'flex',
        borderBottom:'0.5px solid rgba(255,255,255,0.06)',
        flexShrink:0,padding:'0 16px',
        overflowX:'auto',
        scrollbarWidth:'none' as any,
      }}>
        {(['about','insights','shelf','chat'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding:'12px 16px',
              fontSize:'13px',
              color: activeTab === tab ? '#c9a84c' : '#9a9080',
              cursor:'pointer',border:'none',background:'none',
              fontFamily:'Georgia,serif',
              borderBottom: activeTab === tab ? '2px solid #c9a84c' : '2px solid transparent',
              transition:'color .2s',
              whiteSpace:'nowrap',flexShrink:0,
            }}
          >
            {tab === 'about' ? 'About' : tab === 'insights' ? 'Key Insights' : tab === 'shelf' ? 'My Shelf' : '✦ AI Chat'}
          </button>
        ))}
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{
        flex:1,overflowY:'auto',
        padding:'20px 16px',
        WebkitOverflowScrolling:'touch' as any,
      }}>

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'12px',fontFamily:'Georgia,serif'}}>
              What's it about?
            </div>
            <div style={{fontSize:'14px',color:'#9a9080',lineHeight:'1.75',marginBottom:'20px',fontFamily:'Georgia,serif'}}>
              {book.summary || 'Click ✦ AI Summary to generate a comprehensive summary of this book.'}
            </div>
            {!book.summary && (
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
            <div style={{
              background:'rgba(255,255,255,0.03)',
              border:'0.5px solid rgba(255,255,255,0.08)',
              borderRadius:'10px',padding:'12px 14px',
              fontSize:'12px',color:'#9a9080',
              fontFamily:'Georgia,serif',marginBottom:'16px',
            }}>
              🎧 Audio Summary — Coming Soon
            </div>
          </div>
        )}

        {/* KEY INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div>
            <div style={{fontSize:'18px',color:'#e8e4d9',fontWeight:'500',marginBottom:'8px',fontFamily:'Georgia,serif'}}>
              Key Insights
            </div>
            <div style={{fontSize:'12px',color:'#9a9080',marginBottom:'16px',fontFamily:'Georgia,serif'}}>
              Core ideas distilled by AI
            </div>
            {book.key_insights ? (
              book.key_insights.split('\n').filter((i: string) => i.trim()).map((insight: string, idx: number) => (
                <div key={idx} style={{
                  display:'flex',gap:'10px',
                  background:'rgba(201,168,76,0.05)',
                  border:'0.5px solid rgba(201,168,76,0.15)',
                  borderRadius:'12px',padding:'12px 14px',
                  fontSize:'13px',color:'#e8e4d9',lineHeight:'1.6',
                  marginBottom:'10px',fontFamily:'Georgia,serif',
                }}>
                  <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#c9a84c',marginTop:'6px',flexShrink:0}}/>
                  <div>
                    <strong style={{color:'#c9a84c',fontSize:'10px',letterSpacing:'.08em',textTransform:'uppercase'}}>Insight {idx+1}</strong>
                    <br/>{insight.replace(/^[-•*]\s*/,'')}
                  </div>
                </div>
              ))
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
          </div>
        )}

        {/* MY SHELF TAB */}
        {activeTab === 'shelf' && (
          <div>
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
              <div style={{width:'100%',background:'rgba(255,255,255,0.06)',borderRadius:'4px',height:'4px',marginBottom:'10px'}}>
                <div style={{height:'4px',background:'#c9a84c',borderRadius:'4px',width:`${progress}%`,transition:'width .3s'}}/>
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
          </div>
        )}

        {/* AI CHAT TAB */}
        {activeTab === 'chat' && (
          <div>
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
                  padding:'10px 12px',borderRadius:'10px',
                  background:'rgba(255,255,255,0.04)',
                  marginBottom:'8px',fontFamily:'Georgia,serif',
                }}>
                  Hello! I have read every word of "{book.title}". What would you like to explore?
                </div>
              )}
              {chatMessages.map((msg: any, i: number) => (
                <div key={i} style={{
                  fontSize:'13px',color:'#e8e4d9',lineHeight:'1.6',
                  padding:'10px 12px',borderRadius:'10px',
                  marginBottom:'8px',fontFamily:'Georgia,serif',
                  background: msg.role === 'user' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
                  marginLeft: msg.role === 'user' ? '20px' : '0',
                  marginRight: msg.role === 'assistant' ? '20px' : '0',
                }}>
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{fontSize:'12px',color:'#c9a84c',padding:'8px',fontFamily:'Georgia,serif'}}>✦ Thinking...</div>
              )}
              <div ref={chatEndRef}/>
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <textarea
                  value={chatInput}
                  onChange={e => onChatInput(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSendMessage(chatInput)} }}
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
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    background:'#c9a84c',border:'none',
                    borderRadius:'10px',width:'40px',
                    cursor:'pointer',fontSize:'16px',
                    color:'#0a0a0f',flexShrink:0,
                    opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                  }}
                >→</button>
              </div>
            </div>
            <div style={{fontSize:'10px',color:'#9a9080',textAlign:'center',paddingBottom:'1rem',fontFamily:'Georgia,serif'}}>
              10 free AI chats · Resets every 6 hours
            </div>
          </div>
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
  const [summaryLoading,setSummaryLoading]=useState(false)
  const [showEmailModal,setShowEmailModal]=useState(false)
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
  const [aiChatCount,setAiChatCount]=useState(0)
  const [isTrial,setIsTrial]=useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('library')
  const [emailInput, setEmailInput] = useState('')
  const [appFlow, setAppFlow] = useState<AppFlow>(
    () => localStorage.getItem('userEmail') ? 'app' : 'login'
  )
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showIOSInstall, setShowIOSInstall] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

  const audioRef=useRef<HTMLAudioElement|null>(null)
  const chatEndRef=useRef<HTMLDivElement|null>(null)
  const themeMenuRef=useRef<HTMLDivElement>(null!)
  const musicMenuRef=useRef<HTMLDivElement>(null!)
  const langMenuRef=useRef<HTMLDivElement>(null!)

  const theme=THEMES.find(t=>t.id===themeId)||THEMES[0]
  const lang=LANGUAGES.find(l=>l.id===langId)||LANGUAGES[0]
  const t=T[langId]||T.en

  useEffect(() => {
    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const email = session.user.email
        setUserEmail(email)
        localStorage.setItem('userEmail', email)
        if (isAdmin(email)) setIsPremium(true)
        else checkPremium(email)
        setAppFlow('app')
      }
      setAppReady(true)
    })

    // Listen for auth changes (OAuth redirect callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email) {
          const email = session.user.email
          setUserEmail(email)
          localStorage.setItem('userEmail', email)
          if (isAdmin(email)) setIsPremium(true)
          else checkPremium(email)
          setAppFlow('app')
        }
        if (event === 'SIGNED_OUT') {
          setUserEmail('')
          setAppFlow('landing')
          localStorage.clear()
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // PWA install detection
  useEffect(() => {
    // Show install button when prompt is available
    const handleInstallable = () => {
      setShowInstallBtn(true)
    }
    
    // Hide button if already installed
    const handleInstalled = () => {
      setShowInstallBtn(false)
    }
    
    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false)
    }
    
    // Show iOS install instructions if on iOS and not already installed
    if (isIOS && !isInStandaloneMode) {
      setTimeout(() => setShowIOSInstall(true), 3000)
    }
    
    window.addEventListener('pwa-installable', handleInstallable)
    window.addEventListener('appinstalled', handleInstalled)
    
    return () => {
      window.removeEventListener('pwa-installable', handleInstallable)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [isIOS, isInStandaloneMode])

  const installPWA = async () => {
    if ((window as any).triggerPWAInstall) {
      const accepted = await (window as any).triggerPWAInstall()
      if (accepted) {
        setShowInstallBtn(false)
      }
    } else {
      // iOS fallback instructions
      alert('To install: tap the Share button in your browser then "Add to Home Screen"')
    }
  }

  // Show feedback widget after every 3rd message
  // useEffect(() => {
  //   if (chatMessages.length > 0 && chatMessages.length % 3 === 0 && !feedbackGiven) {
  //     setShowFeedbackWidget(true)
  //   }
  // }, [chatMessages.length, feedbackGiven])

  useEffect(()=>{
    const load=async()=>{
      const {data,error}=await supabase.from('books').select('*').order('title')
      if(!error&&data)setBooks(data)
      setLoading(false)
    }
    load()
  },[])
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
    // Admin bypass - set premium immediately for admin email
    if (savedEmail && isAdmin(savedEmail)) setIsPremium(true)
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
        audioRef.current.volume=volume
        audioRef.current.play().catch(()=>{})
        setIsPlaying(true)
      }
    }else if(audioRef.current){audioRef.current.pause();setIsPlaying(false)}
  },[currentTrack,volume])
  useEffect(()=>{if(audioRef.current)audioRef.current.volume=volume},[volume])
  useEffect(()=>{
    const ids=Object.keys(shelf).filter(id=>shelf[id]==='finished')
    if(ids.length>0&&!recommendations.length)loadRecommendations(ids)
  },[shelf])

  const selectTheme=(id:string)=>{setThemeId(id);setShowThemeMenu(false)}
  const selectLang=(id:string)=>{setLangId(id);setShowLangMenu(false)}
  const toggleTrack=(id:string)=>{setCurrentTrack(currentTrack===id?'':id)}
  const checkPremium=async(email:string)=>{
    try{
      const {data}=await supabase.from('users').select('email').eq('email',email).single()
      setIsPremium(!!data)
      if(data)setShowEmailModal(false)
    }catch{}
    // Admin bypass
    if (isAdmin(email)) setIsPremium(true)
  }
  const logout = async () => {
  await signOut()
  setUserEmail('')
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
  const handleLogin = async () => {
    const email = emailInput.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    await signInWithEmail(email)
  }
  const updateShelf=(bookId:string,status:ShelfStatus)=>{setShelf(p=>({...p,[bookId]:status}))}
  const updateProgress=(bookId:string,pct:number)=>{setReadingProgress(p=>({...p,[bookId]:pct}))}
  const saveNote=(bookId:string,text:string)=>{setNotes(p=>({...p,[bookId]:text}));setNoteSaved(true);setTimeout(()=>setNoteSaved(false),2000)}
  const exportPDF=async()=>{
    if(!selectedBook||!isPremium)return
    setExportingPDF(true)
    try{
      const summary=(selectedBook as any).summaries?.[0]
      const insights:string[]=summary?.key_insights||[]
      const html=`<!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>${selectedBook.title} — Insights</title>
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
      <h1>${selectedBook.title}</h1>
      <div class="author">by ${selectedBook.author}</div>
      <div class="divider"></div>
      <h2>✦ Key Insights</h2>
      ${insights.map((ins,i)=>`<div class="insight"><div class="num">${String(i+1).padStart(2,'0')}</div><div class="text">${ins}</div></div>`).join('')}
      <div class="footer">Generated by House of Books · houseofbooks.app</div>
      </body></html>`

      const win=window.open('','_blank')
      if(win){win.document.write(html);win.document.close();win.print()}
    }finally{setExportingPDF(false)}
  }
  const generateAISummary=async()=>{
    if(!selectedBook||summaryLoading)return
    setSummaryLoading(true);setChatMessages([{role:'assistant',content:t.summarizing}])
    try{
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'summary',bookTitle:selectedBook.title,bookAuthor:selectedBook.author,langId})})
      const data=await res.json()
      setChatMessages([{role:'assistant',content:data.content||t.noResponse}])
      
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
    if(idx>=FREE_BOOKS&&!isPremium){setShowEmailModal(true);return}
    setSelectedBook(book);setChatMessages([])
    setCurrentNote(notes[book.id]||'');setNoteSaved(false)
  }
  const closeBook=()=>{setSelectedBook(null);setChatMessages([])}
  const sendMessage=async(messageValue?: string)=>{
    const content = messageValue ?? chatInput
    if(!content.trim()||chatLoading||!selectedBook)return
    const msg:ChatMessage={role:'user',content}
    setChatMessages(p=>[...p,msg]);setChatInput('');setChatLoading(true)
    try{
      const res=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          messages:[...chatMessages,msg],
          bookTitle:selectedBook.title,
          bookCategory:selectedBook.category,
          systemPrompt:`You are an expert on "${selectedBook.title}" by ${selectedBook.author}. Answer in 2-3 paragraphs maximum. Be conversational, insightful and specific to this book.` 
        })
      })
      const data=await res.json()
      setChatMessages(p=>[...p,{role:'assistant',content:data.content||t.noResponse}])
      
      // Collect feedback silently
      collectChatFeedback({
        message: content,
        bookCategory: selectedBook.category,
        messageCount: chatMessages.length,
      })
    }catch{setChatMessages(p=>[...p,{role:'assistant',content:t.connectionError}])}
    finally{setChatLoading(false)}
  }

  const categories=['All',...Array.from(new Set(books.map(b=>b.category).filter(Boolean))).sort()]
  const dailyQuote=getDailyQuote(books)
  const shelfCount=Object.values(shelf).filter(v=>v&&v!=='none').length

  const filteredBooks=books.filter(book=>{
    const matchesSearch=book.title.toLowerCase().includes(searchQuery.toLowerCase())||book.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory=activeCategory==='All'||book.category===activeCategory
    const matchesView=activeView==='all'||(activeView==='shelf'&&shelf[book.id]&&shelf[book.id]!=='none')
    const matchesInside=!searchInside||((book as any).summaries?.[0]?.short_summary||'').toLowerCase().includes(searchInside.toLowerCase())||((book as any).summaries?.[0]?.key_insights||[]).some((i:string)=>i.toLowerCase().includes(searchInside.toLowerCase()))
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
      {!isPremium&&<div className="upgrade-banner"><div className="upgrade-text"><h3>{t.unlockTitle}</h3><p>{t.unlockDesc}</p></div><button className="btn-premium" style={{cursor: 'default', opacity: 0.7}} onClick={e => e.preventDefault()}>{t.startFor}</button></div>}

      {filteredBooks.length===0
        ? <div style={{textAlign:'center',padding:'4rem',color:'var(--text-muted)'}}>{t.noResults}</div>
        : <div className="books-grid">
            {filteredBooks.map((book,index)=>(
              <FocusCard
                key={book.id}
                book={book}
                index={index}
                hovered={hovered}
                setHovered={setHovered}
                isLocked={books.findIndex(b=>b.id===book.id)>=FREE_BOOKS&&!isPremium&&!isAdmin(userEmail)}
                shelfStatus={shelf[book.id]||'none'}
                progress={readingProgress[book.id]||0}
                onOpen={()=>openBook(book)}
                t={t}
              />
            ))}
          </div>
      }
    </>
  )

  if (!appReady) return (
    <>
      <style>{buildStyles(theme, lang.dir)}</style>
      <div className="app-bg" style={{zIndex: 0}}/>
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
        <div className="app-bg" style={{zIndex: 0}}/>

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
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📚</div>

          <h1 className="landing-title">
            The World's Greatest Books<br/>
            <em style={{color: '#e8e4d9'}}>Distilled by AI</em>
          </h1>

          <p className="landing-sub">
            Read smarter. Explore 304 books with AI summaries,
            live chat, and a global reading community. Free during beta.
          </p>

          {/* Stats */}
          <div style={{display:'flex', justifyContent:'center', gap:'3rem', marginBottom:'3rem'}}>
            {[['304','BOOKS'],['90','FREE'],['5','LANGUAGES']].map(([n,l]) => (
              <div key={l}>
                <div className="landing-stat-num">{n}</div>
                <div className="landing-stat-label">{l}</div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'2rem'}}>
            <button
              className="btn-premium"
              style={{padding:'14px 32px', fontSize:'15px'}}
              onClick={() => setAppFlow('login')}
            >
              Start Reading Free →
            </button>
            <button
              className="btn-ai"
              style={{padding:'14px 32px', fontSize:'15px'}}
              onClick={() => setAppFlow('login')}
            >
              Join Community
            </button>
          </div>

          {/* PWA Install Button */}
          <button
            onClick={installPWA}
            style={{
              marginTop: '12px',
              background: 'none',
              border: '0.5px solid rgba(201,168,76,0.3)',
              borderRadius: '20px',
              padding: '8px 20px',
              color: '#9a9080',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif'
            }}
          >
            📲 Install as App — iOS & Android
          </button>

          {/* Feature cards */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',
            gap:'16px', maxWidth:'800px', width:'100%'
          }}>
            {[
              ['📚','304 Books','Classics and modern titles from 15+ countries in 5 languages'],
              ['✦','AI Book Chat','10 free AI chats per session — ask anything about any book'],
              ['🌍','Community','Reading groups, discussions, and global readers'],
              ['⭐','Premium Soon','Unlimited AI, full library access, PDF exports and more']
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
          <div style={{background:'rgba(14,14,20,0.97)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'16px',padding:'2.5rem',maxWidth:'400px',width:'100%',textAlign:'center' as const}}>
            <div style={{fontSize:'2.5rem',marginBottom:'12px'}}>📚</div>
            <h2 style={{fontSize:'1.6rem',color:'#c9a84c',marginBottom:'8px',fontFamily:'Georgia,serif'}}>House of Books</h2>
            <p style={{color:'#9a9080',fontSize:'13px',marginBottom:'2rem',lineHeight:1.6}}>Sign in to start reading</p>
            <input
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') handleLogin() }}
              style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'10px',color:'#e8e4d9',fontSize:'14px',outline:'none',marginBottom:'8px',fontFamily:'Georgia,serif',boxSizing:'border-box' as const}}
            />
            <button
              onClick={handleLogin}
              style={{width:'100%',padding:'11px',background:'#c9a84c',border:'none',borderRadius:'10px',color:'#0a0a0f',fontSize:'14px',cursor:'pointer',fontFamily:'Georgia,serif'}}
            >
              Enter House of Books →
            </button>
            <button
              onClick={() => setAppFlow('landing')}
              style={{background:'none',border:'none',color:'#9a9080',fontSize:'12px',cursor:'pointer',fontFamily:'Georgia,serif',marginTop:'12px',display:'block',width:'100%'}}
            >
              ← Back
            </button>
          </div>
        </div>
      </>
    )
  }

  if (appFlow === 'login') {
    return <LoginScreen />
  }

  return(<><style>{buildStyles(theme,lang.dir)}</style>
  <div className="app-bg"/>
  <div className="app-root">

    {/* HEADER */}
    <header className="app-header">
      <div style={{display:'flex',alignItems:'center',gap:'11px'}}>
        <div className="logo-mark">📚</div>
        <div><div className="logo-text">{t.appName}</div><div className="logo-sub">{t.appSub}</div></div>
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
        <button
          onClick={() => setCurrentPage('community')}
          style={{
            padding: '6px 16px', borderRadius: '999px', border: 'none',
            background: currentPage === 'community' ? 'var(--gold-dim)' : 'transparent',
            color: currentPage === 'community' ? 'var(--gold)' : 'var(--text-muted)',
            fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif'
          }}>
          🌍 Community
        </button>
        {isAdmin(userEmail) && (
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
        <button className="icon-btn" onClick={()=>window.open('/community','_blank')} title="Community">👥</button>
        {/* Mobile search toggle button — only visible on mobile */}
        <button
          className="icon-btn mobile-search-btn"
          onClick={() => setShowMobileSearch(v => !v)}
          style={{display: 'none'}} // shown via CSS media query
          title="Search"
        >
          🔍
        </button>
        {/* Android — native prompt */}
        {showInstallBtn && !isIOS && (
          <button
            onClick={installPWA}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px',
              background: 'rgba(201,168,76,0.12)',
              border: '0.5px solid rgba(201,168,76,0.4)',
              borderRadius: '20px',
              color: '#c9a84c',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              letterSpacing: '.04em',
              transition: 'all .2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(201,168,76,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(201,168,76,0.12)'}
          >
            📲 Install App
          </button>
        )}

        {/* iOS — show instructions banner */}
        {isIOS && !isInStandaloneMode && (
          <button
            onClick={() => setShowIOSInstall(true)}
            className="pwa-install-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px',
              background: 'rgba(201,168,76,0.12)',
              border: '0.5px solid rgba(201,168,76,0.4)',
              borderRadius: '20px',
              color: '#c9a84c',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              letterSpacing: '.04em',
              transition: 'all .2s',
              whiteSpace: 'nowrap'
            }}
          >
            📲 Install App
          </button>
        )}
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
        <button className="btn-premium" onClick={()=>window.open('https://house-of-books.lemonsqueezy.com/checkout/buy/df5fc3da-2939-4d0e-afaa-1f15b56610aa?variant=1370006','_blank')}>{t.upgrade}</button>
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
      {currentPage === 'library' && <LibraryPage />}
      {currentPage === 'community' && <CommunityHub userEmail={userEmail} />}
      {currentPage === 'agent' && isAdmin(userEmail) && <Agent />}
      {currentPage === 'dashboard' && isAdmin(userEmail) && <Dashboard />}
    </main>

    {/* EXPANDED PANEL */}
    <AnimatePresence>
      {selectedBook&&(
        <ExpandedPanel
          book={selectedBook} t={t}
          isPremium={isPremium} shelfStatus={shelf[selectedBook.id]||'none'}
          progress={readingProgress[selectedBook.id]||0}
          exportingPDF={exportingPDF}
          currentNote={currentNote} noteSaved={noteSaved}
          chatMessages={chatMessages}
          chatInput={chatInput} chatLoading={chatLoading}
          summaryLoading={summaryLoading}
          onClose={closeBook}
          onShelf={s=>updateShelf(selectedBook.id,s)}
          onProgress={pct=>updateProgress(selectedBook.id,pct)}
          onExportPDF={exportPDF}
          onSaveNote={text=>saveNote(selectedBook.id,text)}
          onNoteChange={setCurrentNote}
          onToggleChat={()=>{}}
          onGenerateSummary={generateAISummary}
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
            <button className="btn-premium" style={{flex:1}} onClick={()=>window.open('https://house-of-books.lemonsqueezy.com/checkout/buy/df5fc3da-2939-4d0e-afaa-1f15b56610aa?variant=1370006','_blank')}>{t.upgradePremium}</button>
          </div>
        </div>
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
                {isAdmin(userEmail) ? '👑 Admin' : isPremium ? '⭐ Premium' : isTrial ? '🎯 Trial' : '📚 Reader'}
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
          {!isPremium && !isAdmin(userEmail) && (
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
          {isAdmin(userEmail) && (
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
            <button
              onClick={() => { setShowUserDashboard(false); window.location.href='/community' }}
              style={{
                background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                borderRadius:'10px', padding:'11px', color:'var(--text)',
                fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                textAlign:'left', paddingLeft:'16px'
              }}>
              🌍 Go to Community
            </button>
            {isAdmin(userEmail) && (
              <button
                onClick={() => { setShowUserDashboard(false); window.location.href='/dashboard' }}
                style={{
                  background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                  borderRadius:'10px', padding:'11px', color:'var(--text)',
                  fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                  textAlign:'left', paddingLeft:'16px'
                }}>
                ⚙️ Admin Dashboard
              </button>
            )}
            {isAdmin(userEmail) && (
              <button
                onClick={() => { setShowUserDashboard(false); window.location.href='/agent' }}
                style={{
                  background:'var(--surface)', border:'0.5px solid var(--gold-border)',
                  borderRadius:'10px', padding:'11px', color:'var(--text)',
                  fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                  textAlign:'left', paddingLeft:'16px'
                }}>
                🤖 AI Agents
              </button>
            )}
            <button
              onClick={logout}
              style={{
                background:'rgba(220,50,50,0.08)', border:'0.5px solid rgba(220,50,50,0.3)',
                borderRadius:'10px', padding:'11px', color:'#e05555',
                fontSize:'13px', cursor:'pointer', fontFamily:'Georgia, serif',
                textAlign:'left', paddingLeft:'16px', marginTop:'4px'
              }}>
              🚪 Log Out
            </button>
          </div>

          {/* Close */}
          <button
            onClick={() => setShowUserDashboard(false)}
            style={{
              marginTop:'1rem', width:'100%', background:'none',
              border:'none', color:'var(--text-muted)', fontSize:'12px',
              cursor:'pointer', fontFamily:'Georgia, serif'
            }}>
            Close
          </button>
        </div>
      </div>
    )}
    
    {/* iOS Install Instructions Modal */}
    {showIOSInstall && (
      <div
        onClick={() => setShowIOSInstall(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(14,14,20,0.99)',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
            marginBottom: '1rem'
          }}
        >
          <div style={{fontSize:'2rem', marginBottom:'12px'}}>📱</div>
          <h3 style={{color:'#c9a84c', fontSize:'1.2rem', marginBottom:'8px'}}>
            Install on iPhone
          </h3>
          <p style={{color:'#9a9080', fontSize:'13px', marginBottom:'1.5rem', lineHeight:1.6}}>
            Follow these 3 steps to add House of Books to your home screen:
          </p>
          <div style={{display:'flex', flexDirection:'column', gap:'12px', marginBottom:'1.5rem'}}>
            {[
              ['1', '📤', 'Tap the Share button', 'The square with an arrow at the bottom of Safari'],
              ['2', '📜', 'Scroll down to menu', 'Look for "Add to Home Screen" option'],
              ['3', '✅', 'Tap "Add to Home Screen"', 'Then tap "Add" in the top right corner'],
            ].map(([num, emoji, title, desc]) => (
              <div key={num} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                background: 'rgba(201,168,76,0.06)',
                border: '0.5px solid rgba(201,168,76,0.2)',
                borderRadius: '12px', padding: '12px',
                textAlign: 'left'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(201,168,76,0.15)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', color: '#c9a84c', flexShrink: 0
                }}>{num}</div>
                <div>
                  <div style={{fontSize:'13px', color:'#e8e4d9', marginBottom:'2px'}}>{emoji} {title}</div>
                  <div style={{fontSize:'11px', color:'#9a9080'}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowIOSInstall(false)}
            style={{
              width: '100%', padding: '11px',
              background: '#c9a84c', border: 'none',
              borderRadius: '10px', color: '#0a0a0f',
              fontSize: '14px', cursor: 'pointer',
              fontFamily: 'Georgia, serif'
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    )}
  </div></>)
}
