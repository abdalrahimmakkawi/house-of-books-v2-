import React, { useState, useEffect, useMemo } from 'react';
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
  Download
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

const ADMIN_EMAIL = 'abdalrahimmakkawi@gmail.com';
const CHAT_LIMIT = 10;
const COOLDOWN_HOURS = 6;

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'discussion' | 'chat'>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [showCooldown, setShowCooldown] = useState(false);
  const [cooldownMins, setCooldownMins] = useState(0);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [currentPage, setCurrentPage] = useState<'library' | 'agents' | 'dashboard'>('library');

  useEffect(() => {
    // 1. Handle OAuth Callback in Popup
    if (window.opener && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
      try {
        window.opener.postMessage({ 
          type: 'SUPABASE_AUTH_CALLBACK', 
          hash: window.location.hash 
        }, '*');
        setTimeout(() => window.close(), 1500);
      } catch (e) {
        console.error('Error sending message to opener:', e);
      }
      return;
    }

    // 2. Listen for messages from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_CALLBACK') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            const supabaseUser: UserProfile = {
              email: session.user.email || '',
              isAdmin: session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
              chatCount: 0,
              lastChatReset: new Date().toISOString()
            };
            setUser(supabaseUser);
            window.history.replaceState(null, '', window.location.pathname);
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);

    // 3. Handle hash in main window
    if (window.location.hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const supabaseUser: UserProfile = {
            email: session.user.email || '',
            isAdmin: session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
            chatCount: 0,
            lastChatReset: new Date().toISOString()
          };
          setUser(supabaseUser);
          window.history.replaceState(null, '', window.location.pathname);
        }
      });
    }

    // 4. Load progress
    try {
      const savedUser = localStorage.getItem('hob_user');
      if (savedUser) setUser(JSON.parse(savedUser));
      const savedProgress = localStorage.getItem('hob_progress');
      if (savedProgress) setReadingProgress(JSON.parse(savedProgress));
    } catch (e) {
      console.error('LocalStorage access failed:', e);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const supabaseUser: UserProfile = {
          email: session.user.email || '',
          isAdmin: session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
          chatCount: 0,
          lastChatReset: new Date().toISOString()
        };
        setUser(supabaseUser);
      }
    });

    fetchBooks();

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      (window as any).__pwa = e;
      setShowInstallBtn(true);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    try {
      if (Object.keys(readingProgress).length > 0) {
        localStorage.setItem('hob_progress', JSON.stringify(readingProgress));
      }
    } catch (e) { console.error(e); }
  }, [readingProgress]);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('hob_user', JSON.stringify(user));
      else localStorage.removeItem('hob_user');
    } catch (e) { console.error(e); }
  }, [user]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) setBooks(data);
    } catch(err) {
      console.error('fetchBooks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussions = async (bookId: string) => {
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setDiscussions(data || []);
    } catch (err) { console.error(err); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      alert('Check your email for the login link!');
    } catch (err: any) {
      alert(`Failed to send magic link: ${err.message || 'Please try again.'}`);
    } finally { setLoading(false); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    const newUser: UserProfile = {
      email: emailInput,
      isAdmin: emailInput.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      chatCount: 0,
      lastChatReset: new Date().toISOString()
    };
    setUser(newUser);
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
        if (!popup) alert('Popup blocked! Please allow popups for this site.');
      }
    } catch (err) { alert('Google login failed.'); }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedBook(null);
    localStorage.removeItem('hob_user');
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [books, searchQuery]);

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setActiveTab('summary');
    fetchDiscussions(book.id);
    setChatMessages([]);
  };

  const handleAddComment = async () => {
    if (!newComment || !selectedBook || !user) return;
    try {
      const { data, error } = await supabase
        .from('discussions')
        .insert([{ book_id: selectedBook.id, user_email: user.email, content: newComment }])
        .select();
      if (error) throw error;
      setDiscussions([...discussions, data[0]]);
      setNewComment('');
    } catch (err) { console.error(err); }
  };

  const handleChat = async () => {
    if (!chatInput || !selectedBook || !user || isChatting) return;
    if (!user.isAdmin) {
      const now = new Date();
      const lastReset = new Date(user.lastChatReset);
      const cooldownEnd = addHours(lastReset, COOLDOWN_HOURS);
      if (user.chatCount >= CHAT_LIMIT && !isAfter(now, cooldownEnd)) {
        const minsLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 60000);
        setCooldownMins(minsLeft);
        setShowCooldown(true);
        return;
      }
      if (isAfter(now, cooldownEnd)) {
        setUser({ ...user, chatCount: 0, lastChatReset: now.toISOString() });
      }
    }

    const newMessage = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const apiKey = 'sk-0a2bd43938e740e885070afa5c62d8ea';
      const apiUrl = 'https://api.deepseek.com/chat/completions';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: `You are an expert literary assistant for the book "${selectedBook.title}" by ${selectedBook.author}.` },
            ...chatMessages, newMessage
          ],
          stream: false
        })
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
      if (!user.isAdmin) setUser(prev => prev ? { ...prev, chatCount: prev.chatCount + 1 } : null);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error. Please try again.' }]);
    } finally { setIsChatting(false); }
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
        onLogin={(email) => { setEmailInput(email); handleLogin({ preventDefault: () => {} } as any); }}
        onGoogleLogin={handleGoogleLogin}
        onMagicLink={(email) => { setEmailInput(email); handleMagicLink({ preventDefault: () => {} } as any); }}
        onGuestLogin={() => setUser({ email: 'guest@example.com', isAdmin: false, chatCount: 0, lastChatReset: new Date().toISOString() })}
        onManualToken={() => {
          const token = prompt('Paste token here:');
          if (token) { window.location.hash = token.includes('#') ? token.split('#')[1] : token; window.location.reload(); }
        }}
        onClearSession={async () => { await supabase.auth.signOut(); localStorage.removeItem('hob_user'); setUser(null); window.location.hash = ''; }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      <motion.aside animate={{ width: isSidebarOpen ? 260 : 80 }} className="bg-dark-surface border-r border-dark-border flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-accent rounded-xl flex items-center justify-center shrink-0"><BookIcon className="text-black w-6 h-6" /></div>
          {isSidebarOpen && <span className="font-bold text-xl text-white tracking-tight">House of Books</span>}
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Library />} label="Library" active={currentPage === 'library'} onClick={() => { setCurrentPage('library'); setSelectedBook(null) }} isOpen={isSidebarOpen} />
          <NavItem icon={<Bookmark />} label="My Shelf" active={false} onClick={() => {}} isOpen={isSidebarOpen} />
          <NavItem icon={<MessageSquare />} label="Discussions" active={false} onClick={() => {}} isOpen={isSidebarOpen} />
          {user.isAdmin && (
            <>
              <div className="pt-4 pb-2 px-2"><span className={cn("text-[10px] uppercase tracking-widest text-gray-500 font-bold", !isSidebarOpen && "hidden")}>Admin</span></div>
              <NavItem icon={<Sparkles />} label="AI Agents" active={currentPage === 'agents'} onClick={() => { setCurrentPage('agents'); setSelectedBook(null) }} isOpen={isSidebarOpen} />
              <NavItem icon={<Settings />} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => { setCurrentPage('dashboard'); setSelectedBook(null) }} isOpen={isSidebarOpen} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-dark-border">
          {showInstallBtn && (
            <button onClick={() => { const p = (window as any).__pwa; if(p){ p.prompt(); p.userChoice.then(() => setShowInstallBtn(false)) } }} className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:bg-dark-border hover:text-white transition-all mb-2">
              <Download className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="text-sm">Install App</span>}
            </button>
          )}
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-border transition-colors cursor-pointer group" onClick={handleLogout}>
            <div className="w-8 h-8 bg-dark-border rounded-full flex items-center justify-center group-hover:bg-red-500/20 transition-colors"><LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500" /></div>
            {isSidebarOpen && <div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-white truncate">{user.email}</p><p className="text-[10px] text-gray-500 uppercase font-bold">Sign Out</p></div>}
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-dark-border flex items-center justify-between px-8 bg-dark-bg/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-dark-surface border border-dark-border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-accent/50 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-4"><button className="p-2 text-gray-400 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button><div className="w-8 h-8 bg-amber-accent/10 rounded-full flex items-center justify-center border border-amber-accent/20"><User className="w-4 h-4 text-amber-accent" /></div></div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {currentPage === 'library' && (
            <div className="p-8">
              {loading ? <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-amber-accent border-t-transparent rounded-full animate-spin"></div></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {filteredBooks.map((book) => <BookCard key={book.id} book={book} onClick={() => handleBookClick(book)} onShelfToggle={() => toggleShelf(book.id)} isOnShelf={readingProgress[book.id]?.isShelf} />)}
                </div>
              )}
            </div>
          )}
          {currentPage === 'agents' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">AI Business Agents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[{ icon: '🚀', label: 'Growth Advisor', desc: '90-day growth plan' }, { icon: '💰', label: 'Revenue Analyst', desc: 'Analyze MRR, churn' }, { icon: '📢', label: 'Marketing Copywriter', desc: 'Landing pages, ads' }, { icon: '🏷️', label: 'Pricing Strategist', desc: 'Optimize pricing' }, { icon: '⚙️', label: 'Product Strategist', desc: 'Roadmap decisions' }, { icon: '🔄', label: 'Churn & Retention', desc: 'Reduce churn' }, { icon: '🎯', label: 'Competitor Analysis', desc: 'Competitive positioning' }, { icon: '🔍', label: 'SEO & Content', desc: 'Strategy, keywords' }].map(agent => (
                  <div key={agent.label} className="card p-6 cursor-pointer hover:border-amber-accent/50 transition-all"><div className="text-3xl mb-3">{agent.icon}</div><h3 className="font-bold text-white mb-1">{agent.label}</h3><p className="text-sm text-gray-500">{agent.desc}</p></div>
                ))}
              </div>
            </div>
          )}
          {currentPage === 'dashboard' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[{ label: 'Total Books', value: books.length, emoji: '📚' }, { label: 'Free Books', value: 90, emoji: '🆓' }, { label: 'AI Chats/Day', value: '10', emoji: '🤖' }, { label: 'Status', value: 'Beta', emoji: '⭐' }].map(stat => (
                  <div key={stat.label} className="card p-6 relative overflow-hidden"><div className="absolute right-4 top-4 text-3xl opacity-10">{stat.emoji}</div><div className="text-2xl font-bold text-amber-accent mb-1">{stat.value}</div><div className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedBook && (
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute inset-y-0 right-0 w-full max-w-2xl bg-dark-surface border-l border-dark-border z-30 shadow-2xl flex flex-col">
              <div className="p-6 border-b border-dark-border flex items-center justify-between"><button onClick={() => setSelectedBook(null)} className="p-2 hover:bg-dark-border rounded-lg transition-colors"><ChevronRight className="w-6 h-6 rotate-180" /></button><div className="flex items-center gap-2"><button className="btn-secondary py-1.5 text-xs">Share</button><button onClick={() => toggleShelf(selectedBook.id)} className={cn("btn-primary py-1.5 text-xs", readingProgress[selectedBook.id]?.isShelf && "bg-dark-border text-white hover:bg-dark-border/80")}>{readingProgress[selectedBook.id]?.isShelf ? 'On Shelf' : 'Add to Shelf'}</button></div></div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="flex gap-8 mb-8"><img src={selectedBook.cover_url} alt={selectedBook.title} className="w-40 h-60 object-cover rounded-xl shadow-xl border border-dark-border" referrerPolicy="no-referrer" /><div className="flex-1"><h2 className="text-3xl font-bold text-white mb-2">{selectedBook.title}</h2><p className="text-amber-accent font-medium mb-4">{selectedBook.author}</p><div className="flex flex-wrap gap-3"><Badge icon={<Clock className="w-3 h-3" />} label={`${selectedBook.read_time_mins}m read`} /><Badge icon={<Globe className="w-3 h-3" />} label={selectedBook.language} /><Badge label={selectedBook.category} /></div></div></div>
                <div className="flex border-b border-dark-border mb-6"><TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<Info className="w-4 h-4" />} label="Summary" /><TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={<Lightbulb className="w-4 h-4" />} label="Key Insights" /><TabButton active={activeTab === 'discussion'} onClick={() => setActiveTab('discussion')} icon={<MessageCircle className="w-4 h-4" />} label="Discussion" /><TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<Sparkles className="w-4 h-4" />} label="AI Chat" /></div>
                <div className="min-h-[300px]">
                  {activeTab === 'summary' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedBook.summary}</p></motion.div>}
                  {activeTab === 'insights' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">{typeof selectedBook.key_insights === 'string' && selectedBook.key_insights ? selectedBook.key_insights.split('. ').filter(s => s.trim()).slice(0, 4).map((insight, i) => (<div key={i} className="flex gap-4 p-4 bg-dark-bg rounded-xl border border-dark-border"><div className="w-6 h-6 bg-amber-accent/10 rounded-full flex items-center justify-center shrink-0 text-amber-accent font-bold text-xs">{i + 1}</div><p className="text-gray-300">{insight.replace(/^[-•*]\s*/, '')}</p></div>)) : <p className="text-gray-500 italic">No insights available.</p>}</motion.div>}
                  {activeTab === 'discussion' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6"><div className="space-y-4">{discussions.map((comment) => (<div key={comment.id} className="p-4 bg-dark-bg rounded-xl border border-dark-border"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-amber-accent">{comment.user_email}</span><span className="text-[10px] text-gray-500">{formatDistanceToNow(new Date(comment.created_at))} ago</span></div><p className="text-sm text-gray-300">{comment.content}</p></div>))}{discussions.length === 0 && <p className="text-center text-gray-500 py-8">No discussions yet.</p>}</div><div className="pt-4 border-t border-dark-border"><textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Share thoughts..." className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-sm focus:outline-none focus:border-amber-accent/50 min-h-[100px]" /><div className="flex justify-end mt-2"><button onClick={handleAddComment} className="btn-primary">Post</button></div></div></motion.div>}
                  {activeTab === 'chat' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[500px]"><div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">{chatMessages.length === 0 && <div className="text-center py-12"><div className="w-12 h-12 bg-amber-accent/10 rounded-full flex items-center justify-center mx-auto mb-4"><Sparkles className="w-6 h-6 text-amber-accent" /></div><p className="text-gray-400">Ask me anything about "{selectedBook.title}"</p>{!user.isAdmin && <p className="text-[10px] text-gray-600 mt-2 uppercase tracking-widest">{CHAT_LIMIT - user.chatCount} chats remaining</p>}</div>}{chatMessages.map((msg, i) => (<div key={i} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}><div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-amber-accent text-black" : "bg-dark-border text-amber-accent")}>{msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}</div><div className={cn("p-3 rounded-2xl text-sm", msg.role === 'user' ? "bg-amber-accent/10 text-white rounded-tr-none" : "bg-dark-bg border border-dark-border text-gray-300 rounded-tl-none")}>{msg.content}</div></div>))}{isChatting && <div className="flex gap-3 mr-auto"><div className="w-8 h-8 bg-dark-border rounded-lg flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-amber-accent animate-pulse" /></div><div className="p-3 bg-dark-bg border border-dark-border rounded-2xl rounded-tl-none"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:0.4s]"></div></div></div></div>}</div><div className="relative"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChat()} placeholder="Ask AI..." className="w-full bg-dark-bg border border-dark-border rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-amber-accent/50" /><button onClick={handleChat} disabled={isChatting} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-amber-accent text-black rounded-full hover:bg-amber-accent/90 transition-all disabled:opacity-50"><Send className="w-4 h-4" /></button></div></motion.div>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {showCooldown && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCooldown(false)}>
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
              <div className="text-4xl mb-4">⏳</div><h3 className="text-xl font-bold text-white mb-2">Chat Limit Reached</h3><p className="text-gray-400 text-sm mb-4 leading-relaxed">You've used your {CHAT_LIMIT} free AI chats. Come back in <span className="text-amber-accent font-bold">{cooldownMins} minutes</span>.</p><p className="text-xs text-gray-600 mb-6">✦ Premium with unlimited AI chat — coming soon</p><button onClick={() => setShowCooldown(false)} className="btn-primary w-full">Got it</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, isOpen }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, isOpen: boolean }) {
  return (<button onClick={onClick} className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-all group", active ? "bg-amber-accent text-black font-bold" : "text-gray-400 hover:bg-dark-border hover:text-white")}><div className={cn("shrink-0", active ? "text-black" : "text-gray-500 group-hover:text-amber-accent transition-colors")}>{React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5" }) : icon}</div>{isOpen && <span className="text-sm">{label}</span>}</button>);
}

