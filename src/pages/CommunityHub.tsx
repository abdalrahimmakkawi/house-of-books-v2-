import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import AppSidebar from '../components/hub/AppSidebar'

const supabase = createClient((globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL || '', (globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

// Types
interface HubBook {
  id: string
  title: string
  author: string
  category: string
  cover_url?: string
  summary: string
  key_insights: string[]
  read_time_mins: number
  readersNow: number
  totalReaders: string
  rating: number
  comments: number
  readingPercent: number
  color?: string
}

interface ChatMsg {
  id: string
  user: string
  initials: string
  color: string
  bg: string
  text: string
  time: string
  isAI?: boolean
}

interface Comment {
  id: string
  user: string
  initials: string
  color: string
  text: string
  time: string
  likes: number
  liked: boolean
}

// Mock data
const INITIAL_COMMENTS: Comment[] = [
  {
    id: '1',
    user: 'Sarah Chen',
    initials: 'SC',
    color: '#e8a84c',
    text: 'This book completely changed my perspective on productivity. The concept of "deep work" is revolutionary!',
    time: '2 hours ago',
    likes: 24,
    liked: false
  },
  {
    id: '2',
    user: 'Mike Johnson',
    initials: 'MJ',
    color: '#6b8cff',
    text: 'I\'ve been implementing the 2-minute rule and it\'s been a game-changer for my focus.',
    time: '5 hours ago',
    likes: 18,
    liked: true
  }
]

const INITIAL_CHAT: ChatMsg[] = [
  {
    id: '1',
    user: 'Alex Kim',
    initials: 'AK',
    color: '#52c98a',
    bg: 'rgba(82,201,138,0.1)',
    text: 'Just finished chapter 3. The framework for habit stacking is brilliant!',
    time: '10 min ago'
  },
  {
    id: '2',
    user: 'AI Guide',
    initials: '🤖',
    color: '#e8a84c',
    bg: 'rgba(232,168,76,0.1)',
    text: 'Great progress! The habit stacking technique works best when you start with keystone habits.',
    time: '8 min ago',
    isAI: true
  }
]

// Helper functions
const seededNum = (seed: string, min: number, max: number) => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return min + (hash % (max - min))
}

const formatReaders = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const parseInsights = (insights: string[]) => {
  return insights.length >= 3 ? insights.slice(0, 3) : ['Insight 1', 'Insight 2', 'Insight 3']
}

export default function CommunityHub({ userEmail = '' }: { userEmail?: string }) {
  const [books, setBooks] = useState<HubBook[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<HubBook | null>(null)
  const [activeSidebarPage, setActiveSidebarPage] = useState<'feed'|'explore'|'shelf'|'communities'|'notifications'>('feed')
  const [activeHubTab, setActiveHubTab] = useState<'summary'|'discussion'|'quotes'|'notes'|'readers'>('summary')
  const [feedTab, setFeedTab] = useState<'activity'|'trending'|'foryou'>('activity')
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS)
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>(INITIAL_CHAT)
  const [chatInput, setChatInput] = useState('')
  const [newComment, setNewComment] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [noteText, setNoteText] = useState('')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Fetch real books from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, category, cover_url, summary, key_insights, read_time_mins')
        .order('title', { ascending: true })
        .limit(50)

      if (error) { console.error('CommunityHub fetch error:', error); setLoading(false); return }

      const enriched: HubBook[] = (data || []).map(b => ({
        ...b,
        summary:        b.summary || '',
        key_insights:   b.key_insights || [],
        read_time_mins: b.read_time_mins || 15,
        readersNow:     seededNum(b.id, 80, 420),
        totalReaders:   formatReaders(seededNum(b.id, 1200, 18000)),
        rating:         Number((4.5 + seededNum(b.id, 0, 5) / 10).toFixed(1)),
        comments:       seededNum(b.id, 12, 140),
        readingPercent: seededNum(b.id, 15, 85),
        color:          ['#e8a84c', '#6b8cff', '#52c98a', '#e85c7a'][seededNum(b.id, 0, 3)]
      }))

      setBooks(enriched)
      if (enriched.length > 0) setSelectedBook(enriched[0])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, isTyping])

  const sendChat = (text?: string) => {
    const msg = (text ?? chatInput).trim()
    if (!msg || !selectedBook) return

    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      user: userEmail ? userEmail.split('@')[0] : 'You',
      initials: userEmail ? userEmail.slice(0, 2).toUpperCase() : 'ME',
      color: '#e8a84c', bg: 'rgba(232,168,76,0.15)',
      text: msg, time: 'just now',
    }
    setChatMsgs(p => [...p, userMsg])
    setChatInput('')
    setIsTyping(true)

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: msg }],
        bookTitle: selectedBook.title,
        bookCategory: selectedBook.category,
        systemPrompt: `You are an expert on "${selectedBook.title}" by ${selectedBook.author}. Answer in 2-3 sentences. Be concise and insightful.`,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setIsTyping(false)
        setChatMsgs(p => [...p, {
          id: (Date.now() + 1).toString(),
          user: 'AI Guide', initials: '🤖',
          color: '#e8a84c', bg: 'rgba(232,168,76,0.1)',
          text: data.content || 'Great question! Every habit system comes back to identity and consistency.',
          time: 'just now', isAI: true,
        }])
      })
      .catch(() => {
        setIsTyping(false)
        setChatMsgs(p => [...p, {
          id: (Date.now() + 1).toString(),
          user: 'AI Guide', initials: '🤖',
          color: '#e8a84c', bg: 'rgba(232,168,76,0.1)',
          text: 'Connection issue — try again in a moment.',
          time: 'just now', isAI: true,
        }])
      })
  }

  const addComment = () => {
    if (!newComment.trim()) return
    setComments(p => [...p, {
      id: Date.now().toString(),
      user: userEmail ? userEmail.split('@')[0] : 'You',
      initials: userEmail ? userEmail.slice(0, 2).toUpperCase() : 'ME',
      color: '#e8a84c', text: newComment.trim(),
      time: 'just now', likes: 0, liked: false,
    }])
    setNewComment('')
  }

  const toggleLike = (id: string) => {
    setComments(p => p.map(c =>
      c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
    ))
  }

  const insights = selectedBook ? parseInsights(selectedBook.key_insights) : []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --bg: #0d0d0f;
          --bg2: #13131a;
          --bg3: #1a1a24;
          --surface: #1e1e2e;
          --surface2: #252538;
          --border: rgba(255,255,255,0.07);
          --border2: rgba(255,255,255,0.12);
          --text: #f0ede8;
          --text2: #9896a4;
          --text3: #5f5d6b;
          --amber: #e8a84c;
          --amber2: #f5c97a;
          --amber-dim: rgba(232,168,76,0.12);
          --amber-glow: rgba(232,168,76,0.06);
          --teal: #4ecdc4;
          --teal-dim: rgba(78,205,196,0.1);
          --rose: #e85c7a;
          --rose-dim: rgba(232,92,122,0.1);
          --blue: #6b8cff;
          --blue-dim: rgba(107,140,255,0.1);
          --green: #52c98a;
          --green-dim: rgba(82,201,138,0.1);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ─── LAYOUT ─── */
        .app { display: flex; height: 100vh; overflow: hidden; }

        /* ─── LEFT SIDEBAR ─── */
        .sidebar {
          width: 68px;
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
          gap: 8px;
          flex-shrink: 0;
          z-index: 10;
        }

        .logo-mark {
          width: 38px; height: 38px;
          background: var(--amber);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          color: #0d0d0f;
          font-size: 18px;
          margin-bottom: 16px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .nav-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: var(--text3);
          transition: all 0.15s;
          position: relative;
        }
        .nav-icon:hover { background: var(--surface); color: var(--text2); }
        .nav-icon.active { background: var(--amber-dim); color: var(--amber); }
        .nav-icon svg { width: 20px; height: 20px; }

        .nav-dot {
          position: absolute;
          top: 8px; right: 8px;
          width: 7px; height: 7px;
          background: var(--rose);
          border-radius: 50%;
          border: 2px solid var(--bg2);
        }

        .sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 8px; }

        .avatar-sm {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--amber), var(--rose));
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; color: white;
          cursor: pointer;
        }

        /* ─── MAIN CONTENT ─── */
        .main { flex: 1; display: flex; overflow: hidden; }

        /* ─── FEED PANEL ─── */
        .feed-panel {
          width: 320px;
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }

        .panel-header {
          padding: 20px 18px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .panel-title {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 12px;
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: var(--bg3);
          border-radius: 10px;
          padding: 3px;
        }

        .tab {
          flex: 1;
          padding: 6px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          cursor: pointer;
          color: var(--text3);
          transition: all 0.15s;
        }
        .tab.active { background: var(--surface2); color: var(--text); }

        .feed-scroll { flex: 1; overflow-y: auto; padding: 12px; }
        .feed-scroll::-webkit-scrollbar { width: 3px; }
        .feed-scroll::-webkit-scrollbar-track { background: transparent; }
        .feed-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* Activity item */
        .activity-item {
          display: flex;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 4px;
        }
        .activity-item:hover { background: var(--surface); }

        .activity-avatar {
          width: 34px; height: 34px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600;
        }

        .activity-body { flex: 1; min-width: 0; }
        .activity-user { font-size: 13px; font-weight: 500; color: var(--text); }
        .activity-user span { color: var(--text2); font-weight: 400; }
        .activity-book { font-size: 12px; color: var(--amber); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .activity-time { font-size: 11px; color: var(--text3); margin-top: 3px; font-family: 'DM Mono', monospace; }

        .activity-badge {
          font-size: 10px;
          padding: 3px 7px;
          border-radius: 20px;
          font-weight: 500;
          flex-shrink: 0;
          align-self: flex-start;
          margin-top: 2px;
        }

        /* Book card in feed */
        .book-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .book-card:hover { border-color: var(--border2); background: var(--surface2); transform: translateY(-1px); }
        .book-card.active { border-color: var(--amber); background: var(--amber-glow); }

        .book-card-inner { display: flex; gap: 12px; }
        .book-thumb {
          width: 44px; height: 60px;
          border-radius: 6px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          position: relative;
          overflow: hidden;
        }
        .book-thumb::after {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: rgba(0,0,0,0.3);
        }

        .book-info { flex: 1; min-width: 0; }
        .book-title { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.3; margin-bottom: 2px; }
        .book-author { font-size: 11px; color: var(--text2); margin-bottom: 8px; }

        .book-stats { display: flex; gap: 10px; flex-wrap: wrap; }
        .stat-pill {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--text2);
        }
        .stat-pill svg { width: 12px; height: 12px; }
        .stat-pill.hot { color: var(--amber); }

        .reading-bar {
          height: 3px;
          background: var(--border);
          border-radius: 2px;
          margin-top: 10px;
          overflow: hidden;
        }
        .reading-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--amber), var(--teal));
          border-radius: 2px;
          transition: width 0.5s;
        }

        /* ─── BOOK HUB (CENTER) ─── */
        .hub-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
        }

        .hub-header {
          padding: 0;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .hub-cover {
          height: 200px;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 24px;
        }

        .hub-cover-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #1a0f0a 0%, #0d1a1a 50%, #0a0d1a 100%);
        }

        .hub-cover-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.15;
          background-image: radial-gradient(circle at 20% 50%, var(--amber) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, var(--teal) 0%, transparent 40%);
        }

        .hub-cover-fade {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 80px;
          background: linear-gradient(to bottom, transparent, var(--bg));
        }

        .hub-book-icon {
          width: 80px; height: 110px;
          border-radius: 8px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 42px;
          position: relative;
          z-index: 1;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          margin-right: 20px;
        }

        .hub-book-meta { position: relative; z-index: 1; }
        .hub-book-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
        }
        .hub-book-author { font-size: 14px; color: var(--text2); margin-bottom: 12px; }

        .hub-live-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .live-stat {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text2);
          font-family: 'DM Mono', monospace;
        }
        .live-dot {
          width: 6px; height: 6px;
          background: var(--green);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        /* Hub navigation tabs */
        .hub-nav {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          flex-shrink: 0;
        }

        .hub-tab {
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text3);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .hub-tab:hover { color: var(--text2); }
        .hub-tab.active { color: var(--amber); border-bottom-color: var(--amber); }
        .hub-tab-badge {
          background: var(--amber-dim);
          color: var(--amber);
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 10px;
          font-family: 'DM Mono', monospace;
        }

        /* Hub content */
        .hub-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .hub-content::-webkit-scrollbar { width: 3px; }
        .hub-content::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        /* Summary section */
        .summary-section { max-width: 720px; }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .key-insights {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }

        .insight-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          transition: all 0.2s;
        }
        .insight-card:hover { border-color: var(--border2); }
        .insight-num {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: var(--amber);
          margin-bottom: 6px;
        }
        .insight-text { font-size: 13px; color: var(--text2); line-height: 1.5; }

        .summary-text {
          font-size: 15px;
          line-height: 1.8;
          color: var(--text2);
          margin-bottom: 20px;
        }
        .summary-text strong { color: var(--text); }

        .quote-block {
          border-left: 3px solid var(--amber);
          padding: 12px 20px;
          margin: 20px 0;
          background: var(--amber-glow);
          border-radius: 0 10px 10px 0;
        }
        .quote-block p {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 15px;
          color: var(--text);
          line-height: 1.6;
        }

        /* Discussion section */
        .discussion-section { max-width: 720px; }

        .discussion-prompt {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .prompt-label { font-size: 11px; color: var(--amber); font-weight: 500; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
        .prompt-text { font-size: 14px; color: var(--text); line-height: 1.5; margin-bottom: 12px; }
        .prompt-actions { display: flex; gap: 8px; }

        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary { background: var(--amber); color: #0d0d0f; }
        .btn-primary:hover { background: var(--amber2); }
        .btn-ghost { background: var(--surface2); color: var(--text2); }
        .btn-ghost:hover { color: var(--text); background: var(--bg3); }

        .comment {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .comment-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 600;
        }

        .comment-body {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0 12px 12px 12px;
          padding: 12px 14px;
        }

        .comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .comment-name { font-size: 13px; font-weight: 500; }
        .comment-time { font-size: 11px; color: var(--text3); font-family: 'DM Mono', monospace; }
        .comment-text { font-size: 13px; color: var(--text2); line-height: 1.6; }
        .comment-reactions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .reaction {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 3px 8px;
          font-size: 12px;
          cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          color: var(--text2);
          transition: all 0.15s;
        }
        .reaction:hover { border-color: var(--amber); color: var(--amber); }
        .reaction.active { background: var(--amber-dim); border-color: var(--amber); color: var(--amber); }

        /* Comment input */
        .comment-input-area {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          align-items: flex-start;
        }

        .comment-input {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          outline: none;
          resize: none;
          transition: border-color 0.15s;
          min-height: 80px;
        }
        .comment-input:focus { border-color: var(--amber); }
        .comment-input::placeholder { color: var(--text3); }

        /* ─── RIGHT PANEL (Chat) ─── */
        .chat-panel {
          width: 300px;
          background: var(--bg2);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .chat-header {
          padding: 16px 16px 14px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .chat-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .online-count {
          font-size: 11px;
          color: var(--green);
          font-family: 'DM Mono', monospace;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Readers bar */
        .readers-bar {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .reader-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 3px 8px 3px 4px;
          font-size: 11px;
          color: var(--text2);
        }
        .reader-chip-dot { width: 5px; height: 5px; background: var(--green); border-radius: 50%; }

        /* Chat messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chat-messages::-webkit-scrollbar { width: 3px; }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

        .chat-msg {
          display: flex;
          gap: 7px;
          align-items: flex-start;
        }

        .chat-msg-avatar {
          width: 24px; height: 24px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700;
        }

        .chat-msg-content { flex: 1; }
        .chat-msg-name { font-size: 11px; font-weight: 600; margin-bottom: 3px; }
        .chat-msg-text {
          font-size: 12px;
          color: var(--text2);
          line-height: 1.5;
          background: var(--surface);
          padding: 7px 10px;
          border-radius: 4px 10px 10px 10px;
        }

        .chat-msg.ai .chat-msg-text {
          background: var(--amber-dim);
          border: 1px solid rgba(232,168,76,0.2);
          color: var(--text);
        }

        .chat-msg-time { font-size: 10px; color: var(--text3); margin-top: 3px; font-family: 'DM Mono', monospace; }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 0;
        }
        .typing-dot {
          width: 5px; height: 5px;
          background: var(--text3);
          border-radius: 50%;
          animation: typing 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }

        /* Chat input */
        .chat-input-area {
          padding: 10px 12px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .chat-input-row {
          display: flex;
          gap: 6px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 6px 10px;
          transition: border-color 0.15s;
        }
        .chat-input-row:focus-within { border-color: var(--amber); }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 12px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
        }
        .chat-input::placeholder { color: var(--text3); }

        .chat-send-btn {
          width: 26px; height: 26px;
          background: var(--amber);
          border: none;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .chat-send-btn:hover { background: var(--amber2); }
        .chat-send-btn svg { width: 13px; height: 13px; color: #0d0d0f; }

        /* AI Ask section in chat */
        .ai-section {
          padding: 10px 12px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .ai-section-label {
          font-size: 10px;
          color: var(--amber);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ai-prompt-pills {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .ai-pill {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 11px;
          color: var(--text2);
          cursor: pointer;
          transition: all 0.15s;
        }
        .ai-pill:hover { border-color: var(--amber); color: var(--amber); background: var(--amber-dim); }

        /* ─── STREAKS WIDGET ─── */
        .streak-widget {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          margin: 12px;
          flex-shrink: 0;
        }
        .streak-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .streak-label { font-size: 11px; color: var(--text3); }
        .streak-count { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--amber); font-weight: 500; }
        .streak-days { display: flex; gap: 4px; }
        .streak-day {
          width: 22px; height: 22px;
          border-radius: 5px;
          font-size: 9px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text3);
          background: var(--bg3);
          font-weight: 500;
        }
        .streak-day.done { background: var(--amber-dim); color: var(--amber); border: 1px solid var(--amber); }
        .streak-day.today { background: var(--amber); color: #0d0d0f; }

        /* Divider */
        .divider { height: 1px; background: var(--border); margin: 16px 0; }

        /* Scroll animation */
        .fade-up {
          opacity: 0;
          transform: translateY(12px);
          animation: fadeUp 0.4s ease forwards;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive note */
        @media (max-width: 1200px) {
          .chat-panel { display: none; }
        }
        @media (max-width: 900px) {
          .feed-panel { display: none; }
        }

        /* Section transition */
        .hub-section { display: none; }
        .hub-section.active { display: block; }
      `}</style>
      <div className="app">
        <AppSidebar userEmail={userEmail} activePage={activeSidebarPage} onNavigate={setActiveSidebarPage} />
        <div className="main">
          <div className="feed-panel">
            <div className="panel-header">
              <div className="panel-title">Community Feed</div>
              <div className="tabs">
                <button className={`tab${feedTab === 'activity' ? ' active' : ''}`} onClick={() => setFeedTab('activity')}>Activity</button>
                <button className={`tab${feedTab === 'trending' ? ' active' : ''}`} onClick={() => setFeedTab('trending')}>Trending</button>
                <button className={`tab${feedTab === 'foryou' ? ' active' : ''}`} onClick={() => setFeedTab('foryou')}>For You</button>
              </div>
            </div>
            <div className="feed-scroll">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Loading...</div>
              ) : (
                books.map(book => (
                  <div key={book.id} className={`book-card${selectedBook?.id === book.id ? ' active' : ''}`} onClick={() => setSelectedBook(book)}>
                    <div className="book-card-inner">
                      <div className="book-thumb" style={{ background: `linear-gradient(135deg, ${book.color || '#e8a84c'}, ${book.color ? book.color + '88' : '#e8a84c88'})` }}>
                        📚
                      </div>
                      <div className="book-info">
                        <div className="book-title">{book.title}</div>
                        <div className="book-author">{book.author}</div>
                        <div className="book-stats">
                          <div className="stat-pill">
                            <span>⭐</span>
                            <span>{book.rating}</span>
                          </div>
                          <div className="stat-pill hot">
                            <span>🔥</span>
                            <span>{book.readersNow}</span>
                          </div>
                          <div className="stat-pill">
                            <span>📖</span>
                            <span>{book.totalReaders}</span>
                          </div>
                        </div>
                        <div className="reading-bar">
                          <div className="reading-fill" style={{ width: `${book.readingPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="hub-panel">
            {selectedBook && (
              <>
                <div className="hub-header">
                  <div className="hub-cover">
                    <div className="hub-cover-bg" />
                    <div className="hub-cover-pattern" />
                    <div className="hub-cover-fade" />
                    <div className="hub-book-icon" style={{ background: `linear-gradient(135deg, ${selectedBook.color || '#e8a84c'}, ${selectedBook.color ? selectedBook.color + '88' : '#e8a84c88'})` }}>
                      📚
                    </div>
                    <div className="hub-book-meta">
                      <div className="hub-book-title">{selectedBook.title}</div>
                      <div className="hub-book-author">{selectedBook.author}</div>
                      <div className="hub-live-stats">
                        <div className="live-stat">
                          <div className="live-dot" />
                          <span>{selectedBook.readersNow} reading now</span>
                        </div>
                        <div className="live-stat">
                          <span>⭐ {selectedBook.rating}</span>
                        </div>
                        <div className="live-stat">
                          <span>💬 {selectedBook.comments}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hub-nav">
                  {[
                    { id: 'summary', label: 'Summary' },
                    { id: 'discussion', label: 'Discussion', badge: selectedBook.comments },
                    { id: 'quotes', label: 'Quotes' },
                    { id: 'notes', label: 'Notes' },
                    { id: 'readers', label: 'Readers' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      className={`hub-tab${activeHubTab === tab.id ? ' active' : ''}`}
                      onClick={() => setActiveHubTab(tab.id as any)}
                    >
                      {tab.label}
                      {tab.badge && <span className="hub-tab-badge">{tab.badge}</span>}
                    </button>
                  ))}
                </div>

                <div className="hub-content">
                  {activeHubTab === 'summary' && (
                    <div className="summary-section hub-section active">
                      <div className="section-label">Key Insights</div>
                      <div className="key-insights">
                        {insights.map((insight, i) => (
                          <div key={i} className="insight-card">
                            <div className="insight-num">#{i + 1}</div>
                            <div className="insight-text">{insight}</div>
                          </div>
                        ))}
                      </div>
                      <div className="section-label">Summary</div>
                      <div className="summary-text">
                        {selectedBook.summary}
                      </div>
                      <div className="quote-block">
                        <p>"{selectedBook.key_insights[0] || 'A great book that changes perspectives.'}"</p>
                      </div>
                    </div>
                  )}

                  {activeHubTab === 'discussion' && (
                    <div className="discussion-section hub-section active">
                      <div className="discussion-prompt">
                        <div className="prompt-label">💬 Discussion Prompt</div>
                        <div className="prompt-text">What was your biggest takeaway from this book?</div>
                        <div className="prompt-actions">
                          <button className="btn btn-primary">Share Your Thoughts</button>
                          <button className="btn btn-ghost">Skip</button>
                        </div>
                      </div>

                      <div className="comment-input-area">
                        <div className="comment-avatar" style={{ background: '#e8a84c', color: 'white' }}>
                          {userEmail ? userEmail.slice(0, 2).toUpperCase() : 'ME'}
                        </div>
                        <textarea
                          className="comment-input"
                          placeholder="Share your thoughts..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={addComment}>Post</button>
                      </div>

                      {comments.map(comment => (
                        <div key={comment.id} className="comment">
                          <div className="comment-avatar" style={{ background: comment.color, color: 'white' }}>
                            {comment.initials}
                          </div>
                          <div className="comment-body">
                            <div className="comment-header">
                              <span className="comment-name">{comment.user}</span>
                              <span className="comment-time">{comment.time}</span>
                            </div>
                            <div className="comment-text">{comment.text}</div>
                            <div className="comment-reactions">
                              <button
                                className={`reaction${comment.liked ? ' active' : ''}`}
                                onClick={() => toggleLike(comment.id)}
                              >
                                <span>❤️</span>
                                <span>{comment.likes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeHubTab === 'quotes' && (
                    <div className="summary-section hub-section active">
                      <div className="section-label">Memorable Quotes</div>
                      <div className="quote-block">
                        <p>"{selectedBook.key_insights[1] || 'The only way to do great work is to love what you do.'}"</p>
                      </div>
                      <div className="quote-block">
                        <p>"{selectedBook.key_insights[2] || 'Success is not final, failure is not fatal: it is the courage to continue that counts.'}"</p>
                      </div>
                    </div>
                  )}

                  {activeHubTab === 'notes' && (
                    <div className="summary-section hub-section active">
                      <div className="section-label">Your Notes</div>
                      <textarea
                        className="comment-input"
                        style={{ minHeight: '200px' }}
                        placeholder="Write your notes here..."
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                      />
                    </div>
                  )}

                  {activeHubTab === 'readers' && (
                    <div className="summary-section hub-section active">
                      <div className="section-label">Active Readers ({selectedBook.readersNow})</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                        {Array.from({ length: Math.min(8, selectedBook.readersNow) }, (_, i) => (
                          <div key={i} style={{ 
                            background: 'var(--surface)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '12px', 
                            padding: '14px', 
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}>
                            <div style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '50%', 
                              background: '#52c98a', 
                              color: 'white', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              margin: '0 auto 8px',
                              fontWeight: '600'
                            }}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Reader {i + 1}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>Reading chapter {Math.floor(Math.random() * 10) + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="chat-panel">
            <div className="chat-header">
              <div className="chat-title">
                <span>💬</span>
                <span>Book Chat</span>
              </div>
              <div className="online-count">
                <div className="reader-chip-dot" />
                <span>{selectedBook?.readersNow || 0} online</span>
              </div>
            </div>

            <div className="readers-bar">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="reader-chip">
                  <div className="reader-chip-dot" />
                  <span>Reader {i + 1}</span>
                </div>
              ))}
            </div>

            <div className="chat-messages">
              {chatMsgs.map(msg => (
                <div key={msg.id} className={`chat-msg${msg.isAI ? ' ai' : ''}`}>
                  <div className="chat-msg-avatar" style={{ background: msg.color, color: 'white' }}>
                    {msg.initials}
                  </div>
                  <div className="chat-msg-content">
                    <div className="chat-msg-name">{msg.user}</div>
                    <div className="chat-msg-text">{msg.text}</div>
                    <div className="chat-msg-time">{msg.time}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="ai-section">
              <div className="ai-section-label">🤖 AI Quick Questions</div>
              <div className="ai-prompt-pills">
                <button className="ai-pill" onClick={() => sendChat("What's the main theme?")}>Main theme?</button>
                <button className="ai-pill" onClick={() => sendChat("Who should read this?")}>Who should read?</button>
                <button className="ai-pill" onClick={() => sendChat("Key takeaways?")}>Key takeaways?</button>
              </div>
            </div>

            <div className="chat-input-area">
              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendChat()}
                />
                <button className="chat-send-btn" onClick={() => sendChat()}>
                  <span>➤</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
