import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Book as BookIcon, 
  Search, 
  Library, 
  Bookmark, 
  MessageSquare, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Clock, 
  Globe, 
  Send, 
  User, 
  Menu, 
  X,
  Sparkles,
  Info,
  Lightbulb,
  MessageCircle,
  Plus,
  Trash2,
  Download,
  Home,
  Compass,
  Bell,
  ArrowRight,
  Quote,
  Palette,
  Music,
  Volume2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  LayoutDashboard,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './lib/supabase';
import { Book, Discussion, UserProfile, ReadingProgress } from './types';
import { formatDistanceToNow, isAfter, addHours } from 'date-fns';
import { LandingPage } from './components/LandingPage';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Supabase Configuration
const SUPABASE_URL = 'https://ulxzyjqmvzyqjynmqywe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI';
const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

const ADMIN_EMAIL = 'abdalrahimmakkawi@gmail.com';
const CHAT_LIMIT = 10;
const COOLDOWN_HOURS = 6;

const THEMES = {
  gold: { name: 'Royal Gold', accent: '#c9a84c', bg: '#0a0a0f', surface: '#13121a', card: '#1a1928' },
  emerald: { name: 'Emerald', accent: '#4ade80', bg: '#06100a', surface: '#0d1a12', card: '#15261b' },
  rose: { name: 'Rose', accent: '#fb7185', bg: '#10060a', surface: '#1a0d12', card: '#26151b' },
  azure: { name: 'Azure', accent: '#60a5fa', bg: '#060a10', surface: '#0d121a', card: '#151b26' },
  violet: { name: 'Violet', accent: '#a78bfa', bg: '#0a0610', surface: '#120d1a', card: '#1b1526' },
  amber: { name: 'Amber', accent: '#f59e0b', bg: '#0f0a06', surface: '#1a120d', card: '#261b15' },
};

const MUSIC_TRACKS = [
  { id: 'library', name: 'Grand Library', icon: '📚', url: '/music/library.mp3' },
  { id: 'beach', name: 'Coastal Breeze', icon: '🏖️', url: '/music/beach.mp3' },
  { id: 'forest', name: 'Ancient Forest', icon: '🌲', url: '/music/forest.mp3' },
  { id: 'rain', name: 'Midnight Rain', icon: '🌧️', url: '/music/rain.mp3' },
  { id: 'cosmos', name: 'Cosmic Void', icon: '🌌', url: '/music/cosmos.mp3' },
];

const AI_AGENTS = [
  { id: 'growth', name: 'Growth Advisor', icon: '🚀', desc: '90-day scaling strategy & viral loops', color: '#c9a84c' },
  { id: 'revenue', name: 'Revenue Analyst', icon: '💰', desc: 'MRR optimization & churn reduction', color: '#4ade80' },
  { id: 'copy', name: 'Marketing Copywriter', icon: '📢', desc: 'High-converting landing pages & ads', color: '#fb7185' },
  { id: 'price', name: 'Pricing Strategist', icon: '🏷️', desc: 'Value-based pricing & tier modeling', color: '#60a5fa' },
  { id: 'product', name: 'Product Strategist', icon: '⚙️', desc: 'Roadmap prioritization & feature fit', color: '#a78bfa' },
  { id: 'retention', name: 'Retention Expert', icon: '🔄', desc: 'LTV maximization & user engagement', color: '#f59e0b' },
  { id: 'ops', name: 'Ops Automator', icon: '⚡', desc: 'Workflow efficiency & AI integration', color: '#2dd4bf' },
  { id: 'brand', name: 'Brand Architect', icon: '🎨', desc: 'Visual identity & market positioning', color: '#e879f9' },
];

