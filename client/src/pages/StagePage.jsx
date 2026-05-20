import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { Layout, Tv, Settings } from 'lucide-react';

/** 
 * VIBE SESSIONS KARAOKE — CINEMATIC STAGE DISPLAY
 * Production-Level Broadcast Experience
 */

const ST = {
  IDLE: 'idle',
  STINGER: 'stinger',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing'
};

const DEMO_QUEUE = [
  { id: 1, singerName: "Sarah K.",  title: "Bohemian Rhapsody", artist: "Queen", videoId: "fJ9rUzIMcZQ" },
  { id: 2, singerName: "Dara M.",   title: "Blinding Lights",   artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
  { id: 3, singerName: "James T.",  title: "Shallow",           artist: "Lady Gaga", videoId: "bo_efYhYU2A" },
  { id: 4, singerName: "Mia L.",    title: "Someone Like You",  artist: "Adele", videoId: "hLQl3WQQoQ0" },
  { id: 5, singerName: "Alex R.",   title: "Levitating",        artist: "Dua Lipa", videoId: "TUVcZfQe-Kw" },
];

// --- ATMOSPHERE COMPONENTS ---

const Atmo = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#04020a] z-0">
    {/* Layer 1: Animated Mesh Gradients */}
    <div className="absolute inset-0 opacity-55">
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 20% 80%, #4c1d95 0%, transparent 50%), radial-gradient(circle at 80% 20%, #db2777 0%, transparent 50%), radial-gradient(circle at 50% 50%, #7c3aed 0%, transparent 60%)',
          animation: 'meshA 12s ease-in-out infinite'
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 70% 80%, #9d174d 0%, transparent 50%), radial-gradient(circle at 10% 20%, #5b21b6 0%, transparent 50%)',
          animation: 'meshB 15s ease-in-out infinite'
        }}
      />
    </div>

    {/* Layer 2: Perspective Grid */}
    <div className="perspective-grid absolute inset-0 z-1" />

    {/* Layer 3: SVG Noise */}
    <div className="absolute inset-0 z-2 opacity-[0.04]">
      <svg width="100%" height="100%">
        <filter id="nf">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#nf)"/>
      </svg>
    </div>

    {/* Layer 4: Scanlines */}
    <div className="scanlines absolute inset-0 z-3 pointer-events-none" />

    {/* Layer 6: Radial Vignette */}
    <div className="radial-vignette absolute inset-0 z-5 pointer-events-none" />
  </div>
);

