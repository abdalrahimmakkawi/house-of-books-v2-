import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import type { Book } from './lib/supabase'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ── Languages ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'en', label: 'English',  emoji: '🇬🇧', dir: 'ltr' },
  { id: 'ar', label: 'العربية', emoji: '🇸🇦', dir: 'rtl' },
  { id: 'fr', label: 'Français', emoji: '🇫🇷', dir: 'ltr' },
  { id: 'es', label: 'Español',  emoji: '🇪🇸', dir: 'ltr' },
  { id: 'zh', label: '中文',     emoji: '🇨🇳', dir: 'ltr' },
]

const T: Record<string, Record<string, string>> = {
  en: {
    appName: 'House of Books',
    appSub: 'AI-Powered Reading',
    searchPlaceholder: 'Search books, authors…',
    upgrade: 'Upgrade',
    wallpaper: 'Wallpaper',
    music: 'Ambient Music',
    language: 'Language',
    sectionTitle: "The World's Greatest Books,",
    sectionTitleSpan: 'Distilled by AI',
    books: 'books',
    unlockTitle: 'Unlock 166 Premium Books',
    unlockDesc: 'Full library · AI summaries · Audio summaries coming soon — $6/month',
    startFor: 'Start for $6/mo',
    overview: 'Overview',
    fullSummary: 'Full Summary',
    keyInsights: 'Key Insights',
    aboutBook: 'About This Book',
    aboutBookDesc: 'Click ✦ AI Summary to generate a comprehensive summary, or open ✦ AI Chat to ask any question.',
    aiSummary: '✦ AI Summary',
    generating: '✦ Generating…',
    aiChat: '✦ AI Chat',
    hideChat: 'Hide Chat',
    aiExpert: 'AI Book Expert',
    askAnything: 'Ask me anything about this book.',
    askPlaceholder: 'Ask a question…',
    send: '→',
    premium: 'Premium',
    audioComingSoon: 'Audio Summary — Coming Soon',
    minRead: 'min read',
    loading: 'House of Books',
    alreadyMember: 'Already a member? Enter your email to unlock. Otherwise upgrade to access all 210 books.',
    unlockAccess: 'Unlock Access',
    upgradePremium: 'Upgrade $6/mo',
    premiumBook: 'Premium Book',
    connectionError: 'Connection error.',
    noResponse: 'No response.',
    failedSummary: 'Failed to generate summary.',
    summarizing: '✦ Generating summary…',
    by: 'by',
    vol: 'Vol',
  },
  ar: {
    appName: 'بيت الكتب',
    appSub: 'قراءة مدعومة بالذكاء الاصطناعي',
    searchPlaceholder: 'ابحث عن كتب، مؤلفين…',
    upgrade: 'ترقية',
    wallpaper: 'خلفية',
    music: 'موسيقى محيطية',
    language: 'اللغة',
    sectionTitle: 'أعظم كتب العالم،',
    sectionTitleSpan: 'مُقطَّرة بالذكاء الاصطناعي',
    books: 'كتاب',
    unlockTitle: 'افتح 166 كتاباً مميزاً',
    unlockDesc: 'مكتبة كاملة · ملخصات ذكاء اصطناعي · ملخصات صوتية قريباً — 6$/شهر',
    startFor: 'ابدأ بـ 6$/شهر',
    overview: 'نظرة عامة',
    fullSummary: 'الملخص الكامل',
    keyInsights: 'الأفكار الرئيسية',
    aboutBook: 'عن هذا الكتاب',
    aboutBookDesc: 'اضغط ✦ ملخص ذكاء اصطناعي لإنشاء ملخص شامل، أو افتح ✦ الدردشة الذكية لطرح أي سؤال.',
    aiSummary: '✦ ملخص ذكاء اصطناعي',
    generating: '✦ جارٍ التوليد…',
    aiChat: '✦ الدردشة الذكية',
    hideChat: 'إخفاء الدردشة',
    aiExpert: 'خبير الكتاب الذكي',
    askAnything: 'اسألني أي شيء عن هذا الكتاب.',
    askPlaceholder: 'اطرح سؤالاً…',
    send: '→',
    premium: 'مميز',
    audioComingSoon: 'الملخص الصوتي — قريباً',
    minRead: 'دقيقة قراءة',
    loading: 'بيت الكتب',
    alreadyMember: 'عضو بالفعل؟ أدخل بريدك الإلكتروني للوصول. أو قم بالترقية للوصول إلى جميع الكتب.',
    unlockAccess: 'فتح الوصول',
    upgradePremium: 'ترقية 6$/شهر',
    premiumBook: 'كتاب مميز',
    connectionError: 'خطأ في الاتصال.',
    noResponse: 'لا يوجد رد.',
    failedSummary: 'فشل إنشاء الملخص.',
    summarizing: '✦ جارٍ إنشاء الملخص…',
    by: 'بقلم',
    vol: 'صوت',
  },
  fr: {
    appName: 'House of Books',
    appSub: 'Lecture propulsée par IA',
    searchPlaceholder: 'Rechercher livres, auteurs…',
    upgrade: 'Passer Premium',
    wallpaper: 'Fond d\'écran',
    music: 'Musique d\'ambiance',
    language: 'Langue',
    sectionTitle: 'Les Plus Grands Livres du Monde,',
    sectionTitleSpan: 'Distillés par l\'IA',
    books: 'livres',
    unlockTitle: 'Débloquer 166 Livres Premium',
    unlockDesc: 'Bibliothèque complète · Résumés IA · Résumés audio bientôt — 6$/mois',
    startFor: 'Commencer à 6$/mois',
    overview: 'Aperçu',
    fullSummary: 'Résumé Complet',
    keyInsights: 'Points Clés',
    aboutBook: 'À Propos de ce Livre',
    aboutBookDesc: 'Cliquez ✦ Résumé IA pour générer un résumé complet, ou ouvrez ✦ Chat IA pour poser des questions.',
    aiSummary: '✦ Résumé IA',
    generating: '✦ Génération…',
    aiChat: '✦ Chat IA',
    hideChat: 'Masquer le Chat',
    aiExpert: 'Expert IA du Livre',
    askAnything: 'Posez-moi n\'importe quelle question sur ce livre.',
    askPlaceholder: 'Posez une question…',
    send: '→',
    premium: 'Premium',
    audioComingSoon: 'Résumé Audio — Bientôt',
    minRead: 'min de lecture',
    loading: 'House of Books',
    alreadyMember: 'Déjà membre? Entrez votre email pour débloquer. Sinon passez premium pour accéder à tous les livres.',
    unlockAccess: 'Débloquer l\'Accès',
    upgradePremium: 'Passer Premium 6$/mois',
    premiumBook: 'Livre Premium',
    connectionError: 'Erreur de connexion.',
    noResponse: 'Aucune réponse.',
    failedSummary: 'Échec de la génération du résumé.',
    summarizing: '✦ Génération du résumé…',
    by: 'par',
    vol: 'Vol',
  },
  es: {
    appName: 'House of Books',
    appSub: 'Lectura Potenciada por IA',
    searchPlaceholder: 'Buscar libros, autores…',
    upgrade: 'Mejorar Plan',
    wallpaper: 'Fondo de Pantalla',
    music: 'Música Ambiental',
    language: 'Idioma',
    sectionTitle: 'Los Mejores Libros del Mundo,',
    sectionTitleSpan: 'Destilados por IA',
    books: 'libros',
    unlockTitle: 'Desbloquear 166 Libros Premium',
    unlockDesc: 'Bibliothèque complète · Résumés IA · Résumés audio bientôt — 6$/mois',
    startFor: 'Comenzar por 6$/mes',
    overview: 'Resumen',
    fullSummary: 'Resumen Completo',
    keyInsights: 'Ideas Clave',
    aboutBook: 'Sobre Este Libro',
    aboutBookDesc: 'Haz clic en ✦ Resumen IA para generar un resumen completo, o abre ✦ Chat IA para hacer preguntas.',
    aiSummary: '✦ Resumen IA',
    generating: '✦ Generando…',
    aiChat: '✦ Chat IA',
    hideChat: 'Ocultar Chat',
    aiExpert: 'Experto IA del Libro',
    askAnything: 'Pregúntame cualquier cosa sobre este libro.',
    askPlaceholder: 'Haz una pregunta…',
    send: '→',
    premium: 'Premium',
    audioComingSoon: 'Resumen de Audio — Próximamente',
    minRead: 'min de lectura',
    loading: 'House of Books',
    alreadyMember: '¿Ya eres miembro? Ingresa tu email para desbloquear. Si no, actualiza para acceder a todos los libros.',
    unlockAccess: 'Desbloquear Acceso',
    upgradePremium: 'Premium 6$/mes',
    premiumBook: 'Libro Premium',
    connectionError: 'Error de conexión.',
    noResponse: 'Sin respuesta.',
    failedSummary: 'Error al generar el resumen.',
    summarizing: '✦ Generando resumen…',
    by: 'por',
    vol: 'Vol',
  },
  zh: {
    appName: '书之屋',
    appSub: 'AI 智能阅读',
    searchPlaceholder: '搜索书籍、作者…',
    upgrade: '升级会员',
    wallpaper: '壁纸',
    music: '环境音乐',
    language: '语言',
    sectionTitle: '世界最伟大的书籍，',
    sectionTitleSpan: '由AI精炼提取',
    books: '本书',
    unlockTitle: '解锁166本高级书籍',
    unlockDesc: '完整书库 · AI摘要 · 语音摘要即将推出 — $6/月',
    startFor: '$6/月 立即开始',
    overview: '概述',
    fullSummary: '完整摘要',
    keyInsights: '核心洞见',
    aboutBook: '关于本书',
    aboutBookDesc: '点击 ✦ AI摘要 生成全面摘要，或打开 ✦ AI对话 提问任何问题。',
    aiSummary: '✦ AI摘要',
    generating: '✦ 生成中…',
    aiChat: '✦ AI对话',
    hideChat: '隐藏对话',
    aiExpert: 'AI图书专家',
    askAnything: '向我提问关于这本书的任何问题。',
    askPlaceholder: '提一个问题…',
    send: '→',
    premium: '高级',
    audioComingSoon: '语音摘要 — 即将推出',
    minRead: '分钟阅读',
    loading: '书之屋',
    alreadyMember: '已是会员？输入邮箱解锁。否则升级以访问所有书籍。',
    unlockAccess: '解锁访问',
    upgradePremium: '升级 $6/月',
    premiumBook: '高级书籍',
    connectionError: '连接错误。',
    noResponse: '无响应。',
    failedSummary: '摘要生成失败。',
    summarizing: '✦ 正在生成摘要…',
    by: '作者',
    vol: '音量',
  },
}