export default function App() {
  const APP_VERSION = '2.0';

  useEffect(() => {
    const savedVersion = localStorage.getItem('hob_version');
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem('hob_version', APP_VERSION);
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(reg => reg.unregister());
        }).then(() => window.location.reload());
      }
    }
  }, []);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'discussion' | 'chat' | 'shelf'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [showCooldown, setShowCooldown] = useState(false);
  const [cooldownMins, setCooldownMins] = useState(0);
  const [currentPage, setCurrentPage] = useState<'library' | 'library-grid' | 'agents' | 'dashboard' | 'community'>('library');
  const [feedTab, setFeedTab] = useState<'all' | 'shelf' | 'free'>('all');
  
  const [theme, setTheme] = useState<keyof typeof THEMES>(() => {
    const saved = localStorage.getItem('hob_theme_v2');
    return (saved as keyof typeof THEMES) || 'gold';
  });
  
  const [musicTrack, setMusicTrack] = useState<string>(MUSIC_TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTheme = THEMES[theme];

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'dynamic-theme-v2';
    style.innerHTML = `
      :root {
        --color-accent: ${currentTheme.accent};
        --color-bg: ${currentTheme.bg};
        --color-surface: ${currentTheme.surface};
        --color-card: ${currentTheme.card};
        --color-border: rgba(201, 168, 76, 0.1);
        --color-text-muted: #9896a4;
      }
      body {
        background-color: ${currentTheme.bg} !important;
        color: #e2e8f0 !important;
      }
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(201, 168, 76, 0.2); border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(201, 168, 76, 0.4); }
    `;
    const existing = document.getElementById('dynamic-theme-v2');
    if (existing) existing.remove();
    document.head.appendChild(style);
    localStorage.setItem('hob_theme_v2', theme);
  }, [theme, currentTheme]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
    const track = MUSIC_TRACKS.find(t => t.id === musicTrack);
    if (track) {
      audioRef.current.src = track.url;
      if (isPlaying) audioRef.current.play().catch(e => console.error('Audio play error:', e));
    }
  }, [musicTrack]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(e => console.error('Audio play error:', e));
      else audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatting]);

  useEffect(() => {
    // Auth & Data Fetching
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          isAdmin: session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
          chatCount: 0,
          lastChatReset: new Date().toISOString()
        });
      }

      const savedUser = localStorage.getItem('hob_user');
      if (savedUser) setUser(JSON.parse(savedUser));
      
      const savedProgress = localStorage.getItem('hob_progress');
      if (savedProgress) setReadingProgress(JSON.parse(savedProgress));

      fetchBooks();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          isAdmin: session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
          chatCount: 0,
          lastChatReset: new Date().toISOString()
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('hob_user', JSON.stringify(user));
    else localStorage.removeItem('hob_user');
  }, [user]);

  useEffect(() => {
    if (Object.keys(readingProgress).length > 0) {
      localStorage.setItem('hob_progress', JSON.stringify(readingProgress));
    }
  }, [readingProgress]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/books?select=*&order=created_at.asc&apikey=${SUPABASE_KEY}`,
        { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setBooks(data);
        if (data.length > 0 && !selectedBook) {
          setSelectedBook(data[0]);
          fetchDiscussions(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('fetchBooks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussions = async (bookId: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/discussions?book_id=eq.${bookId}&select=*&order=created_at.asc&apikey=${SUPABASE_KEY}`,
        { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const data = await response.json();
      setDiscussions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('fetchDiscussions error:', err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin, skipBrowserRedirect: true }
      });
      if (error) throw error;
      if (data?.url) {
        const popup = window.open(data.url, 'google_login', 'width=600,height=700');
        if (!popup) alert('Popup blocked! Please allow popups.');
      }
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    setSelectedBook(null);
    localStorage.removeItem('hob_user');
  };

  const filteredBooks = useMemo(() => {
    let list = books.filter(book => 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (feedTab === 'shelf') {
      list = list.filter(b => readingProgress[b.id]?.isShelf);
    } else if (feedTab === 'free') {
      list = list.filter(b => b.read_time_mins < 15); // Mock free filter
    }
    return list;
  }, [books, searchQuery, feedTab, readingProgress]);

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setActiveTab('summary');
    fetchDiscussions(book.id);
    setChatMessages([]);
  };

  const handleAddComment = async () => {
    if (!newComment || !selectedBook || !user) return;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/discussions?apikey=${SUPABASE_KEY}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ book_id: selectedBook.id, user_email: user.email, content: newComment })
        }
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setDiscussions(prev => [...prev, data[0]]);
        setNewComment('');
      }
    } catch (err: any) {
      console.error('handleAddComment error:', err);
    }
  };

  const handleChat = async (input?: string) => {
    const finalInput = input || chatInput;
    if (!finalInput || !selectedBook || !user || isChatting) return;

    if (!user.isAdmin) {
      const now = new Date();
      const lastReset = new Date(user.lastChatReset);
      const cooldownEnd = addHours(lastReset, COOLDOWN_HOURS);
      if (user.chatCount >= CHAT_LIMIT && !isAfter(now, cooldownEnd)) {
        setCooldownMins(Math.ceil((cooldownEnd.getTime() - now.getTime()) / 60000));
        setShowCooldown(true);
        return;
      }
      if (isAfter(now, cooldownEnd)) {
        setUser({ ...user, chatCount: 0, lastChatReset: now.toISOString() });
      }
    }

    const newMessage = { role: 'user' as const, content: finalInput };
    setChatMessages(prev => [...prev, newMessage]);
    if (!input) setChatInput('');
    setIsChatting(true);

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sk-0a2bd43938e740e885070afa5c62d8ea` 
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: `You are an expert literary assistant for "${selectedBook.title}" by ${selectedBook.author}.` },
            ...chatMessages,
            newMessage
          ]
        })
      });
      const data = await response.json();
      const assistantMessage = { role: 'assistant' as const, content: data.choices[0].message.content };
      setChatMessages(prev => [...prev, assistantMessage]);
      if (!user.isAdmin) setUser(prev => prev ? { ...prev, chatCount: prev.chatCount + 1 } : null);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'AI error. Please try again.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const toggleShelf = (bookId: string) => {
    setReadingProgress(prev => {
      const current = prev[bookId] || { bookId, progress: 0, notes: '', isShelf: false };
      return { ...prev, [bookId]: { ...current, isShelf: !current.isShelf } };
    });
  };

  if (!user) {
    return (
      <LandingPage 
        onLogin={(email) => setUser({ email, isAdmin: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(), chatCount: 0, lastChatReset: new Date().toISOString() })}
        onGoogleLogin={handleGoogleLogin}
        onMagicLink={() => alert('Check email!')}
        onGuestLogin={() => setUser({ email: 'guest@example.com', isAdmin: false, chatCount: 0, lastChatReset: new Date().toISOString() })}
        onManualToken={() => {
          const token = prompt('Paste your token here:');
          if (token) {
            const hash = token.includes('#') ? token.split('#')[1] : token;
            window.location.hash = hash;
            window.location.reload();
          }
        }}
        onClearSession={async () => {
          await supabase.auth.signOut();
          localStorage.removeItem('hob_user');
          setUser(null);
          window.location.hash = '';
          alert('Session cleared.');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen text-white overflow-hidden font-sans" style={{ background: currentTheme.bg }}>
      {/* 1. LEFT SIDEBAR (64px) */}
      <aside className="w-16 border-r border-[rgba(201,168,76,0.1)] flex flex-col items-center py-6 shrink-0 z-20" style={{ background: currentTheme.surface }}>
        <div className="w-10 h-10 bg-[#c9a84c] rounded-xl flex items-center justify-center font-serif font-black text-[#0a0a0f] text-xl mb-8 cursor-pointer shadow-[0_0_20px_rgba(201,168,76,0.3)]">
          H
        </div>

        <div className="flex flex-col gap-4">
          <SidebarIcon icon={<Home />} active={currentPage === 'library'} onClick={() => setCurrentPage('library')} />
          <SidebarIcon icon={<Library />} active={currentPage === 'library-grid'} onClick={() => setCurrentPage('library-grid')} />
          <SidebarIcon icon={<Compass />} active={currentPage === 'library-grid'} onClick={() => setCurrentPage('library-grid')} />
          <SidebarIcon icon={<MessageSquare />} active={currentPage === 'community'} onClick={() => setCurrentPage('community')} />
        </div>

        <div className="mt-auto flex flex-col gap-4 items-center">
          <div className="relative">
            <SidebarIcon icon={<Music />} active={showMusicSelector} onClick={() => setShowMusicSelector(!showMusicSelector)} />
            {showMusicSelector && (
              <div className="absolute left-14 bottom-0 w-48 bg-[#1a1928] border border-[rgba(201,168,76,0.1)] rounded-xl shadow-2xl p-3 z-50">
                <div className="text-[10px] text-[#c9a84c] font-bold uppercase tracking-widest mb-3">Ambient Tracks</div>
                <div className="space-y-1">
                  {MUSIC_TRACKS.map(track => (
                    <button 
                      key={track.id}
                      onClick={() => { setMusicTrack(track.id); setIsPlaying(true); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all",
                        musicTrack === track.id ? "bg-[#c9a84c]/10 text-[#c9a84c]" : "text-[#9896a4] hover:bg-white/5"
                      )}
                    >
                      <span>{track.icon}</span>
                      <span>{track.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <SidebarIcon icon={<Palette />} active={false} onClick={() => {}} />
          {user.isAdmin && (
            <>
              <SidebarIcon icon={<Bot />} active={currentPage === 'agents'} onClick={() => setCurrentPage('agents')} />
              <SidebarIcon icon={<LayoutDashboard />} active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
            </>
          )}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#e8a84c] flex items-center justify-center text-[13px] font-bold text-[#0a0a0f] cursor-pointer" onClick={handleLogout}>
            {user.email.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </aside>

      {/* 2. FEED PANEL (280px) */}
      <aside className="w-[280px] border-r border-[rgba(201,168,76,0.1)] flex flex-col shrink-0" style={{ background: currentTheme.surface }}>
        <div className="p-6 pb-4">
          <h2 className="font-serif text-xl font-bold text-white mb-4">Reading Feed</h2>
          <div className="flex gap-1 bg-[#1a1928] rounded-lg p-1 mb-6">
            <FeedTab label="All" active={feedTab === 'all'} onClick={() => setFeedTab('all')} />
            <FeedTab label="Shelf" active={feedTab === 'shelf'} onClick={() => setFeedTab('shelf')} />
            <FeedTab label="Free" active={feedTab === 'free'} onClick={() => setFeedTab('free')} />
          </div>

          {/* Streak Widget */}
          <div className="bg-gradient-to-br from-[#c9a84c]/20 to-transparent border border-[#c9a84c]/20 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[#9896a4] font-medium uppercase tracking-wider">7-Day Streak</span>
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
            </div>
            <div className="flex justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold",
                  i < 6 ? "bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20" : "bg-[#c9a84c] text-[#0a0a0f]"
                )}>{d}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            filteredBooks.map(book => (
              <CompactBookCard 
                key={book.id} 
                book={book} 
                active={selectedBook?.id === book.id} 
                onClick={() => handleBookClick(book)} 
                progress={readingProgress[book.id]?.progress || 0}
              />
            ))
          )}
        </div>
      </aside>

      {/* 3. HUB PANEL (flex: 1) */}
      <main className="flex-1 flex flex-col relative overflow-hidden" style={{ background: currentTheme.bg }}>
        {currentPage === 'agents' ? (
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <h2 className="text-3xl font-serif font-bold mb-8">AI Business Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {AI_AGENTS.map(agent => (
                <div key={agent.id} className="bg-[#1a1928] border border-[rgba(201,168,76,0.1)] p-6 rounded-2xl hover:border-[#c9a84c]/40 transition-all group cursor-pointer">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{agent.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{agent.name}</h3>
                  <p className="text-sm text-[#9896a4] leading-relaxed">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : currentPage === 'dashboard' ? (
          <div className="flex-1 p-10">
            <h2 className="text-3xl font-serif font-bold mb-8">Admin Dashboard</h2>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Total Books', val: books.length, icon: <BookIcon /> },
                { label: 'Active Readers', val: '1,242', icon: <User /> },
                { label: 'AI Requests', val: '8.4k', icon: <Sparkles /> },
                { label: 'Revenue', val: '$12.4k', icon: <Globe /> },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1928] border border-[rgba(201,168,76,0.1)] p-6 rounded-2xl">
                  <div className="text-[#c9a84c] mb-4">{s.icon}</div>
                  <div className="text-2xl font-bold mb-1">{s.val}</div>
                  <div className="text-[10px] text-[#9896a4] uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : currentPage === 'community' ? (
          <CommunityPage userEmail={user.email} />
        ) : currentPage === 'library-grid' ? (
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-serif font-bold">Digital Library</h2>
              <div className="flex items-center gap-3 bg-[#13121a] border border-[rgba(201,168,76,0.1)] rounded-xl px-4 py-2 w-64">
                <Search className="w-4 h-4 text-[#9896a4]" />
                <input type="text" placeholder="Search books..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {filteredBooks.map(book => (
                <div key={book.id} onClick={() => { handleBookClick(book); setCurrentPage('library'); }} className="group cursor-pointer">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl mb-4 relative border border-white/5">
                    <img src={book.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="px-4 py-2 bg-[#c9a84c] text-[#0a0a0f] font-bold text-xs rounded-lg">View Details</button>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm truncate group-hover:text-[#c9a84c] transition-colors">{book.title}</h3>
                  <p className="text-xs text-[#9896a4] truncate">{book.author}</p>
                </div>
              ))}
            </div>
          </div>
        ) : selectedBook ? (
          <>
            {/* Hero Section */}
            <div className="relative h-64 shrink-0 flex items-end p-10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2a1b12] via-[#0a0a0f] to-[#0f1a1a]" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,#c9a84c_0%,transparent_50%)]" />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
              
              <div className="relative z-10 flex gap-8 items-end">
                <div className="w-32 h-48 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 shrink-0">
                  <img src={selectedBook?.cover_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="mb-2">
                  <h1 className="font-serif text-4xl font-bold mb-2 text-white">{selectedBook?.title}</h1>
                  <p className="text-[#9896a4] text-lg mb-4">{selectedBook?.author} · {selectedBook?.category}</p>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#9896a4]">
                      <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" /> 342 reading now
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#9896a4]">
                      ⭐ 4.9 · {discussions.length} discussions
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-10 border-b border-[rgba(201,168,76,0.1)] shrink-0">
              <HubTab label="Summary" active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} />
              <HubTab label="Key Insights" active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
              <HubTab label="Discussion" active={activeTab === 'discussion'} onClick={() => setActiveTab('discussion')} badge={discussions.length} />
              <HubTab label="AI Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
              <HubTab label="My Shelf" active={activeTab === 'shelf'} onClick={() => setActiveTab('shelf')} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar pb-24">
              <AnimatePresence mode="wait">
                {activeTab === 'summary' && (
                  <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl">
                    <p className="text-lg leading-relaxed text-[#9896a4] whitespace-pre-wrap">{selectedBook?.summary}</p>
                  </motion.div>
                )}
                {activeTab === 'insights' && (
                  <motion.div key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 gap-4 max-w-3xl">
                    {selectedBook?.key_insights?.split('. ').filter(s => s.trim()).map((insight, i) => (
                      <div key={i} className="bg-[#1a1928] border border-[rgba(201,168,76,0.1)] p-6 rounded-2xl">
                        <div className="text-[#c9a84c] font-mono text-xs mb-2">INSIGHT 0{i+1}</div>
                        <p className="text-[#9896a4] leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
                {activeTab === 'discussion' && (
                  <motion.div key="discussion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-6">
                    {discussions.map(d => (
                      <div key={d.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 flex items-center justify-center text-[#c9a84c] font-bold shrink-0">{d.user_email[0].toUpperCase()}</div>
                        <div className="bg-[#1a1928] border border-[rgba(201,168,76,0.1)] p-4 rounded-2xl flex-1">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold">{d.user_email}</span>
                            <span className="text-[10px] text-[#9896a4] font-mono">{formatDistanceToNow(new Date(d.created_at))} ago</span>
                          </div>
                          <p className="text-sm text-[#9896a4]">{d.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-4 pt-4">
                      <div className="w-10 h-10 rounded-full bg-[#c9a84c] flex items-center justify-center text-[#0a0a0f] font-bold shrink-0">{user.email[0].toUpperCase()}</div>
                      <div className="flex-1">
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Share your thoughts..." className="w-full bg-[#13121a] border border-[rgba(201,168,76,0.1)] rounded-2xl p-4 text-sm focus:border-[#c9a84c]/50 outline-none min-h-[100px] resize-none" />
                        <div className="flex justify-end mt-2"><button onClick={handleAddComment} className="px-6 py-2 bg-[#c9a84c] text-[#0a0a0f] font-bold rounded-xl active:scale-95 transition-all">Post</button></div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {activeTab === 'chat' && (
                  <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-[500px] max-w-2xl">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-6 custom-scrollbar pr-4">
                      {chatMessages.map((m, i) => (
                        <div key={i} className={cn("flex gap-4", m.role === 'user' ? "flex-row-reverse" : "")}>
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", m.role === 'user' ? "bg-[#c9a84c] text-black" : "bg-[#1a1928] text-[#c9a84c]")}>
                            {m.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                          </div>
                          <div className={cn("p-4 rounded-2xl text-sm max-w-[80%]", m.role === 'user' ? "bg-[#c9a84c]/10 text-white rounded-tr-none" : "bg-[#13121a] border border-[rgba(201,168,76,0.1)] text-[#9896a4] rounded-tl-none")}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="relative">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleChat()} placeholder="Ask AI anything about this book..." className="w-full bg-[#13121a] border border-[rgba(201,168,76,0.1)] rounded-full py-4 pl-6 pr-14 text-sm focus:border-[#c9a84c]/50 outline-none" />
                      <button onClick={() => handleChat()} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#c9a84c] rounded-full flex items-center justify-center text-black"><Send className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-20 h-20 bg-[#c9a84c]/10 rounded-3xl flex items-center justify-center mb-6"><BookIcon className="w-10 h-10 text-[#c9a84c]" /></div>
            <h2 className="text-2xl font-serif font-bold mb-2">Welcome to House of Books</h2>
            <p className="text-[#9896a4] max-w-sm">Select a book from the feed to start your AI-powered reading journey.</p>
          </div>
        )}

        {/* BOTTOM MUSIC PLAYER BAR */}
        <div className="absolute bottom-0 left-0 right-0 h-20 backdrop-blur-xl border-t border-[rgba(201,168,76,0.1)] px-8 flex items-center justify-between z-30" style={{ background: currentTheme.surface + 'cc' }}>
          <div className="flex items-center gap-4 w-1/3">
            <div className="w-10 h-10 bg-[#1a1928] rounded-lg flex items-center justify-center text-xl">{MUSIC_TRACKS.find(t => t.id === musicTrack)?.icon}</div>
            <div>
              <div className="text-sm font-bold text-white">{MUSIC_TRACKS.find(t => t.id === musicTrack)?.name}</div>
              <div className="text-[10px] text-[#9896a4] uppercase tracking-widest">Ambient Mode</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 w-1/3">
            <div className="flex items-center gap-6">
              <button className="text-[#9896a4] hover:text-white transition-colors"><SkipBack className="w-5 h-5" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 bg-[#c9a84c] rounded-full flex items-center justify-center text-[#0a0a0f] transform active:scale-95 transition-all shadow-[0_0_15px_rgba(201,168,76,0.4)]">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>
              <button className="text-[#9896a4] hover:text-white transition-colors"><SkipForward className="w-5 h-5" /></button>
            </div>
            <div className="w-full max-w-xs h-1 bg-[rgba(201,168,76,0.1)] rounded-full overflow-hidden">
              <div className="h-full bg-[#c9a84c] w-1/2 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-6 w-1/3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#9896a4]" />
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="w-20 accent-[#c9a84c] h-1" />
            </div>
            <div className="flex gap-2">
              {Object.entries(THEMES).map(([id, t]) => (
                <button 
                  key={id} 
                  onClick={() => setTheme(id as any)}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all transform hover:scale-125",
                    theme === id ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: t.accent }}
                  title={t.name}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 4. RIGHT PANEL (280px) */}
      <aside className="w-[280px] border-l border-[rgba(201,168,76,0.1)] flex flex-col shrink-0" style={{ background: currentTheme.surface }}>
        <div className="p-6 border-b border-[rgba(201,168,76,0.1)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Book Room</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-[#4ade80] font-mono">
              <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" /> 24 online
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ReaderChip name="Sara A." />
            <ReaderChip name="Mohamed K." />
            <ReaderChip name="Rami H." />
            <div className="text-[10px] text-[#9896a4] ml-1 self-center">+12 more</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <ChatMessage initials="🤖" name="AI Guide" text="Welcome! I'm here to help you dive deeper into the book's core concepts." color="#c9a84c" isAI />
          <ChatMessage initials="SA" name="Sara" text="The identity chapter in Atomic Habits is a game changer. Focus on who you want to become!" color="#fb7185" />
          <ChatMessage initials="MK" name="Mohamed" text="Agreed. Small wins build that identity over time." color="#60a5fa" />
        </div>

        <div className="p-6 border-t border-[rgba(201,168,76,0.1)]">
          <div className="text-[10px] text-[#c9a84c] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Quick Prompts
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <PromptPill label="4 laws" onClick={() => handleChat("Explain the 4 laws of habits")} />
            <PromptPill label="Habit stacking" onClick={() => handleChat("What is habit stacking?")} />
            <PromptPill label="2-min rule" onClick={() => handleChat("Explain the 2-minute rule")} />
          </div>

          <div className="flex items-center gap-2 bg-[#1a1928] border border-[rgba(201,168,76,0.1)] rounded-xl p-1.5 pl-4 focus-within:border-[#c9a84c]/50 transition-all">
            <input type="text" placeholder="Type a message..." className="flex-1 bg-transparent border-none outline-none text-xs" />
            <button className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center text-[#0a0a0f]"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* Cooldown Modal */}
      {showCooldown && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCooldown(false)}>
          <div className="bg-[#1a1928] border border-[rgba(201,168,76,0.1)] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-6">⌛</div>
            <h3 className="text-2xl font-serif font-bold mb-2">Patience, Reader</h3>
            <p className="text-[#9896a4] text-sm mb-8 leading-relaxed">
              You've reached your {CHAT_LIMIT} free AI insights. Your wisdom will replenish in <span className="text-[#c9a84c] font-bold">{cooldownMins} minutes</span>.
            </p>
            <button onClick={() => setShowCooldown(false)} className="w-full bg-[#c9a84c] text-[#0a0a0f] font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-[0_10px_30px_rgba(201,168,76,0.2)]">Understood</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarIcon({ icon, active, onClick, title }: { icon: React.ReactNode, active: boolean, onClick: () => void, title?: string }) {
  return (
    <div 
      onClick={onClick}
      title={title}
      className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all relative group",
        active ? "bg-[#c9a84c]/10 text-[#c9a84c]" : "text-[#9896a4] hover:bg-white/5 hover:text-white"
      )}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#c9a84c] rounded-r-full" />}
    </div>
  );
}

function FeedTab({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all",
      active ? "bg-[#c9a84c] text-[#0a0a0f]" : "text-[#9896a4] hover:text-white"
    )}>{label}</button>
  );
}

function CompactBookCard({ book, active, onClick, progress }: { book: Book, active: boolean, onClick: () => void, progress: number }) {
  return (
    <div onClick={onClick} className={cn(
      "p-3 rounded-2xl border cursor-pointer transition-all group",
      active ? "bg-[#c9a84c]/5 border-[#c9a84c]/30" : "bg-[#1a1928] border-[rgba(201,168,76,0.05)] hover:border-[#c9a84c]/20"
    )}>
      <div className="flex gap-4">
        <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-lg">
          <img src={book.cover_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-bold truncate mb-0.5 group-hover:text-[#c9a84c] transition-colors">{book.title}</h4>
          <p className="text-[11px] text-[#9896a4] truncate mb-2">{book.author}</p>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#c9a84c]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HubTab({ label, active, onClick, badge }: { label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button onClick={onClick} className={cn(
      "px-6 py-4 text-[13px] font-bold transition-all border-b-2 relative",
      active ? "text-[#c9a84c] border-[#c9a84c]" : "text-[#9896a4] border-transparent hover:text-white"
    )}>
      <div className="flex items-center gap-2">
        {label}
        {badge !== undefined && <span className="bg-[#c9a84c]/10 text-[#c9a84c] text-[10px] px-1.5 py-0.5 rounded-md">{badge}</span>}
      </div>
    </button>
  );
}

function ReaderChip({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#1a1928] border border-[rgba(201,168,76,0.1)] rounded-full px-2.5 py-1 text-[10px] text-[#9896a4]">
      <div className="w-1 h-1 bg-[#4ade80] rounded-full" />
      {name}
    </div>
  );
}

function ChatMessage({ initials, name, text, color, isAI }: { initials: string, name: string, text: string, color: string, isAI?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `${color}20`, color }}>{initials}</div>
      <div className="flex-1">
        <div className="text-[10px] font-bold mb-1" style={{ color }}>{name}</div>
        <div className={cn(
          "text-[12px] leading-relaxed p-3 rounded-2xl",
          isAI ? "bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-white rounded-tl-none" : "bg-[#1a1928] text-[#9896a4] rounded-tl-none"
        )}>{text}</div>
      </div>
    </div>
  );
}

function PromptPill({ label, onClick }: { label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-[#1a1928] border border-[rgba(201,168,76,0.1)] rounded-full px-3 py-1.5 text-[10px] text-[#9896a4] hover:border-[#c9a84c]/40 hover:text-white transition-all">
      {label}
    </button>
  );
}

function CommunityPage({ userEmail }: { userEmail: string }) {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const SUPABASE_URL = 'https://ulxzyjqmvzyqjynmqywe.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseHp5anFtdnp5cWp5bm1xeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTcyNzYsImV4cCI6MjA4Nzg3MzI3Nn0.WWW2H8JmDjVgpaUEiaKbXDcqWWtmFTD9omrEWVMG8AI';

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/discussions?select=*&order=created_at.desc&limit=50&apikey=${SUPABASE_KEY}`,
      { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDiscussions(data); });
  }, []);

  const postMessage = async () => {
    if (!newPost.trim()) return;
    await fetch(`${SUPABASE_URL}/rest/v1/discussions?apikey=${SUPABASE_KEY}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ book_id: 'general', book_title: 'Community', user_email: userEmail, content: newPost })
    });
    setNewPost('');
    fetch(`${SUPABASE_URL}/rest/v1/discussions?select=*&order=created_at.desc&limit=50&apikey=${SUPABASE_KEY}`,
      { headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDiscussions(data); });
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
      <h2 className="text-3xl font-serif font-bold mb-8">Community</h2>
      <div className="max-w-2xl space-y-4 mb-8">
        {discussions.map((d, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#c9a84c] font-bold shrink-0 text-sm" style={{ background: 'rgba(201,168,76,0.1)' }}>
              {d.user_email?.[0]?.toUpperCase() || 'R'}
            </div>
            <div className="flex-1 p-4 rounded-2xl" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-[#c9a84c]">{d.user_email?.split('@')[0] || 'Reader'}</span>
                <span className="text-xs text-[#9896a4]">{d.book_title || 'General'}</span>
              </div>
              <p className="text-sm text-[#9896a4]">{d.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-2xl flex gap-4">
        <input value={newPost} onChange={e => setNewPost(e.target.value)} onKeyDown={e => e.key === 'Enter' && postMessage()} placeholder="Share a thought with the community..." className="flex-1 rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', color: '#f0ece4' }} />
        <button onClick={postMessage} className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: '#c9a84c', color: '#0a0a0f' }}>Post</button>
      </div>
    </div>
  );
}