const Particles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrame;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.4 + Math.random() * 2,
      speed: 0.2 + Math.random() * 0.8,
      drift: (Math.random() - 0.5) * 0.2,
      opacity: 0.1 + Math.random() * 0.5,
      hue: Math.random() > 0.5 ? 280 : 320
    }));

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity * (p.y / h)})`;
        ctx.fill();
      });
      animationFrame = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-4 pointer-events-none" />;
};

const Waveform = ({ active = true, colorStart = '#8b5cf6', colorEnd = '#ec4899' }) => {
  const canvasRef = useRef(null);
  const bars = 56;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrame;
    let t = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!active) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      const barWidth = w / bars;
      for (let i = 0; i < bars; i++) {
        const value = Math.abs(Math.sin(t * 0.045 + i * 0.38) * Math.cos(t * 0.022 + i * 0.19));
        const barHeight = value * h * 0.75 + 3;
        
        ctx.beginPath();
        const r = 2;
        const x = i * barWidth + 2;
        const y = (h - barHeight) / 2;
        
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth - 4, barHeight, 2);
        } else {
          // Manual rounded rect fallback
          const width = barWidth - 4;
          const height = barHeight;
          const radius = 2;
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        
        const alpha = 0.25 + value * 0.75;
        // Interpolate color
        const ratio = i / bars;
        ctx.fillStyle = ratio < 0.5 ? colorStart : colorEnd;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      t++;
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [active, colorStart, colorEnd]);

  return <canvas ref={canvasRef} width={360} height={44} className="mx-auto" />;
};

// --- SCREENS ---

const IdleScreen = ({ nextPerformer, queue = [], onStart, settings }) => {
  const [mode, setMode] = useState(0); // 0: Branding, 1: Promo

  useEffect(() => {
    const interval = setInterval(() => {
      setMode(m => (m + 1) % 2);
    }, 12000); // Rotate every 12 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center text-center p-6 space-y-12 w-full max-w-5xl"
    >
      <AnimatePresence mode="wait">
        {mode === 0 ? (
          <motion.div 
            key="branding" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <span className="font-syne text-[11px] font-bold uppercase tracking-[0.45em] animate-[labelGlow_3s_infinite]">
              {settings?.businessName || 'Vibe Sessions Karaoke'}
            </span>
            <h1 className="LuxeFont text-gradient-broadcast text-[clamp(60px,11vw,128px)] leading-none -tracking-[0.02em]">
              The Stage <br/> is Yours.
            </h1>
            <div className="w-20 h-[1px] mx-auto bg-gradient-to-r from-transparent via-[#db2777] to-transparent shadow-[0_0_10px_rgba(217,70,239,0.5)] animate-[pulse_2.5s_infinite]" />
          </motion.div>
        ) : (
          <motion.div 
            key="promo" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <span className="font-syne text-[11px] font-bold uppercase tracking-[0.45em] text-[#db2777]">
              Special Announcement
            </span>
            <h2 className="LuxeFont text-[#F8F4FF] text-[clamp(32px,6vw,64px)] leading-tight max-w-3xl mx-auto drop-shadow-[0_0_30px_rgba(217,70,239,0.3)]">
              {settings?.promoText || 'Welcome to the ultimate cinematic karaoke experience.'}
            </h2>
            <div className="w-16 h-[1px] mx-auto bg-[#8b5cf6]/30" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="opacity-45">
        <Waveform />
      </div>

      {nextPerformer && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card-stage px-12 py-8 space-y-3 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D946EF]/40 to-transparent" />
          <span className="font-syne text-[10px] text-[#db2777]/85 uppercase tracking-[0.4em]">Up next</span>
          <h2 className="LuxeFont text-[#F8F4FF] text-[clamp(28px,4.5vw,42px)]">{nextPerformer.singerName}</h2>
          <p className="font-dm text-[clamp(14px,2.2vw,19px)] text-[#7c6f9a]/85 font-medium tracking-wide">
            {nextPerformer.title} <span className="text-[#8b5cf6]/50 mx-2">&bull;</span> {nextPerformer.artist}
          </p>
        </motion.div>
      )}

      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={onStart}
        className="px-12 py-4.5 bg-gradient-to-r from-[#8b5cf6] via-[#d946ef] to-[#ec4899] rounded-full shadow-[0_0_40px_rgba(217,70,239,0.4)] text-white font-syne text-[12px] font-bold uppercase tracking-[0.3em] active:shadow-none transition-shadow"
      >
        Start Show
      </motion.button>

      {queue.length > 1 && (
        <div className="flex gap-3 justify-center">
          {queue.slice(1, 5).map((p, i) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#7c6f9a] font-dm text-[11px] backdrop-blur-sm"
            >
              <span className="text-[#db2777]/60 mr-2">#{i + 2}</span>
              {p.singerName}
            </motion.div>
          ))}
          {queue.length > 5 && (
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#7c6f9a]/40 font-dm text-[11px]">
              +{queue.length - 5} more
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

const Stinger = ({ current, onComplete }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 50);   // Close
    const timer2 = setTimeout(() => setPhase(2), 570);  // Reveal content
    const timer3 = setTimeout(() => setPhase(3), 2670); // Hold for 2.1s
    const timer4 = setTimeout(() => onComplete(), 3220); // Open & Done

    return () => {
      clearTimeout(timer1); clearTimeout(timer2);
      clearTimeout(timer3); clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* Phase 1: Curtains */}
      <motion.div 
        className="absolute top-0 left-0 w-[55%] h-full bg-[#04020a] z-51"
        initial={{ x: '-100%' }}
        animate={{ x: phase >= 1 && phase < 3 ? '0%' : '-100%' }}
        transition={{ duration: 0.52, ease: [0.76, 0, 0.24, 1] }}
      />
      <motion.div 
        className="absolute top-0 right-0 w-[55%] h-full bg-[#04020a] z-51"
        initial={{ x: '100%' }}
        animate={{ x: phase >= 1 && phase < 3 ? '0%' : '100%' }}
        transition={{ duration: 0.52, ease: [0.76, 0, 0.24, 1] }}
      />

      {/* Phase 2: Slash & Content */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div className="relative z-[52] w-full max-w-4xl text-center px-6">
            <motion.div 
              className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] 20%-[#D946EF] 50%-[#EC4899] 80% to-transparent shadow-[0_0_15px_rgba(217,70,239,0.9)]"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }}
              transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="relative z-53 py-16 space-y-6"
            >
              {/* L-Brackets */}
              <div className="absolute top-0 left-0 w-9 h-9 border-t-2 border-l-2 border-[#8b5cf6]/45" />
              <div className="absolute top-0 right-0 w-9 h-9 border-t-2 border-r-2 border-[#8b5cf6]/45" />
              <div className="absolute bottom-0 left-0 w-9 h-9 border-b-2 border-l-2 border-[#8b5cf6]/45" />
              <div className="absolute bottom-0 right-0 w-9 h-9 border-b-2 border-r-2 border-[#8b5cf6]/45" />

              <span className="font-syne text-[11px] text-[#db2777] uppercase tracking-[0.4em]">Now Performing</span>
              <h1 className="LuxeFont text-gradient-broadcast text-[clamp(52px,9vw,112px)] leading-none filter drop-shadow-[0_0_40px_rgba(236,72,153,0.5)]">
                {current.singerName}
              </h1>
              <div className="w-16 h-[1px] mx-auto bg-gradient-to-r from-transparent via-[#db2777] to-transparent" />
              <div>
                <p className="font-dm text-[clamp(15px,2.5vw,24px)] text-[#f8f4ff]/80 font-medium tracking-wide">{current.title}</p>
                <p className="font-dm text-[clamp(12px,1.8vw,17px)] text-[#7c6f9a] mt-2">{current.artist}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Countdown = ({ current, onComplete }) => {
  const count = current.timeLeft !== undefined ? current.timeLeft : 15;
  const [totalDuration] = useState(current.timeLeft || 15);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 180);
    return () => clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
    }
  }, [count, onComplete]);

  const dasharray = 2 * Math.PI * 90;
  const dashoffset = dasharray - (count / totalDuration) * dasharray;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-6 space-y-12"
    >
      <div className="text-center space-y-4">
        <span className="font-syne text-[11px] font-bold uppercase tracking-[0.45em] animate-[labelGlow_3s_infinite]">Next Up</span>
        <h1 className="LuxeFont text-gradient-broadcast text-[clamp(42px,8vw,88px)] leading-tight">{current.singerName}</h1>
        <div>
           <p className="font-syne text-[clamp(15px,2.5vw,24px)] text-[#f8f4ff]/75 tracking-wider uppercase">{current.title}</p>
           <p className="font-dm text-[clamp(12px,1.8vw,17px)] text-[#7c6f9a]">{current.artist}</p>
        </div>
      </div>

      <div className="w-1 w-[12px] bg-gradient-to-r from-transparent via-[#db2777] to-transparent" />

      <div className="relative w-[clamp(160px,22vw,210px)] aspect-square">
        <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
          <circle cx="110" cy="110" r="90" className="stroke-[#8b5cf6]/10 fill-none" strokeWidth="3" />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          <motion.circle 
            cx="110" cy="110" r="90" 
            className="stroke-[url(#ringGradient)] fill-none shadow-[0_0_8px_rgba(217,70,239,0.8)]" 
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={dasharray}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className={`LuxeFont text-[clamp(64px,10vw,110px)] transition-all duration-150 ${flash ? 'text-white scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]' : 'text-gradient-broadcast'}`}
          >
            {Math.max(0, count)}
          </span>
          <span className="font-syne text-[10px] text-[#7c6f9a]/70 uppercase tracking-[0.2em] -mt-2">sec</span>
        </div>
      </div>

      <div className={`transition-all duration-800 text-center ${count <= 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
         <p className="LuxeFont italic text-[clamp(18px,3vw,30px)] text-[#f8f4ff]/85">
           {count > 5 ? "Grab the mic — show us what you got!" : "It's your moment. Own it."}
         </p>
         {count <= 10 && <div className="mt-8 opacity-50"><Waveform /></div>}
      </div>
    </motion.div>
  );
};