const LANG_PROMPTS: Record<string, string> = {
  en: 'Respond in English.',
  ar: 'أجب باللغة العربية فقط.',
  fr: 'Réponds uniquement en français.',
  es: 'Responde únicamente en español.',
  zh: '请只用中文回答。',
}

// ── Themes ────────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'classic', label: 'Classic', emoji: '🏛️', image: '/wallpaper/classic.jpg', accent: '#c9a84c', accentLight: '#e8c97a', overlay: 'rgba(8,6,2,0.82)' },
  { id: 'cosmos',  label: 'Cosmos',  emoji: '🌌', image: '/wallpaper/cosmos.jpg',  accent: '#7eb8f7', accentLight: '#b3d4ff', overlay: 'rgba(2,4,18,0.80)' },
  { id: 'nature',  label: 'Nature',  emoji: '🌿', image: '/wallpaper/nature.jpg',  accent: '#7ec87e', accentLight: '#a8e6a8', overlay: 'rgba(2,10,4,0.80)' },
  { id: 'beach',   label: 'Beach',   emoji: '🌊', image: '/wallpaper/beach.jpg',   accent: '#4fc3c3', accentLight: '#88e0e0', overlay: 'rgba(2,12,18,0.78)' },
]

const TRACKS = [
  { id: 'library', label: 'Library',   emoji: '📚', src: '/music/library.mp3' },
  { id: 'beach',   label: 'Beach',     emoji: '🏖️', src: '/music/beach.mp3'   },
  { id: 'forest',  label: 'Forest',    emoji: '🌲', src: '/music/forest.mp3'  },
  { id: 'rain',    label: 'Rain',      emoji: '🌧️', src: '/music/rain.mp3'    },
  { id: 'cosmos',  label: 'Cosmos',    emoji: '🚀', src: '/music/cosmos.mp3'  },
]

