import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, MeshDistortMaterial, Sphere, OrbitControls, Stars, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book as BookIcon, 
  User, 
  Mail, 
  ArrowRight, 
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

// Abstract Scene with Particles and Lighting
const Scene = () => {
  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#c9a84c" />
      <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={3} color="#c9a84c" castShadow />
      
      <Sphere args={[1.5, 64, 64]} position={[0, 0, -12]}>
        <MeshDistortMaterial
          color="#c9a84c"
          attach="material"
          distort={0.5}
          speed={1.5}
          roughness={0.1}
          metalness={1}
        />
      </Sphere>

      <ContactShadows position={[0, -10, 0]} opacity={0.4} scale={40} blur={2} far={10} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.2} />
    </>
  );
};

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
  onMagicLink, 
  onGuestLogin, 
  onManualToken, 
  onClearSession 
}) => {
  const [email, setEmail] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      console.log('Feedback submitted:', feedback);
      setFeedbackSent(true);
      setFeedback('');
      setTimeout(() => setFeedbackSent(false), 3000);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0a0a0f] overflow-x-hidden font-sans selection:bg-[#c9a84c] selection:text-[#0a0a0f]">
      {/* 3D Background Layer */}
      <div className="fixed inset-0 z-0">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
          <Scene />
        </Canvas>
      </div>

      {/* Atmospheric Overlays */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-transparent to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,168,76,0.05)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 flex justify-between items-center backdrop-blur-md bg-[#0a0a0f]/20 border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-[#c9a84c] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(201,168,76,0.3)]">
            <BookIcon className="w-5 h-5 text-[#0a0a0f]" />
          </div>
          <span className="text-white font-serif text-xl font-bold tracking-tight">House of Books</span>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden md:flex items-center gap-8"
        >
          {['Library', 'AI Agents', 'Solution', 'Feedback'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-[11px] uppercase tracking-[0.2em] text-[#9896a4] hover:text-[#c9a84c] transition-colors">{item}</a>
          ))}
          <button 
            onClick={onGuestLogin}
            className="px-6 py-2 border border-[rgba(201,168,76,0.2)] rounded-full text-[11px] uppercase tracking-widest text-white hover:bg-white/5 transition-all"
          >
            Guest Access
          </button>
        </motion.div>
      </nav>

      {/* Main Content */}
      <div className="relative z-20 pt-32 pb-20 px-6 lg:px-20">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center min-h-[80vh]">
          
          {/* Hero Section (Left) */}
          <div className="lg:col-span-7 text-left">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 mb-8">
                <Sparkles className="w-3 h-3 text-[#c9a84c]" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c9a84c] font-bold">The Ultimate Digital Sanctuary</span>
              </div>
              
              <h1 className="text-7xl lg:text-[110px] font-bold text-white leading-[0.85] tracking-tighter mb-8">
                WISDOM <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#f5d17a] italic font-serif font-light">DISTILLED</span>
              </h1>
              
              <p className="text-xl text-[#9896a4] max-w-xl leading-relaxed mb-12 font-light">
                House of Books is a premium platform for the modern intellectual. We leverage state-of-the-art AI to summarize, analyze, and discuss the world's most impactful literature in an immersive 3D environment.
              </p>

              <div className="flex flex-wrap gap-10 items-center mb-16">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-3xl">304</span>
                  <span className="text-[#c9a84c] text-[10px] uppercase tracking-[0.2em] mt-1 font-black">Masterpieces</span>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-3xl">90</span>
                  <span className="text-[#c9a84c] text-[10px] uppercase tracking-[0.2em] mt-1 font-black">Free Books</span>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-white font-bold text-3xl">Coming</span>
                  <span className="text-[#5f5d6b] text-[10px] uppercase tracking-[0.2em] mt-1">More Books Soon</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5 text-[#c9a84c]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                      Audio Summaries
                      <span className="text-[8px] bg-[#c9a84c]/20 text-[#c9a84c] px-1.5 py-0.5 rounded-md uppercase tracking-widest">Soon</span>
                    </h3>
                    <p className="text-[#5f5d6b] text-xs leading-relaxed">Listen to high-quality AI-narrated summaries on the go.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-[#c9a84c]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                      Premium Features
                      <span className="text-[8px] bg-[#c9a84c]/20 text-[#c9a84c] px-1.5 py-0.5 rounded-md uppercase tracking-widest">Soon</span>
                    </h3>
                    <p className="text-[#5f5d6b] text-xs leading-relaxed">Unlimited AI chats, exclusive agents, and early book access.</p>
                  </div>
                </div>
              </div>

              {/* Install Buttons */}
              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-3 bg-black border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5 transition-all group">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] uppercase tracking-widest text-[#5f5d6b]">Download on the</p>
                    <p className="text-white font-bold text-sm leading-none">App Store</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 bg-black border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5 transition-all group">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L18.66,14.05C20.44,13.03 20.44,10.97 18.66,9.95L16.81,8.88L14.89,12L16.81,15.12M4.96,2.67L13.69,11.4L15.61,9.48L5.76,3.83C5.5,3.68 5.23,3.61 4.96,3.61C4.96,3.61 4.96,3.61 4.96,2.67M13.69,12.6L4.96,21.33C4.96,20.39 4.96,20.39 4.96,20.39C5.23,20.39 5.5,20.32 5.76,20.17L15.61,14.52L13.69,12.6Z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[8px] uppercase tracking-widest text-[#5f5d6b]">Get it on</p>
                    <p className="text-white font-bold text-sm leading-none">Google Play</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Login Card (Right) */}
          <div className="lg:col-span-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-[#c9a84c]/10 blur-3xl rounded-[3rem] -z-10" />
              
              <div className="bg-[#13121a]/60 backdrop-blur-3xl border border-white/10 p-10 lg:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a84c]/10 blur-3xl rounded-full" />
                
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Join the Elite</h2>
                <p className="text-[#9896a4] text-sm mb-10">Sign in to unlock your personal digital shelf and AI agents.</p>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    onLogin(email);
                  }} 
                  className="space-y-5 mb-8"
                >
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f5d6b] group-focus-within:text-[#c9a84c] transition-colors" />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-[#5f5d6b] focus:outline-none focus:border-[#c9a84c]/50 transition-all"
                      required
                    />
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="w-full bg-[#c9a84c] text-[#0a0a0f] font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_rgba(201,168,76,0.2)]"
                  >
                    Enter Sanctuary
                    <motion.div
                      animate={{ x: isHovered ? 5 : 0 }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </motion.button>
                </form>

                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em]">
                    <span className="px-4 bg-[#13121a] text-[#5f5d6b]">Or connect with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={onGoogleLogin}
                    className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-white text-xs font-bold transition-all uppercase tracking-widest"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </button>
                  <button 
                    onClick={onGuestLogin}
                    className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-white text-xs font-bold transition-all uppercase tracking-widest"
                  >
                    <User className="w-4 h-4" />
                    Guest
                  </button>
                </div>
                
                <div className="mt-8 flex flex-col gap-2 items-center">
                  <button 
                    onClick={onClearSession}
                    className="text-[9px] text-[#5f5d6b] hover:text-[#c9a84c] transition-colors uppercase tracking-[0.3em]"
                  >
                    Clear Session
                  </button>
                  <button 
                    onClick={onManualToken}
                    className="text-[9px] text-[#c9a84c]/30 hover:text-[#c9a84c]/60 transition-colors uppercase tracking-[0.3em]"
                  >
                    Manual Token Entry
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* The Problem & Solution Section */}
        <div id="solution" className="max-w-7xl w-full mx-auto mt-48">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-serif font-bold text-white mb-6">The Modern Reading Crisis</h2>
            <p className="text-[#9896a4] max-w-2xl mx-auto font-light">In an age of infinite information, we suffer from shallow understanding. House of Books is the antidote.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl mb-2">No Time to Read?</h3>
                  <p className="text-[#5f5d6b] text-sm leading-relaxed">The average non-fiction book takes 8 hours to read. Most people never finish. We distill those 8 hours into 15 minutes of high-impact wisdom.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl mb-2">Information Overload?</h3>
                  <p className="text-[#5f5d6b] text-sm leading-relaxed">Reading without retention is a waste. Our AI interactive summaries ensure you internalize mental models, not just facts.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl mb-2">Passive Learning?</h3>
                  <p className="text-[#5f5d6b] text-sm leading-relaxed">Traditional books are one-way. House of Books lets you talk back. Chat with any author's ideas through our specialized AI agents.</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-10 bg-[#c9a84c]/5 blur-[100px] rounded-full" />
              <div className="bg-[#13121a]/80 border border-white/10 p-12 rounded-[3rem] relative backdrop-blur-3xl">
                <h3 className="text-[#c9a84c] font-serif text-3xl mb-8 italic">"The solution isn't more information, it's better distillation."</h3>
                <div className="space-y-4">
                  {[
                    'AI-Powered Book Distillation',
                    'Interactive Author Chatbots',
                    'Immersive Ambient Focus Environment',
                    'Curated Library of 304+ Masterpieces',
                    'Personalized Reading Shelves'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-white/80 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#c9a84c]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Inside the App Section */}
        <div id="library" className="max-w-7xl w-full mx-auto mt-48">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-serif font-bold text-white mb-6">Inside the Sanctuary</h2>
            <p className="text-[#9896a4] max-w-2xl mx-auto font-light">A suite of features designed for deep work, rapid learning, and intellectual growth.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap />, title: 'AI Distillation', desc: 'Transform 300+ pages into 15 minutes of pure wisdom. Our AI extracts the core mental models and actionable insights.' },
              { icon: <Bot />, title: 'AI Author Chat', desc: 'Don\'t just read—converse. Ask questions to the book\'s core logic and get instant, context-aware answers.' },
              { icon: <Library />, title: 'Digital Shelf', desc: 'Organize your intellectual journey. Track what you\'ve mastered, what you\'re reading, and what\'s next.' },
              { icon: <Music />, title: 'Ambient Focus', desc: 'Immerse yourself in 5 unique ambient tracks designed to trigger deep focus states while you read.' },
              { icon: <Shield />, title: 'Private Sanctuary', desc: 'Your reading habits and notes are yours alone. We provide a secure, focused environment for deep work.' },
              { icon: <Globe />, title: 'Global Community', desc: 'Discuss ideas with intellectuals worldwide. Join book-specific rooms and share your unique perspectives.' }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-[#13121a]/40 border border-white/5 backdrop-blur-md hover:border-[#c9a84c]/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center text-[#c9a84c] mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-xl mb-4">{feature.title}</h3>
                <p className="text-[#9896a4] text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feedback Section */}
        <div id="feedback" className="max-w-3xl w-full mx-auto mt-48 p-10 rounded-[3rem] bg-[#13121a]/60 border border-white/10 backdrop-blur-3xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#c9a84c]/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#c9a84c]" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-white">Share Your Wisdom</h2>
              <p className="text-[#9896a4] text-sm">Help us shape the future of House of Books.</p>
            </div>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-6">
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What features would you like to see? Which books should we add next?"
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white placeholder:text-[#5f5d6b] focus:outline-none focus:border-[#c9a84c]/50 transition-all min-h-[150px] resize-none"
              required
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#5f5d6b] uppercase tracking-widest">Your feedback is anonymous and highly valued.</p>
              <button 
                type="submit"
                className="px-8 py-3 bg-[#c9a84c] text-[#0a0a0f] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(201,168,76,0.2)]"
              >
                Send Feedback
              </button>
            </div>
          </form>

          <AnimatePresence>
            {feedbackSent && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-4 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] text-center text-sm font-bold"
              >
                Thank you! Your feedback has been received.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 pt-20 pb-10 px-6 lg:px-20 border-t border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="max-w-7xl w-full mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center">
                <BookIcon className="w-4 h-4 text-[#0a0a0f]" />
              </div>
              <span className="text-white font-serif text-lg font-bold tracking-tight">House of Books</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8">
              {['Library', 'AI Agents', 'Solution', 'Feedback'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-[10px] uppercase tracking-[0.2em] text-[#5f5d6b] hover:text-[#c9a84c] transition-colors">{item}</a>
              ))}
            </div>

            <div className="flex gap-4">
              <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#5f5d6b] hover:text-[#c9a84c] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.56v.01c-.88.39-1.83.65-2.82.77 1.02-.61 1.8-1.58 2.17-2.73-.95.56-2.01.97-3.13 1.19-.9-.96-2.17-1.56-3.59-1.56-2.72 0-4.92 2.2-4.92 4.92 0 .39.04.76.13 1.12-4.09-.21-7.71-2.17-10.14-5.15-.42.73-.67 1.58-.67 2.48 0 1.71.87 3.21 2.19 4.1-.8-.03-1.56-.25-2.22-.61v.06c0 2.38 1.7 4.37 3.94 4.82-.41.11-.85.17-1.29.17-.32 0-.63-.03-.93-.09.63 1.95 2.44 3.37 4.58 3.41-1.68 1.31-3.79 2.09-6.09 2.09-.4 0-.79-.02-1.18-.07 2.17 1.39 4.75 2.21 7.51 2.21 9.01 0 13.94-7.46 13.94-13.94 0-.21 0-.42-.01-.63.96-.69 1.79-1.56 2.45-2.54z"/></svg>
              </button>
              <button className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#5f5d6b] hover:text-[#c9a84c] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.337 2.618 6.78 6.98 6.98 1.281.058 1.689.073 4.948.073s3.667-.014 4.947-.072c4.337-.2 6.78-2.618 6.98-6.98.058-1.281.072-1.689.072-4.948s-.014-3.667-.072-4.947c-.2-4.337-2.618-6.78-6.98-6.98-1.281-.058-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] text-[#5f5d6b] uppercase tracking-widest">© 2026 House of Books. All intellectual rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="text-[9px] text-[#5f5d6b] hover:text-white transition-colors uppercase tracking-[0.2em]">Privacy Policy</a>
              <a href="#" className="text-[9px] text-[#5f5d6b] hover:text-white transition-colors uppercase tracking-[0.2em]">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span className="text-[9px] uppercase tracking-[0.4em] text-[#5f5d6b]">Discover More</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown className="w-4 h-4 text-[#5f5d6b]" />
        </motion.div>
      </motion.div>

      {/* Background Ambient Glows */}
      <div className="fixed top-1/4 -left-20 w-96 h-96 bg-[#c9a84c]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 -right-20 w-96 h-96 bg-[#c9a84c]/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
};