const NPBar = ({ current, queue = [] }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-20 bg-gradient-to-t from-[#040210/98] via-[#040210/70] to-transparent p-4 px-8 flex items-center gap-6">
       <div className="flex gap-1 h-4 items-end">
          {[1, 2, 3].map(i => (
            <motion.div 
               key={i}
               className="w-[3px] rounded-sm bg-gradient-to-t from-[#8B5CF6] to-[#EC4899]"
               animate={{ height: [5, 16, 5] }}
               transition={{ duration: [1, 1.4, 1.1][i-1], repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
       </div>
       <span className="font-syne text-[10px] text-[#db2777]/85 tracking-[0.3em] uppercase">LIVE</span>
       <div className="w-[1px] h-6 bg-[#8b5cf6]/20" />
       
       <div className="flex-1 min-w-0">
          <span className="block font-dm text-[11px] text-[#7c6f9a]/60 flex items-center">Performing</span>
          <div className="flex items-center gap-3">
             <span className="font-syne font-semibold text-white/90 truncate">{current?.singerName}</span>
             <span className="font-dm text-sm text-white/40 truncate">{current?.title} — {current?.artist}</span>
          </div>
       </div>

       <div className="flex gap-2">
          {queue.slice(0, 3).map((p, i) => (
            <div key={p.id} className="px-3 py-1 bg-white/5 border border-white/7 rounded-full text-[#7c6f9a] text-[10px]">
               {p.singerName}
            </div>
          ))}
          {queue.length > 3 && (
            <span className="font-syne text-[10px] text-[#7c6f9a]/60 flex items-center">+{queue.length - 3}</span>
          )}
       </div>

       <span className="font-syne text-[10px] text-white/20 tracking-[0.25em] uppercase">Vibe Sessions</span>
    </div>
  );
}

const PlayingScreen = ({ current, queue = [], onEnded, showHUD, settings }) => {
  const playerRef = useRef(null);

  useEffect(() => {
    // YouTube API Load
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player-stage', {
        videoId: current.videoId,
        playerVars: { 
          autoplay: 1, 
          controls: 0, 
          disablekb: 1, 
          fs: 0, 
          modestbranding: 1, 
          rel: 0, 
          iv_load_policy: 3 
        },
        events: {
          onReady: (e) => e.target.playVideo(),
          onStateChange: (e) => {
             if (e.data === 0) onEnded(); // Song ended
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
    };
  }, [current.videoId, onEnded]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative w-full h-full flex flex-col items-center justify-center p-6"
    >
      {/* YouTube Player Layer */}
      <div className="absolute inset-0 z-7 bg-black overflow-hidden">
         <div id="yt-player-stage" className="w-full h-full pointer-events-none scale-[1.05]" />
         <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black via-transparent to-black" />
      </div>

      {/* Ghost Watermark */}
      <motion.div 
        animate={{ opacity: showHUD ? 0.1 : 0 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 z-[8] pointer-events-none select-none flex items-center justify-center"
      >
        <h2 className="LuxeFont text-[clamp(80px,14vw,180px)] text-transparent" style={{ WebkitTextStroke: '1px rgba(248, 244, 255, 0.15)' }}>
          {current.singerName}
        </h2>
      </motion.div>

      <motion.div 
        animate={{ 
          opacity: showHUD ? 1 : 0, 
          y: showHUD ? 0 : -40,
          scale: showHUD ? 1 : 0.9 
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="glass-card-stage z-10 p-10 md:p-16 max-w-[min(580px,88vw)] w-full text-center space-y-6 pointer-events-none"
      >
        <span className="font-syne text-[10px] uppercase tracking-[0.4em] animate-[labelGlow_3s_infinite]">Now Performing</span>
        <h1 className="LuxeFont text-gradient-broadcast text-[clamp(40px,7.5vw,88px)] leading-[1.05] tracking-tight">{current.singerName}</h1>
        <div className="w-16 h-[1px] mx-auto bg-gradient-to-r from-transparent via-[#db2777] to-transparent shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
        <div className="space-y-1">
          <p className="font-syne text-[clamp(15px,2.2vw,24px)] text-[#f8f4ff]/80 tracking-wide">{current.title}</p>
          <p className="font-dm text-[clamp(12px,1.6vw,17px)] text-[#7c6f9a]">{current.artist}</p>
        </div>
        <div className="opacity-70 pt-4">
          <Waveform active={true} />
        </div>
      </motion.div>

      <motion.div 
        animate={{ opacity: showHUD ? 1 : 0 }}
        transition={{ delay: showHUD ? 0.8 : 0, duration: 0.5 }}
        className="mt-8 text-[#7c6f9a]/60 font-syne text-[11px] uppercase tracking-[0.2em] flex items-center gap-2"
      >
        Next Singer <span className="animate-pulse">&rarr;</span>
      </motion.div>

      {/* Rolling Promotional slogan ticker */}
      {settings?.promoText && (
        <div className="fixed bottom-[96px] left-0 w-full z-20 overflow-hidden bg-black/40 border-y border-white/5 backdrop-blur-md py-2.5 shadow-2xl">
          <div className="marquee-container">
            <div className="marquee-content flex gap-32 text-[10px] font-syne font-bold uppercase tracking-[0.45em] text-[#D946EF] drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">
               <span>{settings.promoText}</span>
               <span>{settings.promoText}</span>
               <span>{settings.promoText}</span>
               <span>{settings.promoText}</span>
               <span>{settings.promoText}</span>
               <span>{settings.promoText}</span>
            </div>
          </div>
        </div>
      )}

      <NPBar current={current} queue={queue} />
    </motion.div>
  );
};

// --- MAIN COMPONENT ---

export default function StagePage() {
  const [stage, setStage] = useState(ST.IDLE);
  const [realQueue, setRealQueue] = useState([]);
  const [realCurrent, setRealCurrent] = useState(null);
  const [realPrep, setRealPrep] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [settings, setSettings] = useState(null);

  const inactivityTimerRef = useRef(null);
  const lastPrepIdRef = useRef(null);

  // Sync Logic (Socket.io)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';

    const updateStateFromData = (data) => {
      setRealQueue(data.queue || []);
      setRealCurrent(data.currentSong || null);
      setRealPrep(data.currentPrep || null);

      if (data.currentSong) {
        setIsDemoMode(false);
        setStage(ST.PLAYING);
      } else if (data.currentPrep) {
        setIsDemoMode(false);
        const songId = data.currentPrep?.song?.id;
        if (songId && lastPrepIdRef.current !== songId) {
          lastPrepIdRef.current = songId;
          setStage(ST.STINGER);
        } else {
          setStage(prev => (prev === ST.COUNTDOWN || prev === ST.STINGER) ? prev : ST.COUNTDOWN);
        }
      } else {
        if (!isDemoMode) {
          setStage(ST.IDLE);
        }
      }
    };

    // Initial State Fetch
    fetch(`/api/state?room=${roomID}`)
      .then(res => res.json())
      .then(data => updateStateFromData(data))
      .catch(err => console.warn('[Stage State Init] error:', err));

    // Settings Fetch
    fetch(`/api/settings?room=${roomID}`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.warn('[Stage Settings Init] error:', err));

    const onQueueUpdated = ({ queue: newQueue, currentSong: cs, currentPrep: cp }) => {
      setRealQueue(newQueue || []);
      if (cs) {
        setIsDemoMode(false);
        setRealCurrent(cs);
        setStage(ST.PLAYING);
      }
      if (cp) {
        setIsDemoMode(false);
        setRealPrep(cp);
        const songId = cp?.song?.id;
        if (songId && lastPrepIdRef.current !== songId) {
          lastPrepIdRef.current = songId;
          setStage(ST.STINGER);
        } else {
          setStage(prev => (prev === ST.COUNTDOWN || prev === ST.STINGER) ? prev : ST.COUNTDOWN);
        }
      }
      if (!cs && !cp && (!newQueue || newQueue.length === 0)) {
        setRealCurrent(null);
        setRealPrep(null);
        if (!isDemoMode) {
          setStage(ST.IDLE);
        }
      }
    };

    const onSongPrep = ({ currentPrep, queue: q }) => {
      setIsDemoMode(false);
      setRealPrep(currentPrep);
      setRealCurrent(null);
      if (q) setRealQueue(q);
      
      const songId = currentPrep?.song?.id;
      if (songId && lastPrepIdRef.current !== songId) {
        lastPrepIdRef.current = songId;
        setStage(ST.STINGER);
      } else {
        setStage(prev => (prev === ST.COUNTDOWN || prev === ST.STINGER) ? prev : ST.STINGER);
      }
    };

    const onStateSync = ({ queue: q, currentSong: cs, currentPrep: cp }) => {
      setRealQueue(q || []);
      setRealCurrent(cs);
      setRealPrep(cp);
      if (cs) {
        setIsDemoMode(false);
        setStage(ST.PLAYING);
      } else if (cp) {
        setIsDemoMode(false);
        lastPrepIdRef.current = cp?.song?.id;
        setStage(prev => (prev === ST.COUNTDOWN || prev === ST.STINGER) ? prev : ST.COUNTDOWN);
      } else {
        if (!isDemoMode) {
          setStage(ST.IDLE);
        }
      }
    };

    const onSongPlay = ({ currentSong, queue: q }) => {
      setRealCurrent(currentSong);
      setRealPrep(null);
      if (q) setRealQueue(q);
      if (currentSong) {
        setIsDemoMode(false);
        setStage(ST.PLAYING);
      } else {
        if (!isDemoMode) {
          setStage(ST.IDLE);
        }
      }
    };

    const onSettingsUpdated = (newSettings) => {
      console.log('[Stage] Settings updated:', newSettings);
      setSettings(newSettings);
    };

    socket.on('queue:updated', onQueueUpdated);
    socket.on('song:prep', onSongPrep);
    socket.on('state:sync', onStateSync);
    socket.on('song:play', onSongPlay);
    socket.on('settings:updated', onSettingsUpdated);

    // Fallback polling interval: if socket is disconnected, poll state every 1.5 seconds
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('[Stage] Socket disconnected. Polling fallback state...');
        fetch(`/api/state?room=${roomID}`)
          .then(res => res.json())
          .then(data => updateStateFromData(data))
          .catch(err => console.warn('[Stage Polling] Error:', err));
      }
    }, 1500);

    return () => {
      socket.off('queue:updated', onQueueUpdated);
      socket.off('song:prep', onSongPrep);
      socket.off('state:sync', onStateSync);
      socket.off('song:play', onSongPlay);
      socket.off('settings:updated', onSettingsUpdated);
      clearInterval(pollInterval);
    };
  }, [isDemoMode]);

  // Calculated values for active display (seamlessly mapping real vs. demo mock queue)
  const current = useMemo(() => {
    if (isDemoMode) {
      const dSong = DEMO_QUEUE[demoIndex];
      return { ...dSong, timeLeft: 5 }; // Fast 5 seconds countdown in demo mode
    }
    if (realPrep) {
      return { ...realPrep.song, timeLeft: realPrep.timeLeft };
    }
    return realCurrent;
  }, [isDemoMode, demoIndex, realCurrent, realPrep]);

  const queue = useMemo(() => {
    if (isDemoMode) {
      const q = [];
      for (let i = 1; i < DEMO_QUEUE.length; i++) {
        q.push(DEMO_QUEUE[(demoIndex + i) % DEMO_QUEUE.length]);
      }
      return q;
    }
    return realQueue;
  }, [isDemoMode, realQueue, demoIndex]);

  // Premium Inactivity Timer: after 5 minutes of total idle silence, enter Demo Mode
  useEffect(() => {
    const isIdle = hasStarted && !isDemoMode && realQueue.length === 0 && !realCurrent && !realPrep && stage === ST.IDLE;

    if (isIdle) {
      console.log("[Stage] Stage is idle. Starting 5-minute inactivity countdown...");
      inactivityTimerRef.current = setTimeout(() => {
        console.log("[Stage] 5 minutes inactivity reached. Activating Demo Mode!");
        setIsDemoMode(true);
        setDemoIndex(0);
        setStage(ST.STINGER);
      }, 300000); // 5 minutes
    } else {
      if (inactivityTimerRef.current) {
        console.log("[Stage] Activity detected or stage state changed. Resetting inactivity timer.");
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [hasStarted, isDemoMode, realQueue.length, realCurrent, realPrep, stage]);

  const startSession = () => {
    if (isDemoMode) {
      setStage(ST.STINGER);
    } else {
      socket.emit('queue:next');
    }
  };

  const nextSong = () => {
    if (isDemoMode) {
      setDemoIndex(prev => (prev + 1) % DEMO_QUEUE.length);
      setStage(ST.STINGER);
    } else {
      socket.emit('queue:next');
    }
  };

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[#04020a] flex items-center justify-center text-white">
         <Atmo />
         <Particles />
         <div className="relative z-10 text-center space-y-10 animate-[fadeInUp_1s_ease]">
            <div className="space-y-4">
              <span className="font-syne text-[11px] text-[#db2777] uppercase tracking-[0.5em] animate-pulse">Ready for Show</span>
              <h1 className="LuxeFont text-white text-[clamp(48px,8vw,82px)] tracking-tighter leading-tight drop-shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                {settings?.businessName || 'Vibe Sessions Studio'}
              </h1>
              <p className="font-dm text-white/40 text-lg max-w-lg mx-auto leading-relaxed">Phnom Penh's #1 Cinematic Karaoke Stage & Digital Signage Experience</p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setHasStarted(true);
                try { document.documentElement.requestFullscreen(); } catch(e) {}
              }}
              className="px-14 py-6 bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] rounded-full text-white font-syne font-bold uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(217,70,239,0.5)] border border-white/10"
            >
              Initialize Stage
            </motion.button>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#04020a] overflow-hidden select-none text-white">
      <Atmo />
      <Particles />

      {/* Logo Bug */}
      <div className="fixed top-12 left-12 z-25 opacity-30 font-syne text-[11px] text-[#f8f4ff] tracking-[0.4em] uppercase pointer-events-none flex items-center gap-4">
        <div className="w-1.5 h-1.5 bg-[#db2777] rounded-full animate-pulse" />
        {settings?.businessName || 'Vibe Sessions'}
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {stage === ST.IDLE && (
            <IdleScreen 
              key="idle" 
              nextPerformer={queue[0]} 
              queue={queue} 
              onStart={startSession} 
              settings={settings}
            />
          )}

          {stage === ST.COUNTDOWN && (
            <Countdown 
              key="countdown" 
              current={current} 
              onComplete={() => {
                setStage(ST.PLAYING);
                setTimeout(() => setShowHUD(false), 8000);
              }} 
            />
          )}

          {stage === ST.PLAYING && (
            <PlayingScreen 
              key="playing" 
              current={current} 
              queue={queue} 
              onEnded={nextSong}
              showHUD={showHUD}
              settings={settings}
            />
          )}
        </AnimatePresence>

        {stage === ST.STINGER && (
          <Stinger 
            current={current} 
            onComplete={() => {
              setShowHUD(true);
              setStage(ST.COUNTDOWN);
            }} 
          />
        )}
      </div>

      {/* Manual Controls Overlay */}
      <div className="fixed bottom-6 right-6 p-2 opacity-0 hover:opacity-100 transition-opacity z-[1000] flex gap-3 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10">
         <button onClick={() => setShowHUD(!showHUD)} title="Toggle HUD" className="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-colors"><Layout size={18} /></button>
         <button onClick={nextSong} title="Skip Song" className="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-colors"><Tv size={18} /></button>
         <button onClick={() => setStage(ST.IDLE)} title="Force Idle" className="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-colors"><Settings size={18} /></button>
      </div>
    </div>
  );
}
