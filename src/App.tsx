import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { Book } from './lib/supabase'

const ADMIN_EMAIL = 'abdalrahimmakkawi@gmail.com'
const FREE_BOOKS = 90
const FREE_AI_CHATS = 10
const COOLDOWN_HOURS = 6
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY

const isAdmin = (email: string) => email.toLowerCase().trim() === ADMIN_EMAIL

type Page = 'library' | 'community' | 'agent' | 'dashboard'
type ShelfStatus = 'none' | 'want' | 'reading' | 'finished'
type AppFlow = 'loading' | 'login' | 'app'
type HubTab = 'summary' | 'insights' | 'discuss' | 'chat' | 'shelf'

export default function App() {
  const [appFlow, setAppFlow] = useState<AppFlow>('login')
  const [userEmail, setUserEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [currentPage, setCurrentPage] = useState<Page>('library')
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [hubTab, setHubTab] = useState<HubTab>('summary')
  const [searchQuery, setSearchQuery] = useState('')
  const [shelf, setShelf] = useState<Record<string, ShelfStatus>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [chatMessages, setChatMessages] = useState<{role:string;content:string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [aiChatCount, setAiChatCount] = useState(0)
  const [showCooldown, setShowCooldown] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [feedTab, setFeedTab] = useState<'all'|'shelf'|'free'>('all')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
  // Load local state
  try {
    const s = localStorage.getItem('shelf'); if(s) setShelf(JSON.parse(s))
    const p = localStorage.getItem('progress'); if(p) setProgress(JSON.parse(p))
    const n = localStorage.getItem('notes'); if(n) setNotes(JSON.parse(n))
    const c = localStorage.getItem('aiChatCount'); if(c) setAiChatCount(parseInt(c))
  } catch(e) {}

  // If email saved, go straight to app and load books in background
  const savedEmail = localStorage.getItem('userEmail')
  if (savedEmail) {
    setUserEmail(savedEmail)
    setAppFlow('app')
    supabase.from('books').select('*').order('created_at', { ascending: true })
      .then(({ data }) => { if(data) { setBooks(data); setFilteredBooks(data) } })
  }

  // PWA
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault(); (window as any).__pwa = e; setShowInstallBtn(true)
  })
}, [])

  const handleLogin = () => {
  const email = emailInput.trim().toLowerCase()
  if (!email || !email.includes('@')) return
  setUserEmail(email)
  localStorage.setItem('userEmail', email)
  setAppFlow('app')
  supabase.from('books').select('*').order('created_at', { ascending: true })
    .then(({ data }) => { if(data) { setBooks(data); setFilteredBooks(data) } })
}

  const logout = async () => {
    await supabase.auth.signOut()
    setUserEmail('')
    setEmailInput('')
    setAppFlow('login')
    setShowUserMenu(false)
    localStorage.clear()
  }

  // ── SEARCH ────────────────────────────────
  useEffect(() => {
    const q = searchQuery.toLowerCase()
    let filtered = q
      ? books.filter(b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          (b.category || '').toLowerCase().includes(q)
        )
      : [...books]
    if (feedTab === 'shelf') filtered = filtered.filter(b => shelf[b.id] && shelf[b.id] !== 'none')
    if (feedTab === 'free') filtered = filtered.slice(0, FREE_BOOKS)
    setFilteredBooks(filtered)
  }, [searchQuery, books, feedTab, shelf])

  // ── AI CHAT ───────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading || !selectedBook) return

    const resetTime = localStorage.getItem('aiChatResetTime')
    if (resetTime && Date.now() < parseInt(resetTime)) {
      setShowCooldown(true)
      return
    }

    if (aiChatCount >= FREE_AI_CHATS && !isAdmin(userEmail)) {
      localStorage.setItem('aiChatResetTime', String(Date.now() + COOLDOWN_HOURS * 3600000))
      setAiChatCount(0)
      localStorage.setItem('aiChatCount', '0')
      setShowCooldown(true)
      return
    }

    const userMsg = { role: 'user', content: text }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    const newCount = aiChatCount + 1
    setAiChatCount(newCount)
    localStorage.setItem('aiChatCount', String(newCount))

    try {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_KEY}` 
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: 500,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are an expert on "${selectedBook.title}" by ${selectedBook.author}. Answer helpfully in 2-3 paragraphs max.` 
            },
            ...chatMessages.slice(-6),
            userMsg
          ]
        })
      })
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, try again.'
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [chatLoading, selectedBook, aiChatCount, userEmail, chatMessages])

  const openBook = (book: Book) => {
    setSelectedBook(book)
    setHubTab('summary')
    setChatMessages([])
  }

  const updateShelf = (bookId: string, status: ShelfStatus) => {
    const updated = { ...shelf, [bookId]: status }
    setShelf(updated)
    localStorage.setItem('shelf', JSON.stringify(updated))
  }

  const updateProgress = (bookId: string, pct: number) => {
    const updated = { ...progress, [bookId]: pct }
    setProgress(updated)
    localStorage.setItem('progress', JSON.stringify(updated))
  }

  const saveNote = (bookId: string, text: string) => {
    const updated = { ...notes, [bookId]: text }
    setNotes(updated)
    localStorage.setItem('notes', JSON.stringify(updated))
  }

  // ── STYLES ────────────────────────────────
  const S = {
    app: { display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans',sans-serif", background:'#0d0d0f', color:'#f0ede8' } as const,
    sidebar: { width:'68px', background:'#13131a', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' as const, alignItems:'center', padding:'20px 0', gap:'8px', flexShrink:0 },
    logoMark: { width:'38px', height:'38px', background:'#e8a84c', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Playfair Display',serif", fontWeight:700, color:'#0d0d0f', fontSize:'18px', marginBottom:'16px', cursor:'pointer', flexShrink:0 } as const,
    navIcon: (active: boolean) => ({ width:'44px', height:'44px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color: active ? '#e8a84c' : '#5f5d6b', background: active ? 'rgba(232,168,76,0.12)' : 'transparent', transition:'all 0.15s' } as const),
    sidebarBottom: { marginTop:'auto', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:'8px' },
    avatar: { width:'36px', height:'36px', borderRadius:'50%', background:'linear-gradient(135deg,#e8a84c,#e85c7a)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:600, color:'white', cursor:'pointer' } as const,
    feedPanel: { width:'320px', background:'#13131a', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' as const, overflow:'hidden', flexShrink:0 },
    panelHeader: { padding:'20px 18px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 },
    panelTitle: { fontFamily:"'Playfair Display',serif", fontSize:'17px', fontWeight:600, color:'#f0ede8', marginBottom:'12px' },
    feedScroll: { flex:1, overflowY:'auto' as const, padding:'12px' },
    bookCard: (active: boolean) => ({ background: active ? 'rgba(232,168,76,0.06)' : '#1e1e2e', border: `1px solid ${active ? '#e8a84c' : 'rgba(255,255,255,0.07)'}`, borderRadius:'14px', padding:'14px', marginBottom:'8px', cursor:'pointer', transition:'all 0.2s', display:'flex', gap:'12px', alignItems:'flex-start' } as const),
    hubPanel: { flex:1, display:'flex', flexDirection:'column' as const, overflow:'hidden', background:'#0d0d0f' },
    chatPanel: { width:'300px', background:'#13131a', borderLeft:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column' as const, flexShrink:0 },
  }

  // ── LOGIN ─────────────────────────────────
  if (appFlow === 'login') return (
    <div style={{ position:'fixed', inset:0, background:'#0d0d0f', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ background:'#13131a', border:'1px solid rgba(232,168,76,0.3)', borderRadius:'20px', padding:'2.5rem', maxWidth:'400px', width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>📚</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.6rem', color:'#e8a84c', marginBottom:'8px' }}>House of Books</div>
        <div style={{ color:'#9896a4', fontSize:'13px', marginBottom:'2rem', lineHeight:1.6 }}>Sign in to start reading · Free during beta</div>

        <button onClick={async () => { await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } }) }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'12px 20px', width:'100%', background:'#fff', border:'1px solid #e0e0e0', borderRadius:'10px', cursor:'pointer', fontSize:'14px', color:'#1a1a1a', fontFamily:"'DM Sans',sans-serif", marginBottom:'10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <button onClick={async () => { await supabase.auth.signInWithOAuth({ provider:'twitter', options:{ redirectTo: window.location.origin } }) }}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'12px 20px', width:'100%', background:'#000', border:'1px solid #333', borderRadius:'10px', cursor:'pointer', fontSize:'14px', color:'#fff', fontFamily:"'DM Sans',sans-serif", marginBottom:'20px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Continue with X
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
          <div style={{ flex:1, height:'0.5px', background:'rgba(232,168,76,0.2)' }}/>
          <span style={{ fontSize:'11px', color:'#9896a4' }}>or email</span>
          <div style={{ flex:1, height:'0.5px', background:'rgba(232,168,76,0.2)' }}/>
        </div>

        <input type="email" placeholder="your@email.com" value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(232,168,76,0.3)', borderRadius:'10px', color:'#f0ede8', fontSize:'14px', outline:'none', marginBottom:'8px', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' as const }}
        />
        <button onClick={handleLogin}
          style={{ width:'100%', padding:'11px', background:'#e8a84c', border:'none', borderRadius:'10px', color:'#0d0d0f', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          Enter House of Books →
        </button>
        <div style={{ fontSize:'10px', color:'#5f5d6b', marginTop:'12px', lineHeight:1.5 }}>🔒 Secure · Free during beta · No spam</div>
      </div>
    </div>
  )

  // ── MAIN APP ──────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#0d0d0f;color:#f0ede8}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
        .feed-scroll{flex:1;overflow-y:auto;padding:12px}
        .hub-content{flex:1;overflow-y:auto;padding:24px}
        .chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
        .book-card-hover:hover{border-color:rgba(255,255,255,0.12)!important;background:#252538!important;transform:translateY(-1px)}
        .nav-hover:hover{background:rgba(255,255,255,0.06)!important;color:#9896a4!important}
        .hub-tab-item{padding:14px 18px;font-size:13px;font-weight:500;color:#5f5d6b;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;white-space:nowrap}
        .hub-tab-item:hover{color:#9896a4}
        .hub-tab-item.active{color:#e8a84c;border-bottom-color:#e8a84c}
        .ai-pill{background:#1e1e2e;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:6px 12px;font-size:11px;color:#9896a4;cursor:pointer;transition:all .15s;white-space:nowrap}
        .ai-pill:hover{border-color:rgba(232,168,76,0.4);color:#e8a84c}
        .btn-primary{background:#e8a84c;color:#0d0d0f;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s}
        .btn-primary:hover{opacity:.88}
        .btn-ghost{background:#252538;color:#9896a4;border:none;border-radius:8px;padding:9px 18px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif}
        .comment-input{width:100%;background:#1e1e2e;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;font-size:13px;color:#f0ede8;font-family:'DM Sans',sans-serif;outline:none;resize:none;min-height:80px}
        .comment-input:focus{border-color:#e8a84c}
        .chat-input-field{flex:1;background:transparent;border:none;outline:none;font-size:13px;color:#f0ede8;font-family:'DM Sans',sans-serif}
        .chat-input-field::placeholder{color:#5f5d6b}
        @media(max-width:768px){
          .sidebar-desktop{width:100%!important;height:56px!important;flex-direction:row!important;padding:0 16px!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,0.07)!important;justify-content:space-between!important;overflow-x:auto}
          .feed-panel-desktop{width:100%!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,0.07)!important;max-height:260px!important}
          .chat-panel-desktop{display:none!important}
          .app-main{flex-direction:column!important;overflow:hidden!important}
        }
      `}</style>

      <div style={S.app}>

        {/* ── SIDEBAR ── */}
        <div style={S.sidebar} className="sidebar-desktop">
          <div style={S.logoMark} onClick={() => setCurrentPage('library')}>H</div>

          {(['library','community'] as Page[]).map(p => (
            <div key={p} style={S.navIcon(currentPage===p)} className="nav-hover" onClick={() => setCurrentPage(p)} title={p}>
              {p === 'library'
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              }
            </div>
          ))}

          {isAdmin(userEmail) && (['agent','dashboard'] as Page[]).map(p => (
            <div key={p} style={S.navIcon(currentPage===p)} className="nav-hover" onClick={() => setCurrentPage(p)} title={p}>
              {p === 'agent'
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              }
            </div>
          ))}

          <div style={S.sidebarBottom}>
            {showInstallBtn && (
              <div style={S.navIcon(false)} className="nav-hover" title="Install App"
                onClick={() => { const p = (window as any).__pwa; if(p){p.prompt();p.userChoice.then(()=>setShowInstallBtn(false))} }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
            )}
            <div style={S.avatar} onClick={() => setShowUserMenu(v => !v)}>
              {userEmail.slice(0,2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }} className="app-main">

          {/* LIBRARY */}
          {currentPage === 'library' && <>

            {/* Feed */}
            <div style={S.feedPanel} className="feed-panel-desktop">
              <div style={S.panelHeader}>
                <div style={S.panelTitle}>Library</div>
                <input
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width:'100%', padding:'8px 12px', background:'#1a1a24', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', color:'#f0ede8', fontSize:'12px', outline:'none', fontFamily:"'DM Sans',sans-serif", marginBottom:'10px' }}
                />
                <div style={{ display:'flex', gap:'4px', background:'#1a1a24', borderRadius:'10px', padding:'3px' }}>
                  {(['all','free','shelf'] as const).map(t => (
                    <div key={t} onClick={() => setFeedTab(t)}
                      style={{ flex:1, padding:'6px 8px', borderRadius:'8px', fontSize:'12px', fontWeight:500, textAlign:'center' as const, cursor:'pointer', background: feedTab===t ? '#252538' : 'transparent', color: feedTab===t ? '#f0ede8' : '#5f5d6b', transition:'all .15s', textTransform:'capitalize' as const }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="feed-scroll">
                {filteredBooks.map((book, i) => (
                  <div key={book.id}
                    style={S.bookCard(selectedBook?.id === book.id)}
                    className="book-card-hover"
                    onClick={() => openBook(book)}
                  >
                    <div style={{ width:'44px', height:'60px', borderRadius:'6px', overflow:'hidden', flexShrink:0, background:'#252538' }}>
                      <img src={book.cover_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#f0ede8', lineHeight:1.3, marginBottom:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{book.title}</div>
                      <div style={{ fontSize:'11px', color:'#9896a4', marginBottom:'8px' }}>{book.author}</div>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' as const }}>
                        {i < 5 && <span style={{ fontSize:'10px', color:'#e8a84c' }}>🔥 Trending</span>}
                        <span style={{ fontSize:'10px', color:'#9896a4' }}>📖 {book.read_time_mins || 15}m</span>
                        <span style={{ fontSize:'10px', color:'#9896a4' }}>{book.category}</span>
                        {i < FREE_BOOKS && <span style={{ fontSize:'10px', color:'#52c98a' }}>FREE</span>}
                      </div>
                      {progress[book.id] ? (
                        <div style={{ height:'3px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', marginTop:'8px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${progress[book.id]}%`, background:'linear-gradient(90deg,#e8a84c,#4ecdc4)', borderRadius:'2px' }}/>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hub */}
            <div style={S.hubPanel}>
              {!selectedBook ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#5f5d6b' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'16px' }}>📚</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'15px' }}>Select a book to start reading</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
                  {/* Cover */}
                  <div style={{ position:'relative', padding:'24px', background:'linear-gradient(135deg,#1a1208 0%,#0d1a1a 50%,#0a0d1a 100%)', flexShrink:0 }}>
                    <div style={{ position:'absolute', inset:0, opacity:0.15, backgroundImage:'radial-gradient(circle at 20% 50%,#e8a84c 0%,transparent 50%),radial-gradient(circle at 80% 20%,#4ecdc4 0%,transparent 40%)' }}/>
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'60px', background:'linear-gradient(to bottom,transparent,#0d0d0f)' }}/>
                    <div style={{ display:'flex', gap:'20px', alignItems:'flex-end', position:'relative', zIndex:1 }}>
                      <div style={{ width:'80px', height:'110px', borderRadius:'8px', overflow:'hidden', flexShrink:0, background:'#1e1e2e', boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
                        <img src={selectedBook.cover_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:'11px', color:'#e8a84c', letterSpacing:'.1em', textTransform:'uppercase' as const, marginBottom:'6px', fontFamily:"'DM Mono',monospace" }}>{selectedBook.category}</div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:700, lineHeight:1.2, marginBottom:'4px' }}>{selectedBook.title}</div>
                        <div style={{ fontSize:'14px', color:'#9896a4', marginBottom:'12px' }}>by {selectedBook.author}</div>
                        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' as const }}>
                          <span style={{ fontSize:'12px', color:'#9896a4', fontFamily:"'DM Mono',monospace", display:'flex', alignItems:'center', gap:'5px' }}>
                            <span style={{ width:'6px', height:'6px', background:'#52c98a', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }}/>
                            {selectedBook.read_time_mins || 15} min read
                          </span>
                          <span style={{ fontSize:'12px', color:'#9896a4', fontFamily:"'DM Mono',monospace" }}>🎧 Audio coming soon</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 24px', flexShrink:0, overflowX:'auto' as const }}>
                    {(['summary','insights','discuss','chat','shelf'] as HubTab[]).map(t => (
                      <div key={t} className={`hub-tab-item ${hubTab===t?'active':''}`} onClick={() => setHubTab(t)}>
                        {t === 'chat' ? '✦ AI Chat' : t === 'insights' ? 'Key Insights' : t === 'discuss' ? 'Discussion' : t === 'shelf' ? 'My Shelf' : 'Summary'}
                      </div>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="hub-content">

                    {/* SUMMARY */}
                    {hubTab === 'summary' && (
                      <div style={{ maxWidth:'720px' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase' as const, color:'#5f5d6b', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
                          Summary <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
                        </div>
                        <p style={{ fontSize:'15px', lineHeight:1.8, color:'#9896a4', marginBottom:'20px' }}>
                          {selectedBook.summary || 'Summary coming soon for this book.'}
                        </p>
                        <div style={{ borderLeft:'3px solid #e8a84c', padding:'12px 20px', background:'rgba(232,168,76,0.06)', borderRadius:'0 10px 10px 0' }}>
                          <p style={{ fontFamily:"'Playfair Display',serif", fontStyle:'italic', fontSize:'15px', color:'#f0ede8', lineHeight:1.6 }}>
                            "The secret of getting ahead is getting started."
                          </p>
                        </div>
                      </div>
                    )}

                    {/* INSIGHTS */}
                    {hubTab === 'insights' && (
                      <div style={{ maxWidth:'720px' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase' as const, color:'#5f5d6b', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
                          Key Insights <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.07)' }}/>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px' }}>
                          {(selectedBook.key_insights
                            ? selectedBook.key_insights.split('. ').filter(s => s.trim()).slice(0,4)
                            : ['Deep understanding comes from reflection','Consistent action builds lasting change','Knowledge applied is wisdom gained','Every book holds a unique perspective']
                          ).map((ins, i) => (
                            <div key={i} style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'14px' }}>
                              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'11px', color:'#e8a84c', marginBottom:'6px' }}>0{i+1}</div>
                              <div style={{ fontSize:'13px', color:'#9896a4', lineHeight:1.5 }}>{ins.replace(/^[-•*]\s*/,'')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DISCUSSION */}
                    {hubTab === 'discuss' && (
                      <DiscussTab bookId={selectedBook.id} bookTitle={selectedBook.title} userEmail={userEmail}/>
                    )}

                    {/* AI CHAT */}
                    {hubTab === 'chat' && (
                      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 380px)', minHeight:'300px' }}>
                        <div style={{ fontSize:'11px', color:'#5f5d6b', marginBottom:'12px', fontFamily:"'DM Mono',monospace" }}>
                          {Math.max(0, FREE_AI_CHATS - aiChatCount)} free chats remaining · resets every {COOLDOWN_HOURS}h
                        </div>
                        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px', marginBottom:'16px', paddingRight:'4px' }}>
                          <div style={{ display:'flex', gap:'7px', alignItems:'flex-start' }}>
                            <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'rgba(232,168,76,0.15)', color:'#e8a84c', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>✦</div>
                            <div>
                              <div style={{ fontSize:'11px', fontWeight:600, color:'#e8a84c', marginBottom:'3px' }}>AI Book Expert</div>
                              <div style={{ fontSize:'12px', color:'#9896a4', lineHeight:1.5, background:'rgba(232,168,76,0.08)', border:'1px solid rgba(232,168,76,0.2)', padding:'7px 10px', borderRadius:'4px 10px 10px 10px' }}>
                                Hello! I've read every page of "{selectedBook.title}". Ask me anything about the ideas, themes, or how to apply its lessons.
                              </div>
                            </div>
                          </div>
                          {chatMessages.map((m, i) => (
                            <div key={i} style={{ display:'flex', gap:'7px', alignItems:'flex-start' }}>
                              <div style={{ width:'24px', height:'24px', borderRadius:'50%', background: m.role==='user' ? 'rgba(232,168,76,0.15)' : 'rgba(107,140,255,0.15)', color: m.role==='user' ? '#e8a84c' : '#6b8cff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:700, flexShrink:0 }}>
                                {m.role==='user' ? userEmail.slice(0,2).toUpperCase() : '✦'}
                              </div>
                              <div>
                                <div style={{ fontSize:'11px', fontWeight:600, color: m.role==='user' ? '#e8a84c' : '#6b8cff', marginBottom:'3px' }}>{m.role==='user'?'You':'AI Book Expert'}</div>
                                <div style={{ fontSize:'12px', color: m.role==='user' ? '#f0ede8' : '#9896a4', lineHeight:1.5, background: m.role==='user' ? '#1e1e2e' : 'rgba(107,140,255,0.08)', border: `1px solid ${m.role==='user' ? 'rgba(255,255,255,0.07)' : 'rgba(107,140,255,0.2)'}`, padding:'7px 10px', borderRadius:'4px 10px 10px 10px' }}>
                                  {m.content}
                                </div>
                              </div>
                            </div>
                          ))}
                          {chatLoading && (
                            <div style={{ display:'flex', gap:'4px', padding:'4px 0', alignItems:'center' }}>
                              {[0,0.2,0.4].map((d,i) => <div key={i} style={{ width:'5px', height:'5px', background:'#5f5d6b', borderRadius:'50%', animation:`typing 1.2s ${d}s infinite` }}/>)}
                              <span style={{ fontSize:'11px', color:'#5f5d6b', marginLeft:'4px' }}>AI is thinking...</span>
                            </div>
                          )}
                          <div ref={chatEndRef}/>
                        </div>
                        {/* Quick prompts */}
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' as const, marginBottom:'10px' }}>
                          {[`Key ideas of "${selectedBook.title.slice(0,20)}..."`, 'Who should read this?', 'Main lesson?'].map(q => (
                            <div key={q} className="ai-pill" onClick={() => sendMessage(q)}>{q}</div>
                          ))}
                        </div>
                        <div style={{ display:'flex', gap:'6px', alignItems:'center', background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'6px 10px' }}>
                          <input
                            className="chat-input-field"
                            placeholder={`Ask about "${selectedBook.title.slice(0,25)}..."`}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key==='Enter' && sendMessage(chatInput)}
                          />
                          <button onClick={() => sendMessage(chatInput)}
                            style={{ background:'#e8a84c', border:'none', borderRadius:'7px', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d0d0f" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SHELF */}
                    {hubTab === 'shelf' && (
                      <div style={{ maxWidth:'600px' }}>
                        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
                          {(['want','reading','finished'] as ShelfStatus[]).filter(s => s !== 'none').map(s => (
                            <button key={s} onClick={() => updateShelf(selectedBook.id, s)}
                              style={{ flex:1, padding:'9px 6px', background: shelf[selectedBook.id]===s ? 'rgba(232,168,76,0.12)' : '#1e1e2e', border: `1px solid ${shelf[selectedBook.id]===s ? '#e8a84c' : 'rgba(255,255,255,0.07)'}`, borderRadius:'10px', color: shelf[selectedBook.id]===s ? '#e8a84c' : '#9896a4', fontSize:'12px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                              {s==='want'?'🔖 Want':s==='reading'?'📖 Reading':'✅ Finished'}
                            </button>
                          ))}
                        </div>
                        <div style={{ marginBottom:'20px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#5f5d6b', marginBottom:'6px', fontFamily:"'DM Mono',monospace" }}>
                            <span>READING PROGRESS</span><span style={{ color:'#e8a84c' }}>{progress[selectedBook.id] || 0}%</span>
                          </div>
                          <div style={{ height:'4px', background:'rgba(255,255,255,0.07)', borderRadius:'2px', marginBottom:'8px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${progress[selectedBook.id]||0}%`, background:'linear-gradient(90deg,#e8a84c,#4ecdc4)', borderRadius:'2px' }}/>
                          </div>
                          <input type="range" min="0" max="100" value={progress[selectedBook.id]||0}
                            onChange={e => updateProgress(selectedBook.id, parseInt(e.target.value))}
                            style={{ width:'100%', accentColor:'#e8a84c' }}/>
                        </div>
                        <div style={{ fontSize:'13px', fontWeight:500, color:'#f0ede8', marginBottom:'10px' }}>My Notes</div>
                        <textarea
                          className="comment-input"
                          placeholder="Write your personal notes about this book..."
                          value={notes[selectedBook.id] || ''}
                          onChange={e => saveNote(selectedBook.id, e.target.value)}
                          rows={5}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Chat Panel */}
            <div style={S.chatPanel} className="chat-panel-desktop">
              <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'6px', height:'6px', background:'#52c98a', borderRadius:'50%', animation:'pulse 2s infinite' }}/>
                  {selectedBook ? `${selectedBook.title.slice(0,20)}... Chat` : 'Community Chat'}
                </div>
                <div style={{ fontSize:'11px', color:'#52c98a', fontFamily:"'DM Mono',monospace" }}>Live</div>
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#5f5d6b', fontSize:'13px', padding:'20px', textAlign:'center' as const }}>
                {selectedBook ? `Select ✦ AI Chat tab to chat with AI about "${selectedBook.title.slice(0,25)}..."` : 'Select a book to start chatting'}
              </div>
              <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
                {selectedBook && (
                  <div style={{ display:'flex', gap:'6px', alignItems:'center', background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'6px 10px' }}>
                    <input className="chat-input-field" placeholder="Ask AI about this book..." id="sideChat"
                      onKeyDown={e => { if(e.key==='Enter') { const inp = document.getElementById('sideChat') as HTMLInputElement; if(inp?.value){ sendMessage(inp.value); setHubTab('chat'); inp.value='' } } }}
                    />
                    <button
                      onClick={() => { const inp = document.getElementById('sideChat') as HTMLInputElement; if(inp?.value){ sendMessage(inp.value); setHubTab('chat'); inp.value='' } }}
                      style={{ background:'#e8a84c', border:'none', borderRadius:'7px', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d0d0f" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>}

          {/* COMMUNITY */}
          {currentPage === 'community' && (
            <div style={{ flex:1, padding:'24px', overflowY:'auto' as const }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', color:'#f0ede8', marginBottom:'20px' }}>Community</div>
              <CommunityPage userEmail={userEmail}/>
            </div>
          )}

          {/* AGENT */}
          {currentPage === 'agent' && isAdmin(userEmail) && (
            <div style={{ flex:1, padding:'24px', overflowY:'auto' as const }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', color:'#f0ede8', marginBottom:'20px' }}>AI Agents</div>
              <AgentPageEmbed/>
            </div>
          )}

          {/* DASHBOARD */}
          {currentPage === 'dashboard' && isAdmin(userEmail) && (
            <div style={{ flex:1, padding:'24px', overflowY:'auto' as const }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.4rem', color:'#f0ede8', marginBottom:'20px' }}>Dashboard</div>
              <DashboardEmbed/>
            </div>
          )}
        </div>

        {/* USER MENU */}
        {showUserMenu && (
          <div style={{ position:'fixed', bottom:'80px', left:'76px', background:'#13131a', border:'1px solid rgba(232,168,76,0.3)', borderRadius:'14px', padding:'1rem', width:'260px', zIndex:1000 }}>
            <div style={{ fontSize:'13px', color:'#e8a84c', marginBottom:'4px' }}>{userEmail}</div>
            <div style={{ fontSize:'11px', color:'#5f5d6b', marginBottom:'16px' }}>{isAdmin(userEmail) ? '👑 Admin' : '📚 Reader'}</div>
            <button onClick={logout}
              style={{ width:'100%', padding:'9px', background:'rgba(232,92,122,0.1)', border:'0.5px solid rgba(232,92,122,0.3)', borderRadius:'8px', color:'#e85c7a', fontSize:'12px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              🚪 Log Out
            </button>
          </div>
        )}

        {/* COOLDOWN MODAL */}
        {showCooldown && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
            onClick={e => { if(e.target===e.currentTarget) setShowCooldown(false) }}>
            <div style={{ background:'#13131a', border:'1px solid rgba(232,168,76,0.3)', borderRadius:'16px', padding:'2rem', maxWidth:'380px', width:'100%', textAlign:'center' as const, fontFamily:"'DM Sans',sans-serif" }}>
              <div style={{ fontSize:'2rem', marginBottom:'12px' }}>⏳</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.2rem', color:'#e8a84c', marginBottom:'8px' }}>AI Chat Limit Reached</div>
              <div style={{ fontSize:'13px', color:'#9896a4', lineHeight:1.6, marginBottom:'16px' }}>
                You've used your {FREE_AI_CHATS} free AI chats. Come back in {COOLDOWN_HOURS} hours for more.
              </div>
              <div style={{ fontSize:'11px', color:'#5f5d6b', marginBottom:'16px' }}>✦ Premium with unlimited AI chat coming soon</div>
              <button onClick={() => setShowCooldown(false)} className="btn-primary">Got it</button>
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}@keyframes typing{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}`}</style>
    </>
  )
}

// ── DISCUSS TAB ──────────────────────────────────────────────
function DiscussTab({ bookId, bookTitle, userEmail }: { bookId: string; bookTitle: string; userEmail: string }) {
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    supabase.from('discussions').select('*').eq('book_id', bookId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setComments(data || []))
  }, [bookId])

  const post = async () => {
    if (!text.trim()) return
    await supabase.from('discussions').insert({ book_id: bookId, book_title: bookTitle, user_email: userEmail, user_name: userEmail.split('@')[0], content: text, likes: 0 })
    setText('')
    const { data } = await supabase.from('discussions').select('*').eq('book_id', bookId).order('created_at', { ascending: false }).limit(20)
    setComments(data || [])
  }

  return (
    <div style={{ maxWidth:'720px' }}>
      <div style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', marginBottom:'20px' }}>
        <div style={{ fontSize:'11px', color:'#e8a84c', fontWeight:500, marginBottom:'8px' }}>✦ Discussion prompt</div>
        <div style={{ fontSize:'14px', color:'#f0ede8', lineHeight:1.5, marginBottom:'12px' }}>What's the one idea from "{bookTitle}" that changed how you think?</div>
      </div>
      {comments.map((c, i) => (
        <div key={i} style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(232,168,76,0.15)', color:'#e8a84c', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:600, flexShrink:0 }}>
            {(c.user_name || 'R').slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1, background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'0 12px 12px 12px', padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
              <span style={{ fontSize:'13px', fontWeight:500, color:'#e8a84c' }}>{c.user_name || 'Reader'}</span>
              <span style={{ fontSize:'11px', color:'#5f5d6b', fontFamily:"'DM Mono',monospace" }}>{timeAgo(c.created_at)}</span>
            </div>
            <div style={{ fontSize:'13px', color:'#9896a4', lineHeight:1.6 }}>{c.content}</div>
          </div>
        </div>
      ))}
      <div style={{ display:'flex', gap:'10px', marginTop:'20px', alignItems:'flex-start' }}>
        <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(232,168,76,0.15)', color:'#e8a84c', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:600, flexShrink:0 }}>
          {userEmail.slice(0,2).toUpperCase()}
        </div>
        <textarea className="comment-input" placeholder="Share your thoughts..." value={text} onChange={e => setText(e.target.value)} rows={3}/>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px' }}>
        <button className="btn-primary" onClick={post}>Post</button>
      </div>
    </div>
  )
}

// ── COMMUNITY PAGE ───────────────────────────────────────────
function CommunityPage({ userEmail }: { userEmail: string }) {
  const [discussions, setDiscussions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('discussions').select('*').order('created_at', { ascending: false }).limit(30)
      setDiscussions(data || [])
      setLoading(false)
    }
    load()
  }, [userEmail])

  if (loading) return <div style={{ color:'#9896a4', fontSize:'13px' }}>Loading discussions...</div>

  return (
    <div>
      <div style={{ marginBottom:'20px', fontSize:'13px', color:'#9896a4' }}>
        Logged in as: {userEmail}
      </div>
      {discussions.map((d, i) => (
        <div key={i} style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'16px', marginBottom:'12px' }}>
          <div style={{ fontSize:'12px', color:'#e8a84c', marginBottom:'6px' }}>{d.book_title || 'General'}</div>
          <div style={{ fontSize:'14px', color:'#f0ede8', marginBottom:'8px', lineHeight:1.5 }}>{d.content}</div>
          <div style={{ fontSize:'11px', color:'#5f5d6b', fontFamily:"'DM Mono',monospace" }}>{d.user_name || 'Reader'} · {timeAgo(d.created_at)}</div>
        </div>
      ))}
      {discussions.length === 0 && <div style={{ color:'#5f5d6b', fontSize:'13px' }}>No discussions yet. Start one from a book!</div>}
    </div>
  )
}

// ── AGENT EMBED ──────────────────────────────────────────────
function AgentPageEmbed() {
  return <iframe src="/agent-standalone.html" style={{ width:'100%', height:'calc(100vh - 100px)', border:'none', borderRadius:'12px' }} title="AI Agents"/>
}

// ── DASHBOARD EMBED ──────────────────────────────────────────
function DashboardEmbed() {
  return (
    <div style={{ color:'#9896a4', fontSize:'14px', lineHeight:1.7 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'24px' }}>
        {[['📚','Total Books','304'],['👥','Community','Active'],['🤖','AI Agents','8'],['⭐','Beta','Live']].map(([e,l,v]) => (
          <div key={l} style={{ background:'#1e1e2e', border:'1px solid rgba(255,255,255,0.07)', borderLeft:'3px solid #e8a84c', borderRadius:'12px', padding:'1rem', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:'10px', top:'8px', fontSize:'1.8rem', opacity:.08 }}>{e}</div>
            <div style={{ fontSize:'1.5rem', color:'#e8a84c', fontWeight:500 }}>{v}</div>
            <div style={{ fontSize:'11px', color:'#5f5d6b', marginTop:'3px', letterSpacing:'.06em', textTransform:'uppercase' as const }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── UTILS ─────────────────────────────────────────────────────
function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  if (hours < 24) return hours + 'h ago'
  return days + 'd ago'
}
