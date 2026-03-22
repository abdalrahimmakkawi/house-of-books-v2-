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
                    <motion.div animate={{ x: isHovered ? 5 : 0 }}>
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </motion.button>
                </form>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={onGoogleLogin} className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-white text-xs font-bold transition-all uppercase tracking-widest">
                    Google
                  </button>
                  <button onClick={onGuestLogin} className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl text-white text-xs font-bold transition-all uppercase tracking-widest">
                    Guest
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
