import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Book as BookIcon, 
  Mail, 
  ArrowRight, 
  User, 
  Sparkles, 
  ChevronDown, 
  Volume2, 
  Crown, 
  Zap, 
  Shield, 
  Globe, 
  MessageSquare,
  Clock,
  Brain,
  Lightbulb,
  CheckCircle,
  Library,
  Bot,
  Music
} from 'lucide-react';

interface LandingPageProps {
  onLogin: (email: string) => void;
  onGoogleLogin: () => void;
  onMagicLink: (email: string) => void;
  onGuestLogin: () => void;
  onManualToken: () => void;
  onClearSession: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onLogin,
  onGoogleLogin, 
  onGuestLogin, 
  onClearSession, 
  onManualToken 
}) => {
  const [email, setEmail] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      setFeedbackSent(true);
      setFeedback('');
      setTimeout(() => setFeedbackSent(false), 3000);
    }
  };

  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#06050a', color: '#f0ece4', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      {/* Gold animated particles background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(6,5,10,0.75) 55%, rgba(6,5,10,0.97) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(circle at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(201,168,76,0.05) 0%, transparent 40%)', pointerEvents: 'none' }} />
      
      {/* Animated particles */}
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0) translateX(0)} 33%{transform:translateY(-30px) translateX(20px)} 66%{transform:translateY(20px) translateX(-15px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) translateX(0)} 33%{transform:translateY(25px) translateX(-20px)} 66%{transform:translateY(-15px) translateX(25px)} }
        @keyframes float3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-40px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes wv { 0%,100%{transform:scaleY(0.35);opacity:0.35} 50%{transform:scaleY(1);opacity:1} }
        .particle { position: fixed; border-radius: 50%; pointer-events: none; z-index: 1; }
        .p1 { width:3px;height:3px;background:rgba(201,168,76,0.6);top:15%;left:10%;animation:float1 8s ease-in-out infinite; }
        .p2 { width:2px;height:2px;background:rgba(201,168,76,0.4);top:25%;left:85%;animation:float2 10s ease-in-out infinite; }
        .p3 { width:4px;height:4px;background:rgba(201,168,76,0.3);top:60%;left:5%;animation:float3 12s ease-in-out infinite; }
        .p4 { width:2px;height:2px;background:rgba(201,168,76,0.5);top:70%;left:90%;animation:float1 9s ease-in-out infinite 2s; }
        .p5 { width:3px;height:3px;background:rgba(201,168,76,0.4);top:40%;left:50%;animation:float2 11s ease-in-out infinite 1s; }
        .p6 { width:2px;height:2px;background:rgba(240,236,228,0.3);top:80%;left:30%;animation:float3 7s ease-in-out infinite 3s; }
        .p7 { width:3px;height:3px;background:rgba(201,168,76,0.3);top:10%;left:60%;animation:float1 13s ease-in-out infinite 1.5s; }
        .p8 { width:2px;height:2px;background:rgba(240,236,228,0.2);top:50%;left:75%;animation:float2 9s ease-in-out infinite 4s; }
        .wave-bar { width:4px;background:#c9a84c;border-radius:2px;display:inline-block;animation:wv 1.4s ease-in-out infinite; }
        nav { transition: all 0.5s; }
        .nav-link { text-decoration:none;color:#9a9488;font-size:0.78rem;letter-spacing:0.12em;text-transform:uppercase;transition:color 0.3s; }
        .nav-link:hover { color:#c9a84c; }
        .btn-primary { padding:0.95rem 2.5rem;background:linear-gradient(135deg,#c9a84c,#e8c97a);color:#06050a;border:none;border-radius:3px;font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.3s;font-family:'Georgia',serif; }
        .btn-primary:hover { transform:translateY(-2px);box-shadow:0 16px 48px rgba(201,168,76,0.4); }
        .btn-ghost { padding:0.95rem 2.5rem;background:transparent;color:#9a9488;border:1px solid rgba(255,255,255,0.14);border-radius:3px;font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.3s;font-family:'Georgia',serif; }
        .btn-ghost:hover { border-color:#c9a84c;color:#c9a84c; }
        .bcard { padding:2.6rem;background:#06050a;transition:background 0.4s;position:relative;overflow:hidden;cursor:pointer; }
        .bcard:hover { background:rgba(201,168,76,0.03); }
        .bcard .bicon { font-size:2.2rem;margin-bottom:1.2rem;display:block;transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .bcard:hover .bicon { transform:translateY(-5px) scale(1.1); }
        .pcard { padding:3rem;background:#06050a;text-align:left;position:relative; }
        .pcard.feat { background:rgba(201,168,76,0.04); }
        input:focus, textarea:focus { outline:none;border-color:rgba(201,168,76,0.5)!important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.3);border-radius:2px; }
      `}</style>

      {/* Floating particles */}
      {['p1','p2','p3','p4','p5','p6','p7','p8'].map(p => <div key={p} className={`particle ${p}`} />)}

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'1.6rem 4rem', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(6,5,10,0.8)', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(201,168,76,0.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
          <div style={{ width:30, height:30, border:'1px solid #c9a84c', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>H</div>
          <span style={{ fontFamily:'Georgia,serif', fontSize:'1.3rem', letterSpacing:'0.07em' }}>House of Books</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'2.5rem' }}>
          {['Library','Features','Pricing','Feedback'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
          ))}
          <button onClick={onGuestLogin} style={{ border:'1px solid rgba(201,168,76,0.5)', color:'#c9a84c', background:'transparent', padding:'0.5rem 1.3rem', borderRadius:3, fontSize:'0.78rem', letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', fontFamily:'Georgia,serif' }}>
            Guest Access
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'8rem 2rem 4rem', position:'relative', zIndex:10 }}>
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }} style={{ display:'inline-flex', alignItems:'center', gap:'0.8rem', fontSize:'0.67rem', letterSpacing:'0.25em', textTransform:'uppercase', color:'#c9a84c', marginBottom:'2rem' }}>
          <span style={{ display:'block', width:30, height:1, background:'#c9a84c', opacity:0.5 }} />
          The Ultimate Digital Sanctuary
          <span style={{ display:'block', width:30, height:1, background:'#c9a84c', opacity:0.5 }} />
        </motion.div>

        <motion.h1 initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }} style={{ fontFamily:'Georgia,serif', fontSize:'clamp(3rem,8vw,7.5rem)', fontWeight:400, lineHeight:1.02, letterSpacing:'-0.02em', marginBottom:'1.4rem' }}>
          WISDOM <br /><em style={{ fontStyle:'italic', color:'#c9a84c' }}>DISTILLED</em>
        </motion.h1>

        <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.8 }} style={{ fontSize:'clamp(0.95rem,2vw,1.15rem)', color:'#9a9488', lineHeight:1.78, maxWidth:550, margin:'0 auto 2.8rem' }}>
          House of Books is a premium platform for the modern intellectual. We leverage AI to summarize, analyze, and discuss the world's most impactful literature in an immersive environment.
        </motion.p>

        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.2 }} style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap', marginBottom:'4rem' }}>
          {[['304','Masterpieces'],['90','Free Books'],['5','Ambient Tracks'],['8','AI Agents']].map(([num,label]) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'2.6rem', color:'#c9a84c', lineHeight:1 }}>{num}</div>
              <div style={{ fontSize:10, color:'#5a5650', letterSpacing:'0.14em', textTransform:'uppercase', marginTop:4 }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* DIVIDER */}
      <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent)', margin:'0 5rem', position:'relative', zIndex:10 }} />

      {/* FEATURES BENTO */}
      <div id="features" style={{ position:'relative', zIndex:10, padding:'8rem 5rem', maxWidth:1300, margin:'0 auto' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#c9a84c', marginBottom:'1rem' }}>Inside the Sanctuary</div>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(2rem,4vw,3.4rem)', fontWeight:400, lineHeight:1.18, marginBottom:'3.5rem' }}>
          Everything you need to <em style={{ fontStyle:'italic', color:'#c9a84c' }}>master</em> any book
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'rgba(201,168,76,0.08)' }}>
          {[
            { icon:'⚡', name:'AI Distillation', desc:'Transform 300+ pages into 15 minutes of pure wisdom. Our AI extracts core mental models and actionable insights.' },
            { icon:'🤖', name:'AI Author Chat', desc:"Don't just read — converse. Ask questions to the book's core logic and get instant context-aware answers.", wide:true },
            { icon:'📚', name:'Digital Shelf', desc:'Organize your intellectual journey. Track what you\'ve mastered, reading, and what\'s next.', wide:true },
            { icon:'🎵', name:'Ambient Focus', desc:'5 unique ambient tracks designed to trigger deep focus states while you read.' },
            { icon:'🔒', name:'Private Sanctuary', desc:'Your reading habits and notes are yours alone. A secure, focused environment for deep work.' },
            { icon:'🌐', name:'Global Community', desc:'Discuss ideas with intellectuals worldwide. Join book-specific rooms and share your perspectives.' },
          ].map((f,i) => (
            <div key={i} className="bcard" style={f.wide ? { gridColumn:'span 2' } : {}}>
              <span className="bicon">{f.icon}</span>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'1.18rem', color:'#f0ece4', marginBottom:'0.5rem' }}>{f.name}</div>
              <div style={{ fontSize:13, color:'#9a9488', lineHeight:1.78 }}>{f.desc}</div>
              <div style={{ fontSize:70, color:'#c9a84c', opacity:0.08, position:'absolute', bottom:-8, right:14, lineHeight:1, pointerEvents:'none', fontFamily:'Georgia,serif' }}>{i+1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AMBIENT MUSIC SECTION */}
      <div style={{ position:'relative', zIndex:10, margin:'0 5rem 5rem', padding:'3rem 3.5rem', background:'linear-gradient(135deg,rgba(201,168,76,0.07),transparent)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2rem', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:36, flexShrink:0 }}>
          {[10,22,36,18,28,14,26].map((h,i) => (
            <span key={i} className="wave-bar" style={{ height:h, animationDelay:`${i*0.15}s` }} />
          ))}
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontFamily:'Georgia,serif', fontSize:'1.35rem', color:'#c9a84c', marginBottom:5 }}>Ambient Focus Environment</h3>
          <p style={{ fontSize:13, color:'#9a9488', lineHeight:1.65 }}>5 curated soundscapes — Grand Library, Midnight Rain, Ancient Forest, Coastal Breeze, Cosmic Void — designed to activate your deep focus state.</p>
        </div>
        <div style={{ padding:'7px 18px', border:'1px solid rgba(201,168,76,0.4)', borderRadius:20, fontSize:11, color:'#c9a84c', letterSpacing:'0.1em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
          Now Playing
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ position:'relative', zIndex:10, padding:'4rem 5rem 8rem', textAlign:'center' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#c9a84c', marginBottom:'1rem' }}>Pricing</div>
        <h2 style={{ fontFamily:'Georgia,serif', fontSize:'clamp(2rem,4vw,3.4rem)', fontWeight:400, lineHeight:1.18, marginBottom:'1rem' }}>
          Begin <em style={{ fontStyle:'italic', color:'#c9a84c' }}>free</em>, upgrade when ready
        </h2>
        <p style={{ color:'#5a5650', fontSize:14, marginBottom:'3rem' }}>During beta — everything is free. Premium coming soon.</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'rgba(201,168,76,0.1)', maxWidth:860, margin:'0 auto' }}>
          <div className="pcard">
            <div style={{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'#5a5650', marginBottom:'1rem' }}>Free</div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:'3.5rem', color:'#f0ece4', lineHeight:1, marginBottom:4 }}>$0 <span style={{ fontSize:'1rem', color:'#9a9488' }}>/mo</span></div>
            <div style={{ fontSize:12, color:'#5a5650', marginBottom:'2rem' }}>Forever free during beta</div>
            <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10, marginBottom:'2rem' }}>
              {['90 free books','10 AI chats / 6h','5 ambient tracks','Reading shelf & notes','Community discussions'].map(item => (
                <li key={item} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#9a9488' }}>
                  <span style={{ color:'#c9a84c' }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <button onClick={onGuestLogin} className="btn-ghost" style={{ width:'100%' }}>Start Free</button>
          </div>
          <div className="pcard feat">
            <div style={{ position:'absolute', top:0, right:'2rem', background:'#c9a84c', color:'#06050a', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', padding:'5px 14px' }}>✦ Coming Soon</div>
            <div style={{ fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'#5a5650', marginBottom:'1rem' }}>Premium</div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:'3.5rem', color:'#f0ece4', lineHeight:1, marginBottom:4 }}>$9 <span style={{ fontSize:'1rem', color:'#9a9488' }}>/mo</span></div>
            <div style={{ fontSize:12, color:'#5a5650', marginBottom:'2rem' }}>Billed monthly</div>
            <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10, marginBottom:'2rem' }}>
              {['304+ books unlocked','Unlimited AI chat','8 Business AI Agents','Priority new releases','Early access to audio'].map(item => (
                <li key={item} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#9a9488' }}>
                  <span style={{ color:'#c9a84c' }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <button className="btn-primary" style={{ width:'100%', opacity:0.6, cursor:'not-allowed' }}>Coming Soon</button>
          </div>
        </div>
      </div>

      {/* LOGIN SECTION */}
      <div id="login-section" style={{ position:'relative', zIndex:10, padding:'4rem 5rem 8rem', display:'flex', justifyContent:'center' }}>
        <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} style={{ background:'rgba(19,18,26,0.6)', backdropFilter:'blur(30px)', border:'1px solid rgba(255,255,255,0.1)', padding:'3rem', borderRadius:'2rem', maxWidth:480, width:'100%', position:'relative' }}>
          <div style={{ position:'absolute', top:0, right:0, width:128, height:128, background:'rgba(201,168,76,0.1)', filter:'blur(48px)', borderRadius:'50%' }} />
          <h2 style={{ fontFamily:'Georgia,serif', fontSize:'2rem', color:'#f0ece4', marginBottom:'0.5rem' }}>Join the Elite</h2>
          <p style={{ color:'#9a9488', fontSize:14, marginBottom:'2rem' }}>Sign in to unlock your personal digital shelf and AI agents.</p>

          <form onSubmit={(e) => { e.preventDefault(); if(email) onLogin(email); }} style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1.5rem' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email Address"
              required
              style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'1.2rem 1.5rem', color:'#f0ece4', fontSize:14, fontFamily:'Georgia,serif' }}
            />
            <button type="submit" className="btn-primary" style={{ width:'100%', padding:'1.2rem' }}
              onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
              Enter Sanctuary {isHovered ? '→' : ''}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
            <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.05)' }} />
            <span style={{ fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'#5a5650' }}>Or connect with</span>
            <div style={{ flex:1, height:'0.5px', background:'rgba(255,255,255,0.05)' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
            <button onClick={onGoogleLogin} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'1rem', color:'#f0ece4', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontFamily:'Georgia,serif' }}>
              G
            </button>
            <button onClick={onGuestLogin} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'1rem', color:'#f0ece4', fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontFamily:'Georgia,serif' }}>
              👤 Guest
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <button onClick={onClearSession} style={{ background:'none', border:'none', color:'#5a5650', fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer' }}>Clear Session</button>
            <button onClick={onManualToken} style={{ background:'none', border:'none', color:'rgba(201,168,76,0.3)', fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', cursor:'pointer' }}>Manual Token Entry</button>
          </div>
        </motion.div>
      </div>

      {/* FEEDBACK */}
      <div id="feedback" style={{ position:'relative', zIndex:10, maxWidth:700, margin:'0 auto', padding:'0 2rem 8rem' }}>
        <div style={{ background:'rgba(19,18,26,0.6)', backdropFilter:'blur(30px)', border:'1px solid rgba(255,255,255,0.1)', padding:'3rem', borderRadius:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:'2rem' }}>
            <div style={{ width:48, height:48, borderRadius:12, background:'rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💬</div>
            <div>
              <h2 style={{ fontFamily:'Georgia,serif', fontSize:'1.5rem', color:'#f0ece4' }}>Share Your Wisdom</h2>
              <p style={{ color:'#9a9488', fontSize:13 }}>Help us shape the future of House of Books.</p>
            </div>
          </div>
          <form onSubmit={handleFeedbackSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What features would you like to see? Which books should we add next?" required style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'1.5rem', color:'#f0ece4', fontSize:13, fontFamily:'Georgia,serif', minHeight:150, resize:'none' }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:'#5a5650', textTransform:'uppercase', letterSpacing:'0.1em' }}>Anonymous & valued</span>
              <button type="submit" className="btn-primary">Send Feedback</button>
            </div>
          </form>
          {feedbackSent && (
            <div style={{ marginTop:'1rem', padding:'1rem', borderRadius:12, background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)', color:'#c9a84c', textAlign:'center', fontSize:14 }}>
              Thank you! Your feedback has been received. ✦
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ position:'relative', zIndex:10, borderTop:'1px solid rgba(255,255,255,0.05)', padding:'3rem 5rem', background:'rgba(6,5,10,0.8)', backdropFilter:'blur(24px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'2rem', marginBottom:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
            <div style={{ width:28, height:28, border:'1px solid #c9a84c', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>H</div>
            <span style={{ fontFamily:'Georgia,serif', fontSize:'1.1rem' }}>House of Books</span>
          </div>
          <div style={{ display:'flex', gap:'2rem', flexWrap:'wrap' }}>
            {['Library','Features','Pricing','Feedback'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link" style={{ fontSize:10, letterSpacing:'0.2em' }}>{item}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
          <p style={{ fontSize:10, color:'#5a5650', letterSpacing:'0.1em', textTransform:'uppercase' }}>© 2026 House of Books. All intellectual rights reserved.</p>
          <div style={{ display:'flex', gap:'2rem' }}>
            <a href="#" className="nav-link" style={{ fontSize:9, letterSpacing:'0.2em' }}>Privacy Policy</a>
            <a href="#" className="nav-link" style={{ fontSize:9, letterSpacing:'0.2em' }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