const buildStyles = (t: typeof THEMES[0], dir: string) => `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--gold:${t.accent};--gold-light:${t.accentLight};--gold-dim:${t.accent}26;--gold-border:${t.accent}40;--dark:#0a0a0f;--text:#e8e4d9;--text-muted:rgba(232,228,217,0.52)}
  html{scroll-behavior:smooth;direction:${dir}}
  body{font-family:${dir === 'rtl' ? "'Noto Sans Arabic'" : "'Inter'"}, sans-serif;font-size:14px;min-height:100vh;background:var(--dark);color:var(--text);direction:${dir}}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--gold-dim);border-radius:2px}
  .app-bg{position:fixed;inset:0;z-index:0;background-color:#0a0a0f;background-image:url('${t.image}');background-size:cover;background-position:center}
  .app-bg::after{content:'';position:absolute;inset:0;background:${t.overlay}}
  .app-root{position:relative;z-index:1;min-height:100vh}
  .app-header{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.9);backdrop-filter:blur(24px);border-bottom:1px solid var(--gold-border);padding:0 1.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .logo-mark{width:34px;height:34px;border:1px solid var(--gold);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
  .logo-text{font-family:Georgia,serif;font-size:1.35rem;font-weight:600;color:var(--gold);letter-spacing:.05em;line-height:1}
  .logo-sub{font-size:10px;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
  .header-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
  .search-wrap{position:relative;display:flex;align-items:center}
  .search-icon{position:absolute;${dir === 'rtl' ? 'right' : 'left'}:11px;color:var(--text-muted);width:13px;height:13px;pointer-events:none}
  .search-input{width:220px;padding:7px 14px 7px ${dir === 'rtl' ? '14px' : '34px'};padding-${dir === 'rtl' ? 'right' : 'left'}:34px;background:rgba(255,255,255,.04);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:12px;outline:none;transition:border-color .2s;direction:${dir}}
  .search-input::placeholder{color:var(--text-muted)}.search-input:focus{border-color:var(--gold)}
  .icon-btn{width:34px;height:34px;background:rgba(255,255,255,.05);border:1px solid var(--gold-border);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative;flex-shrink:0}
  .icon-btn:hover,.icon-btn.active{border-color:var(--gold);color:var(--gold);background:var(--gold-dim)}
  .btn-premium{padding:7px 16px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a0a0f;border:none;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:opacity .2s,transform .15s;white-space:nowrap;flex-shrink:0}
  .btn-premium:hover{opacity:.9;transform:translateY(-1px)}
  .dropdown{position:absolute;top:calc(100% + 8px);${dir === 'rtl' ? 'left' : 'right'}:0;background:rgba(14,14,20,.97);border:1px solid var(--gold-border);border-radius:10px;padding:10px;min-width:190px;z-index:300;box-shadow:0 12px 40px rgba(0,0,0,.6);animation:dropIn .18s ease}
  @keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .dropdown-title{font-size:10px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;padding:2px 6px 8px;border-bottom:1px solid var(--gold-border);margin-bottom:8px}
  .dropdown-item{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:6px;cursor:pointer;transition:background .15s;font-size:13px;color:var(--text-muted);border:none;background:transparent;width:100%;text-align:${dir === 'rtl' ? 'right' : 'left'};direction:${dir}}
  .dropdown-item:hover{background:var(--gold-dim);color:var(--text)}.dropdown-item.active{background:var(--gold-dim);color:var(--gold)}
  .dropdown-item-emoji{font-size:16px;flex-shrink:0}
  .track-playing{margin-${dir === 'rtl' ? 'right' : 'left'}:auto;display:flex;gap:2px;align-items:flex-end;height:14px}
  .track-bar{width:3px;background:var(--gold);border-radius:1px;animation:eq .8s ease-in-out infinite alternate}
  .track-bar:nth-child(1){height:6px}.track-bar:nth-child(2){height:10px;animation-delay:.2s}.track-bar:nth-child(3){height:13px;animation-delay:.4s}
  @keyframes eq{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
  .volume-row{padding:8px 8px 2px;display:flex;align-items:center;gap:8px;border-top:1px solid var(--gold-border);margin-top:8px}
  .volume-label{font-size:11px;color:var(--text-muted);flex-shrink:0}
  .volume-slider{flex:1;-webkit-appearance:none;height:3px;background:var(--gold-border);border-radius:2px;outline:none;cursor:pointer}
  .volume-slider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;background:var(--gold);border-radius:50%;cursor:pointer}
  .main-content{padding:2.5rem 1.5rem 6rem;max-width:1400px;margin:0 auto}
  .section-header{margin-bottom:2rem;display:flex;align-items:flex-end;justify-content:space-between}
  .section-title{font-family:Georgia,serif;font-size:2rem;font-weight:500;color:var(--text);line-height:1.2}
  .section-title span{color:var(--gold);font-style:italic}
  .section-count{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;padding-bottom:4px}
  .cat-tabs{display:flex;gap:7px;margin-bottom:1.75rem;flex-wrap:wrap}
  .cat-tab{padding:4px 13px;background:transparent;border:1px solid var(--gold-border);border-radius:20px;color:var(--text-muted);font-size:11px;cursor:pointer;transition:all .2s}
  .cat-tab:hover,.cat-tab.active{background:var(--gold-dim);border-color:var(--gold);color:var(--gold)}
  .upgrade-banner{margin:0 0 2rem;padding:1.1rem 1.5rem;background:linear-gradient(135deg,${t.accent}14,${t.accent}06);border:1px solid var(--gold-border);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .upgrade-text h3{font-family:Georgia,serif;font-size:1.2rem;color:var(--gold);margin-bottom:3px}
  .upgrade-text p{font-size:12px;color:var(--text-muted)}
  .books-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:1.4rem}
  .book-card{cursor:pointer;transition:transform .25s}.book-card:hover{transform:translateY(-5px)}
  .book-cover-wrap{position:relative;aspect-ratio:2/3;border-radius:6px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.55)}
  .book-cover-wrap img{width:100%;height:100%;object-fit:cover;transition:transform .35s;display:block}
  .book-card:hover .book-cover-wrap img{transform:scale(1.06)}
  .book-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,10,15,.85) 0%,transparent 50%);opacity:0;transition:opacity .3s}
  .book-card:hover .book-overlay{opacity:1}
  .book-locked{position:absolute;inset:0;background:rgba(10,10,15,.72);backdrop-filter:blur(2px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:6px}
  .lock-icon{width:26px;height:26px;border:1.5px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:11px}
  .lock-label{font-size:9px;color:var(--gold);letter-spacing:.06em;text-transform:uppercase;font-weight:500}
  .book-info{margin-top:9px}
  .book-title{font-family:Georgia,serif;font-size:.93rem;font-weight:500;color:var(--text);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .book-author{font-size:11px;color:var(--text-muted);margin-top:3px}
  .book-cat{display:inline-block;margin-top:5px;font-size:9px;color:var(--gold);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--gold-border);padding:2px 7px;border-radius:3px}
  .loading-screen{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:var(--dark)}
  .loading-logo{font-family:Georgia,serif;font-size:2rem;color:var(--gold);letter-spacing:.1em}
  .loading-bar{width:200px;height:1px;background:var(--gold-dim);position:relative;overflow:hidden;border-radius:1px}
  .loading-bar::after{content:'';position:absolute;left:-60%;top:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,var(--gold),transparent);animation:loadAnim 1.2s infinite}
  @keyframes loadAnim{0%{left:-60%}100%{left:110%}}
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);z-index:200;display:flex;align-items:center;justify-content:center;padding:1.25rem;animation:fadeIn .2s ease}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  .modal{background:rgba(14,14,20,.97);border:1px solid var(--gold-border);border-radius:12px;width:100%;max-width:1080px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;animation:slideUp .22s ease}
  @keyframes slideUp{from{transform:translateY(18px);opacity:0}to{transform:none;opacity:1}}
  .modal-header{padding:1.1rem 1.5rem;border-bottom:1px solid var(--gold-border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:1rem}
  .modal-title{font-family:Georgia,serif;font-size:1.5rem;font-weight:500;color:var(--gold);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .modal-author{font-size:12px;color:var(--text-muted);margin-top:2px}
  .modal-actions{display:flex;gap:7px;align-items:center;flex-shrink:0}
  .btn-ai{padding:6px 14px;background:${t.accent}20;border:1px solid var(--gold-border);color:var(--gold);border-radius:6px;font-size:11px;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
  .btn-ai:hover{background:var(--gold-dim);border-color:var(--gold)}.btn-ai:disabled{opacity:.4;cursor:not-allowed}.btn-ai.active{background:var(--gold-dim);border-color:var(--gold)}
  .btn-close{width:30px;height:30px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
  .btn-close:hover{background:rgba(255,255,255,.1);color:var(--text)}
  .modal-body{display:flex;flex:1;overflow:hidden}
  .reader-panel{flex:1;overflow-y:auto;padding:1.75rem 2rem}
  .book-hero{display:flex;gap:2rem;margin-bottom:2rem;align-items:flex-start}
  .hero-cover{width:140px;flex-shrink:0;border-radius:8px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.7);position:relative}
  .hero-cover img{width:100%;display:block;border-radius:8px}
  .hero-cover::after{content:'';position:absolute;inset:0;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(201,168,76,0.2)}
  .hero-meta{flex:1;padding-top:4px}
  .hero-cat-label{font-size:10px;color:var(--gold);letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px;opacity:.7}
  .hero-title{font-family:Georgia,serif;font-size:1.9rem;font-weight:600;color:var(--text);line-height:1.15;margin-bottom:6px}
  .hero-author{font-size:13px;color:var(--text-muted);margin-bottom:10px}
  .hero-divider{width:32px;height:1px;background:var(--gold);opacity:.4;margin:10px 0}
  .hero-badges{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
  .hero-badge{display:inline-block;padding:3px 10px;border:1px solid var(--gold-border);border-radius:3px;font-size:10px;color:var(--gold);letter-spacing:.06em;text-transform:uppercase}
  .audio-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:${t.accent}0d;border:1px solid var(--gold-border);border-radius:20px}
  .audio-pill span:last-child{font-size:11px;color:var(--gold);letter-spacing:.04em}
  .content-section{background:rgba(255,255,255,.022);border:1px solid ${t.accent}15;border-radius:8px;padding:1.35rem;margin-bottom:1.1rem}
  .content-section h4{font-family:Georgia,serif;font-size:1.1rem;font-weight:600;color:var(--gold);margin-bottom:.8rem}
  .content-section p{color:var(--text-muted);line-height:1.78;font-size:13.5px}
  .insights-list{list-style:none;display:flex;flex-direction:column;gap:9px}
  .insight-item{display:flex;gap:11px;align-items:flex-start;padding:9px 11px;background:${t.accent}0d;border-radius:6px;border-${dir === 'rtl' ? 'right' : 'left'}:2px solid var(--gold)}
  .insight-num{font-family:Georgia,serif;font-size:1.05rem;color:var(--gold);font-weight:600;flex-shrink:0;line-height:1.4;min-width:20px}
  .insight-text{font-size:13px;color:var(--text-muted);line-height:1.6}
  .chat-panel{width:360px;flex-shrink:0;border-${dir === 'rtl' ? 'right' : 'left'}:1px solid var(--gold-border);display:flex;flex-direction:column;background:rgba(10,10,15,.6)}
  .chat-header{padding:.9rem 1.1rem;border-bottom:1px solid var(--gold-border);display:flex;align-items:center;gap:9px;flex-shrink:0}
  .chat-ai-dot{width:7px;height:7px;background:var(--gold);border-radius:50%;animation:pulse 2s infinite;flex-shrink:0}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  .chat-header-text h4{font-size:12px;font-weight:600;color:var(--text)}.chat-header-text p{font-size:10px;color:var(--text-muted)}
  .chat-messages{flex:1;overflow-y:auto;padding:.9rem;display:flex;flex-direction:column;gap:11px}
  .chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;text-align:center;padding:2rem;color:var(--text-muted)}
  .chat-empty-icon{width:44px;height:44px;border:1px solid var(--gold-border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px}
  .chat-empty p{font-size:12px;line-height:1.55}
  .msg{max-width:90%;padding:9px 12px;border-radius:10px;font-size:12.5px;line-height:1.62;white-space:pre-wrap;word-break:break-word}
  .msg-user{background:${t.accent}1a;border:1px solid var(--gold-border);align-self:flex-end;color:var(--text);border-bottom-right-radius:3px}
  .msg-ai{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);align-self:flex-start;color:var(--text-muted);border-bottom-left-radius:3px}
  .msg-typing{display:flex;gap:4px;align-items:center;padding:12px 14px}
  .typing-dot{width:5px;height:5px;background:var(--gold);border-radius:50%;animation:bounce 1.2s infinite}
  .typing-dot:nth-child(2){animation-delay:.2s}.typing-dot:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
  .chat-input-area{padding:.9rem;border-top:1px solid var(--gold-border);display:flex;gap:7px;flex-shrink:0}
  .chat-input{flex:1;padding:8px 11px;background:rgba(255,255,255,.04);border:1px solid var(--gold-border);border-radius:6px;color:var(--text);font-size:12px;outline:none;transition:border-color .2s;direction:${dir}}
  .chat-input:focus{border-color:var(--gold)}.chat-input::placeholder{color:var(--text-muted)}
  .btn-send{padding:8px 13px;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:#0a0a0f;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s;flex-shrink:0}
  .btn-send:hover{opacity:.9}.btn-send:disabled{opacity:.4;cursor:not-allowed}
  @media(max-width:900px){.search-input{width:150px}.books-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:1rem}.chat-panel{width:300px}}
  @media(max-width:640px){.modal-body{flex-direction:column}.chat-panel{width:100%;border-left:none;border-top:1px solid var(--gold-border);max-height:45vh}.book-hero{flex-direction:column}.hero-cover{width:100px}.search-input{display:none}}
  @media(max-width:768px){
    .app-bg{background-image:none !important;background-color:#0a0a0f}
    .app-header{backdrop-filter:none;background:rgba(10,10,15,0.98)}
    .books-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:1rem}
    .hero-cover{width:80px}
    .hero-title{font-size:1.4rem}
    .modal{max-height:95vh}
    .chat-panel{max-height:40vh}
  }
`

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReader, setShowReader] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [themeId, setThemeId] = useState('classic')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showMusicMenu, setShowMusicMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [langId, setLangId] = useState('en')
  const [currentTrack, setCurrentTrack] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.4)
  const [isPlaying, setIsPlaying] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const themeMenuRef = useRef<HTMLDivElement | null>(null)
  const musicMenuRef = useRef<HTMLDivElement | null>(null)
  const langMenuRef = useRef<HTMLDivElement | null>(null)

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const lang = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0]
  const t = T[langId] || T.en

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) setShowThemeMenu(false)
      if (musicMenuRef.current && !musicMenuRef.current.contains(e.target as Node)) setShowMusicMenu(false)
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) setShowLangMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { fetchBooks() }, [])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  useEffect(() => {
    const savedEmail = localStorage.getItem('hob_email')
    const savedPremium = localStorage.getItem('hob_premium')
    const savedLang = localStorage.getItem('hob_lang')
    if (savedEmail && savedPremium === 'true') { setUserEmail(savedEmail); setIsPremium(true) }
    if (savedLang) setLangId(savedLang)
  }, [])

  useEffect(() => {
    let result = books
    if (activeCategory !== 'All') result = result.filter(b => b.category === activeCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    }
    setFilteredBooks(result)
  }, [books, searchQuery, activeCategory])

  useEffect(() => {
    if (!currentTrack) return
    const track = TRACKS.find(tr => tr.id === currentTrack)
    if (!track) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    const audio = new Audio(track.src)
    audio.loop = true; audio.volume = volume
    audio.play().catch(() => {})
    audioRef.current = audio; setIsPlaying(true)
    return () => { audio.pause(); audio.src = '' }
  }, [currentTrack])

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume])

  const selectLang = (id: string) => {
    setLangId(id)
    localStorage.setItem('hob_lang', id)
    setShowLangMenu(false)
  }

  const toggleTrack = (trackId: string) => {
    if (currentTrack === trackId && isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
    else if (currentTrack === trackId && !isPlaying) { audioRef.current?.play().catch(() => {}); setIsPlaying(true) }
    else setCurrentTrack(trackId)
  }

  const checkPremium = async (email: string) => {
    const { data } = await supabase.from('premium_users').select('active').eq('email', email).single()
    if (data?.active) {
      setIsPremium(true)
      localStorage.setItem('hob_email', email)
      localStorage.setItem('hob_premium', 'true')
    }
  }

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category).filter(Boolean))).sort()]

  const fetchBooks = async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const racePromise = Promise.race([
          supabase.from('books').select('*, summaries(short_summary, long_summary, key_insights)').order('title', { ascending: true }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
        const { data, error } = await racePromise as any;
        if (error) throw error;
        setBooks(data || []);
        setLoading(false);
        return;
      } catch {
        if (attempt === 3) setLoading(false);
        else await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  const openBook = (book: Book) => {
    const idx = books.findIndex(b => b.id === book.id)
    if (idx >= 54 && !isPremium) { setShowEmailModal(true); return }
    setSelectedBook(book); setShowReader(true); setChatMessages([]); setShowChat(false)
  }

  const closeReader = () => { setShowReader(false); setShowChat(false); setSelectedBook(null); setChatMessages([]) }

  const systemPrompt = (bookTitle: string, bookAuthor: string) =>
    `You are a world-class literary expert on "${bookTitle}" by ${bookAuthor}. Be insightful and concise. ${LANG_PROMPTS[langId]}` 

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMessage: ChatMessage = { role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMessage]); setChatInput(''); setChatLoading(true)
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-0a2bd43938e740e885070afa5c62d8ea' },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [
          { role: 'system', content: systemPrompt(selectedBook?.title || '', selectedBook?.author || '') },
          ...chatMessages, userMessage
        ]})
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.choices?.[0]?.message?.content || t.noResponse }])
    } catch { setChatMessages(prev => [...prev, { role: 'assistant', content: t.connectionError }]) }
    finally { setChatLoading(false) }
  }

  const generateAISummary = async () => {
    if (!selectedBook || summaryLoading) return
    setSummaryLoading(true); setShowChat(true); setChatMessages([{ role: 'assistant', content: t.summarizing }])
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-0a2bd43938e740e885070afa5c62d8ea' },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [
          { role: 'system', content: systemPrompt(selectedBook.title, selectedBook.author) },
          { role: 'user', content: `Write a comprehensive, beautifully structured summary of "${selectedBook.title}" by ${selectedBook.author}. Cover main themes, key ideas, and most important takeaways. ${LANG_PROMPTS[langId]}` }
        ]})
      })
      const data = await res.json()
      setChatMessages([{ role: 'assistant', content: data.choices?.[0]?.message?.content || t.noResponse }])
    } catch { setChatMessages([{ role: 'assistant', content: t.failedSummary }]) }
    finally { setSummaryLoading(false) }
  }

  const summary = (selectedBook as any)?.summaries?.[0]
  const insights: string[] = summary?.key_insights || []

  if (loading) return (
    <><style>{buildStyles(theme, lang.dir)}</style>
    <div className="loading-screen"><div className="loading-logo">{t.loading}</div><div className="loading-bar" /></div></>
  )

  return (
    <><style>{buildStyles(theme, lang.dir)}</style>
    <div className="app-bg" />
    <div className="app-root">

      <header className="app-header">
        <div style={{display:'flex',alignItems:'center',gap:'11px'}}>
          <div className="logo-mark">📚</div>
          <div><div className="logo-text">{t.appName}</div><div className="logo-sub">{t.appSub}</div></div>
        </div>
        <div className="header-right">
          <div className="search-wrap">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input className="search-input" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
          </div>

          {/* Language picker */}
          <div style={{position:'relative'}} ref={langMenuRef}>
            <button className={`icon-btn${showLangMenu?' active':''}`} onClick={()=>{setShowLangMenu(v=>!v);setShowThemeMenu(false);setShowMusicMenu(false)}} title={t.language}>
              {lang.emoji}
            </button>
            {showLangMenu && (
              <div className="dropdown" style={{minWidth:'160px'}}>
                <div className="dropdown-title">{t.language}</div>
                {LANGUAGES.map(l => (
                  <button key={l.id} className={`dropdown-item${langId===l.id?' active':''}`} onClick={()=>selectLang(l.id)}>
                    <span className="dropdown-item-emoji">{l.emoji}</span>{l.label}
                    {langId===l.id && <span style={{marginLeft:'auto',color:'var(--gold)',fontSize:'11px'}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme picker */}
          <div style={{position:'relative'}} ref={themeMenuRef}>
            <button className={`icon-btn${showThemeMenu?' active':''}`} onClick={()=>{setShowThemeMenu(v=>!v);setShowMusicMenu(false);setShowLangMenu(false)}} title={t.wallpaper}>🎨</button>
            {showThemeMenu && (
              <div className="dropdown" style={{minWidth:'170px'}}>
                <div className="dropdown-title">{t.wallpaper}</div>
                {THEMES.map(th => (
                  <button key={th.id} className={`dropdown-item${themeId===th.id?' active':''}`} onClick={()=>{setThemeId(th.id);setShowThemeMenu(false)}}>
                    <span className="dropdown-item-emoji">{th.emoji}</span>{th.label}
                    {themeId===th.id && <span style={{marginLeft:'auto',color:'var(--gold)',fontSize:'11px'}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Music picker */}
          <div style={{position:'relative'}} ref={musicMenuRef}>
            <button className={`icon-btn${(isPlaying||showMusicMenu)?' active':''}`} onClick={()=>{setShowMusicMenu(v=>!v);setShowThemeMenu(false);setShowLangMenu(false)}} title={t.music}>
              {isPlaying?'🎵':'🎧'}
            </button>
            {showMusicMenu && (
              <div className="dropdown" style={{minWidth:'200px'}}>
                <div className="dropdown-title">{t.music}</div>
                {TRACKS.map(tr => (
                  <button key={tr.id} className={`dropdown-item${currentTrack===tr.id?' active':''}`} onClick={()=>toggleTrack(tr.id)}>
                    <span className="dropdown-item-emoji">{tr.emoji}</span>{tr.label}
                    {currentTrack===tr.id && isPlaying && <span className="track-playing"><span className="track-bar"/><span className="track-bar"/><span className="track-bar"/></span>}
                    {currentTrack===tr.id && !isPlaying && <span style={{marginLeft:'auto',fontSize:'11px',color:'var(--text-muted)'}}>⏸</span>}
                  </button>
                ))}
                <div className="volume-row">
                  <span className="volume-label">{t.vol}</span>
                  <input type="range" className="volume-slider" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(parseFloat(e.target.value))}/>
                </div>
              </div>
            )}
          </div>

          <button className="btn-premium" onClick={()=>window.open('https://house-of-books.lemonsqueezy.com/checkout/buy/df5fc3da-2939-4d0e-afaa-1f15b56610aa?variant=1370006','_blank')}>{t.upgrade}</button>
        </div>
      </header>

      <main className="main-content">
        <div className="section-header">
          <div><h2 className="section-title">{t.sectionTitle}<br/><span>{t.sectionTitleSpan}</span></h2></div>
          <div className="section-count">{filteredBooks.length} {t.books}</div>
        </div>
        <div className="cat-tabs">
          {categories.map(cat=>(
            <button key={cat} className={`cat-tab${activeCategory===cat?' active':''}`} onClick={()=>setActiveCategory(cat)}>{cat}</button>
          ))}
        </div>
        <div className="upgrade-banner">
          <div className="upgrade-text"><h3>{t.unlockTitle}</h3><p>{t.unlockDesc}</p></div>
          <button className="btn-premium" onClick={()=>window.open('https://house-of-books.lemonsqueezy.com/checkout/buy/df5fc3da-2939-4d0e-afaa-1f15b56610aa?variant=1370006','_blank')}>{t.startFor}</button>
        </div>
        <div className="books-grid">
          {filteredBooks.map(book=>{
            const idx=books.findIndex(b=>b.id===book.id); const free=idx<54
            return(
              <div key={book.id} className="book-card" onClick={()=>openBook(book)}>
                <div className="book-cover-wrap">
                  <img src={book.cover_url} alt={book.title} onError={e=>{(e.target as HTMLImageElement).src=`https://picsum.photos/seed/${book.id}/200/300`}}/>
                  <div className="book-overlay"/>
                  {!free&&<div className="book-locked"><div className="lock-icon">🔒</div><div className="lock-label">{t.premium}</div></div>}
                </div>
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author}</div>
                  {book.category&&<span className="book-cat">{book.category}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {showReader&&selectedBook&&(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&closeReader()}>
          <div className="modal">
            <div className="modal-header">
              <div style={{minWidth:0}}>
                <div className="modal-title">{selectedBook.title}</div>
                <div className="modal-author">{t.by} {selectedBook.author}</div>
              </div>
              <div className="modal-actions">
                <button className="btn-ai" onClick={generateAISummary} disabled={summaryLoading}>{summaryLoading?t.generating:t.aiSummary}</button>
                <button className={`btn-ai${showChat?' active':''}`} onClick={()=>setShowChat(!showChat)}>{showChat?t.hideChat:t.aiChat}</button>
                <button className="btn-close" onClick={closeReader}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="reader-panel">
                <div className="book-hero">
                  <div className="hero-cover">
                    <img src={selectedBook.cover_url} alt={selectedBook.title} onError={e=>{(e.target as HTMLImageElement).src=`https://picsum.photos/seed/${selectedBook.id}/200/300`}}/>
                  </div>
                  <div className="hero-meta">
                    {selectedBook.category && <div className="hero-cat-label">{selectedBook.category}</div>}
                    <div className="hero-title">{selectedBook.title}</div>
                    <div className="hero-author">{t.by} {selectedBook.author}</div>
                    <div className="hero-divider"/>
                    <div className="hero-badges">
                      {selectedBook.category && <span className="hero-badge">{selectedBook.category}</span>}
                      {(selectedBook as any).read_time_mins && <span className="hero-badge">⏱ {(selectedBook as any).read_time_mins} {t.minRead}</span>}
                      <span className="hero-badge">✦ AI</span>
                    </div>
                    <div className="audio-pill">
                      <span style={{fontSize:'13px'}}>🎧</span>
                      <span style={{fontSize:'11px',color:'var(--gold)',letterSpacing:'.04em'}}>{t.audioComingSoon}</span>
                    </div>
                  </div>
                </div>

                {summary?.short_summary&&<div className="content-section"><h4>{t.overview}</h4><p>{summary.short_summary}</p></div>}
                {summary?.long_summary&&<div className="content-section"><h4>{t.fullSummary}</h4><p>{summary.long_summary}</p></div>}
                {insights.length>0&&(
                  <div className="content-section">
                    <h4>{t.keyInsights}</h4>
                    <ul className="insights-list">
                      {insights.map((ins,i)=>(
                        <li key={i} className="insight-item">
                          <span className="insight-num">{String(i+1).padStart(2,'0')}</span>
                          <span className="insight-text">{ins}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!summary&&<div className="content-section"><h4>{t.aboutBook}</h4><p>{t.aboutBookDesc}</p></div>}
              </div>

              {showChat&&(
                <div className="chat-panel">
                  <div className="chat-header"><div className="chat-ai-dot"/><div className="chat-header-text"><h4>{t.aiExpert}</h4><p>"{selectedBook.title}"</p></div></div>
                  <div className="chat-messages">
                    {chatMessages.length===0
                      ?<div className="chat-empty"><div className="chat-empty-icon">✦</div><p>{t.askAnything}</p></div>
                      :chatMessages.map((msg,i)=><div key={i} className={`msg ${msg.role==='user'?'msg-user':'msg-ai'}`}>{msg.content}</div>)
                    }
                    {chatLoading&&<div className="msg msg-ai msg-typing"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>}
                    <div ref={chatEndRef}/>
                  </div>
                  <div className="chat-input-area">
                    <input className="chat-input" placeholder={t.askPlaceholder} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()}/>
                    <button className="btn-send" onClick={sendMessage} disabled={chatLoading||!chatInput.trim()}>{t.send}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEmailModal&&(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setShowEmailModal(false)}>
          <div style={{background:'rgba(14,14,20,0.97)',border:'1px solid var(--gold-border)',borderRadius:'12px',padding:'2rem',maxWidth:'400px',width:'100%',animation:'slideUp .22s ease'}}>
            <h3 style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.5rem',color:'var(--gold)',marginBottom:'8px'}}>{t.premiumBook}</h3>
            <p style={{color:'var(--text-muted)',fontSize:'13px',marginBottom:'1.5rem',lineHeight:'1.6'}}>{t.alreadyMember}</p>
            <input type="email" placeholder="your@email.com" value={userEmail} onChange={e=>setUserEmail(e.target.value)}
              style={{width:'100%',padding:'9px 13px',background:'rgba(255,255,255,.04)',border:'1px solid var(--gold-border)',borderRadius:'6px',color:'var(--text)',fontSize:'13px',outline:'none',marginBottom:'10px',direction:'ltr'}}/>
            <div style={{display:'flex',gap:'8px'}}>
              <button className="btn-ai" style={{flex:1}} onClick={()=>{checkPremium(userEmail);setShowEmailModal(false)}}>{t.unlockAccess}</button>
              <button className="btn-premium" style={{flex:1}} onClick={()=>window.open('https://house-of-books.lemonsqueezy.com/checkout/buy/df5fc3da-2939-4d0e-afaa-1f15b56610aa?variant=1370006','_blank')}>{t.upgradePremium}</button>
            </div>
          </div>
        </div>
      )}
    </div></>
  )
}

export default App
