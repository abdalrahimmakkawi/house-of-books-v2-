import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Text, MeshDistortMaterial, Sphere, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { Book as BookIcon, User, Mail, ArrowRight } from 'lucide-react';

const FloatingBook = ({ position, rotation, color }: { position: [number, number, number], rotation: [number, number, number], color: string }) => {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.position.y += Math.sin(state.clock.getElapsedTime() + position[0]) * 0.002;
      mesh.current.rotation.z += 0.001;
    }
  });
  return (<Float speed={2} rotationIntensity={0.5} floatIntensity={1}><mesh position={position} rotation={rotation} ref={mesh}><boxGeometry args={[1.2, 1.6, 0.2]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.8} /></mesh></Float>);
};

const Scene = () => {
  const books = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({ position: [(Math.random() - 0.5) * 15, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5 - 5] as [number, number, number], rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number], color: i % 2 === 0 ? '#f59e0b' : '#1e293b' })), []);
  return (<><ambientLight intensity={0.5} /><pointLight position={[10, 10, 10]} intensity={1.5} /><spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#f59e0b" />{books.map((book, i) => <FloatingBook key={i} {...book} />)}<Sphere args={[1, 64, 64]} position={[0, 0, -10]}><MeshDistortMaterial color="#f59e0b" attach="material" distort={0.4} speed={2} roughness={0} /></Sphere><OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} /></>);
};

interface LandingPageProps { onLogin: (email: string) => void; onGoogleLogin: () => void; onMagicLink: (email: string) => void; onGuestLogin: () => void; onManualToken: () => void; onClearSession: () => void; }

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onGoogleLogin, onMagicLink, onGuestLogin, onManualToken, onClearSession }) => {
  const [email, setEmail] = React.useState('');
  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans">
      <div className="absolute inset-0 z-0"><Canvas shadows dpr={[1, 2]}><PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} /><Scene /></Canvas></div>
      <div className="absolute inset-0 z-10 pointer-events-none"><div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" /><div className="absolute top-0 left-0 w-full h-full opacity-30 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" /></div>
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-4">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="text-left">
            <div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 bg-amber-accent/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-amber-accent/30"><BookIcon className="w-6 h-6 text-amber-accent" /></div><span className="text-amber-accent font-mono text-sm tracking-[0.3em] uppercase">House of Books</span></div>
            <h1 className="text-6xl lg:text-8xl font-bold text-white leading-[0.9] tracking-tighter mb-8">READING <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 italic serif">REIMAGINED</span></h1>
            <p className="text-xl text-gray-400 max-w-md leading-relaxed mb-12">Digital literature sanctuary. Organize, explore, and discuss in 3D.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease: "easeOut" }} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 lg:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <form onSubmit={(e) => { e.preventDefault(); onLogin(email); }} className="space-y-4 mb-8">
              <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-accent/50 transition-all" required /></div>
              <button type="submit" className="w-full bg-amber-accent hover:bg-amber-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">Continue <ArrowRight className="w-5 h-5" /></button>
            </form>
            <div className="grid grid-cols-2 gap-4 mb-8"><button onClick={onGoogleLogin} className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-white text-sm transition-all">Google</button><button onClick={onGuestLogin} className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-white text-sm transition-all">Guest</button></div>
            <div className="flex flex-col gap-2"><button onClick={onClearSession} className="text-[10px] text-gray-600 uppercase tracking-widest">Clear Session</button></div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
