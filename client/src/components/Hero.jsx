import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import PillButton from './ui/PillButton';

const WaveformCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let t = 0;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (let i = 0; i < 5; i++) {
        const radius = 200 + i * 120 + Math.sin(t * 0.005 + i) * 50;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 - i * 0.012})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      t += 1;
      animationFrameId = window.requestAnimationFrame(render);
    };
    render();
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" />;
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 bg-black">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=2670&auto=format&fit=crop" 
          alt="Studio Mic" 
          className="w-full h-full object-cover opacity-20 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="mesh-gradient-1" />
        <div className="mesh-gradient-2" />
      </div>

      <WaveformCanvas />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-6xl mx-auto">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
           className="flex flex-col items-center"
        >
          <motion.span 
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
             className="text-white/40 font-bold text-[12px] md:text-[14px] tracking-[0.4em] uppercase mb-8"
          >
            Southeast Asia's Cinematic Karaoke Studio
          </motion.span>
          
          <motion.h1 
             initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
             className="LuxeFont text-7xl md:text-[120px] lg:text-[140px] leading-[0.9] text-white tracking-tighter mb-4"
          >
             Sing Like <br/>
             <span className="text-gradient-apple py-2">Forever.</span>
          </motion.h1>
          
          <motion.p 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
             className="text-lg md:text-xl text-white/50 max-w-[640px] mb-12 leading-relaxed font-medium tracking-tight"
          >
            Experience Phnom Penh's only 4K recording studio fused with a music-lover's coffee shop. Pro-grade audio. Star-tier visuals.
          </motion.p>

          <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
             className="flex flex-col sm:flex-row items-center gap-6"
          >
            <PillButton variant="primary" className="py-5 px-10 text-[16px]">
              Book Your Session
            </PillButton>
            <PillButton variant="ghost" className="py-5 px-10 text-[16px]">
              Explore the Venue
            </PillButton>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-10 z-20 text-white/20"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <ChevronDown size={32} />
      </motion.div>
    </section>
  );
}