const BookCard: React.FC<{ book: Book, onClick: () => void, onShelfToggle: () => void, isOnShelf: boolean }> = ({ book, onClick, onShelfToggle, isOnShelf }) => {
  return (<motion.div whileHover={{ y: -5 }} className="card group cursor-pointer" onClick={onClick}><div className="relative aspect-[2/3] overflow-hidden"><img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4"><button onClick={(e) => { e.stopPropagation(); onShelfToggle(); }} className={cn("w-full py-2 rounded-lg text-xs font-bold transition-all", isOnShelf ? "bg-white text-black" : "bg-amber-accent text-black")}>{isOnShelf ? 'Remove from Shelf' : 'Add to Shelf'}</button></div>{isOnShelf && <div className="absolute top-2 right-2 bg-amber-accent text-black p-1.5 rounded-lg shadow-lg"><Bookmark className="w-3 h-3 fill-current" /></div>}</div><div className="p-4"><h3 className="font-bold text-white truncate mb-1 group-hover:text-amber-accent transition-colors">{book.title}</h3><p className="text-xs text-gray-500 mb-3">{book.author}</p><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-widest font-bold text-gray-600 bg-dark-bg px-2 py-1 rounded border border-dark-border">{book.category}</span><div className="flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" /><span className="text-[10px]">{book.read_time_mins}m</span></div></div></div></motion.div>);
}

function Badge({ icon, label }: { icon?: React.ReactNode, label: string }) {
  return (<div className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-bg border border-dark-border rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-wider">{icon && <span className="text-amber-accent">{icon}</span>}{label}</div>);
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (<button onClick={onClick} className={cn("flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative", active ? "text-amber-accent" : "text-gray-500 hover:text-gray-300")}>{icon}{label}{active && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-accent" initial={false} />}</button>);
}
