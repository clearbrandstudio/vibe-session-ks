import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';
import { Layout, Tv, Settings, Sun } from 'lucide-react';

/** 
 * VIBE SESSIONS KARAOKE — CINEMATIC STAGE DISPLAY
 * Production-Level Broadcast Experience
 */

const ST = {
  IDLE: 'idle',
  STINGER: 'stinger',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  PROMO_PLAYING: 'promo_playing'
};

// Idle playlist is managed exclusively from idle-playlist.json via /api/idle-playlist
// No hardcoded cover fallback — admin manages the bucket list in the Admin Console


const DEMO_QUEUE = [
  { id: 1, singerName: "Sarah K.",  title: "Bohemian Rhapsody", artist: "Queen", videoId: "fJ9rUzIMcZQ" },
  { id: 2, singerName: "Dara M.",   title: "Blinding Lights",   artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
  { id: 3, singerName: "James T.",  title: "Shallow",           artist: "Lady Gaga", videoId: "bo_efYhYU2A" },
  { id: 4, singerName: "Mia L.",    title: "Someone Like You",  artist: "Adele", videoId: "hLQl3WQQoQ0" },
  { id: 5, singerName: "Alex R.",   title: "Levitating",        artist: "Dua Lipa", videoId: "TUVcZfQe-Kw" },
];


// --- ATMOSPHERE COMPONENTS ---

const Atmo = ({ vignette, brightness }) => {
  const finalVignette = vignette !== undefined ? vignette : 35;
  const brightVal = brightness !== undefined ? brightness : 100;
  // If brightness is set higher (e.g. 150%), reduce the atmospheric mesh opacity to let the screen be cleaner/brighter.
  const factor = Math.max(0.1, 100 / brightVal);
  const meshOpacity = 0.55 * factor;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#04020a] z-0">
      {/* Layer 1: Animated Mesh Gradients */}
      <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: meshOpacity }}>
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
      <div 
        className="absolute inset-0 z-5 pointer-events-none transition-all duration-300" 
        style={{
          background: `radial-gradient(ellipse 90% 90% at 50% 50%, transparent 50%, rgba(4, 2, 10, ${finalVignette / 100}) 100%)`
        }}
      />
    </div>
  );
};

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
  if (!current) return null;
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 50);   // Close
    const timer2 = setTimeout(() => setPhase(2), 570);  // Reveal content
    const timer3 = setTimeout(() => setPhase(3), 2670); // Hold for 2.1s
    const timer4 = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 3220); // Open & Done

    return () => {
      clearTimeout(timer1); clearTimeout(timer2);
      clearTimeout(timer3); clearTimeout(timer4);
    };
  }, []);

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
  if (!current) return null;
  const count = current.timeLeft !== undefined ? current.timeLeft : 15;
  const [totalDuration] = useState(current.timeLeft || 15);
  const [flash, setFlash] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 180);
    return () => clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    if (count <= 0 && onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, [count]);

  const dasharray = 2 * Math.PI * 90;
  const dashoffset = dasharray - (count / totalDuration) * dasharray;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-6 space-y-12"
    >
      <div className="text-center space-y-4">
        <span className="font-syne text-[11px] font-bold uppercase tracking-[0.45em] animate-[labelGlow_3s_infinite]">Next Up</span>
        <h1 className="LuxeFont text-white drop-shadow-[0_0_20px_rgba(217,70,239,0.7)] text-[clamp(42px,8vw,88px)] leading-tight">{current.singerName}</h1>
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
            className={`LuxeFont text-[clamp(64px,10vw,110px)] transition-all duration-150 text-white drop-shadow-[0_0_20px_rgba(217,70,239,0.7)] ${flash ? 'scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]' : ''}`}
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
    <div className="fixed bottom-0 left-0 w-full z-20 bg-gradient-to-t from-[#040210/98] via-[#040210/70] to-transparent p-4 px-8 flex items-center gap-6 pointer-events-none">
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

       <span className="font-syne text-[10px] text-white/20 tracking-[0.25em] uppercase">Vibe Sessions Studio</span>
    </div>
  );
};

const PlayingScreen = ({ current, queue = [], onEnded, onPlaybackFailed, showHUD, settings }) => {
  if (!current || !current.videoId) return null;
  const playerRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  const onPlaybackFailedRef = useRef(onPlaybackFailed);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onPlaybackFailedRef.current = onPlaybackFailed;
  }, [onPlaybackFailed]);

  const [isIntroActive, setIsIntroActive] = useState(true);

  useEffect(() => {
    setIsIntroActive(true);
    const timer = setTimeout(() => {
      setIsIntroActive(false);
    }, 15000); // 15 seconds
    return () => clearTimeout(timer);
  }, [current.videoId]);

  useEffect(() => {
    if (!current || !current.videoId) return;

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
             if (e.data === 0 && onEndedRef.current) {
                onEndedRef.current(); // Song ended
             }
          },
          onError: (e) => {
             console.warn('[YouTube Player] Playback error:', e.data);
             if ([5, 100, 101, 150].includes(e.data) && onPlaybackFailedRef.current) {
                onPlaybackFailedRef.current(current.videoId);
             }
          }
        }
      });
    };

    const checkAndInit = () => {
      if (window.YT && window.YT.Player && typeof window.YT.Player === 'function') {
        initPlayer();
        return true;
      }
      return false;
    };

    if (!checkAndInit()) {
      const interval = setInterval(() => {
        if (checkAndInit()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        clearInterval(interval);
        if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      };
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
    };
  }, [current.videoId]);

  const isHUDVisible = isIntroActive && showHUD;
  
  // Safe defaults: if settings haven't loaded yet, use conservative values
  // that won't black-out the screen. overlayOpacity was defaulting to 40 which
  // combined with from-black/to-black gradient caused a fully black video layer.
  const brightVal = settings?.brightness ?? 100;
  const contrastVal = settings?.contrast ?? 100;
  const opacityVal = settings?.overlayOpacity ?? 10; // 10% safe default (was 40 — too dark)

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative w-full h-full flex flex-col items-center justify-center p-6"
    >
      {/* YouTube Player Layer */}
      <div 
        className="absolute inset-0 z-7 bg-black overflow-hidden"
        style={{
          filter: `brightness(${brightVal}%) contrast(${contrastVal}%)`
        }}
      >
         <div id="yt-player-stage" className="w-full h-full pointer-events-none scale-[1.05]" />
         <div 
           className="absolute inset-0 bg-black pointer-events-none" 
           style={{ opacity: opacityVal / 100 }}
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />
      </div>

      {/* Top-Right Minimized Neon Capsule Badge */}
      <AnimatePresence>
        {!isHUDVisible && (
          <motion.div 
            initial={{ opacity: 0, x: 30 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="fixed top-12 right-12 z-20 bg-black/50 border border-[#d946ef]/40 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(217,70,239,0.45)] flex items-center gap-2 pointer-events-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] animate-ping shrink-0" />
            <span className="font-syne text-[8px] uppercase tracking-widest text-[#c8b9e6]/60">Singing:</span>
            <span className="font-syne font-extrabold text-xs uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#d946ef] to-[#ec4899] drop-shadow-[0_0_8px_rgba(217,70,239,0.7)]">{current.singerName}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ghost Watermark */}
      <motion.div 
        animate={{ opacity: isHUDVisible ? 0.15 : 0 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 z-[8] pointer-events-none select-none flex items-center justify-center"
      >
        <h2 className="LuxeFont text-[clamp(80px,14vw,180px)] text-transparent" style={{ WebkitTextStroke: '1px rgba(248, 244, 255, 0.15)' }}>
          {current.singerName}
        </h2>
      </motion.div>

      {/* Main glass-card intro display */}
      <motion.div 
        animate={{ 
          opacity: isHUDVisible ? 1 : 0, 
          y: isHUDVisible ? 0 : -40,
          scale: isHUDVisible ? 1 : 0.9 
        }}
        transition={{ duration: 1.0, ease: "easeInOut" }}
        className="glass-card-stage z-10 p-10 md:p-16 max-w-[min(580px,88vw)] w-full text-center space-y-6 pointer-events-none"
      >
        <span className="font-syne text-[10px] uppercase tracking-[0.4em] animate-[labelGlow_3s_infinite]">Now Performing</span>
        <h1 className="LuxeFont text-white drop-shadow-[0_0_25px_rgba(217,70,239,0.8)] text-[clamp(40px,7.5vw,88px)] leading-[1.05] tracking-tight">{current.singerName}</h1>
        <div className="w-16 h-[1px] mx-auto bg-gradient-to-r from-transparent via-[#db2777] to-transparent shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
        <div className="space-y-1">
          <p className="font-syne text-[clamp(15px,2.2vw,24px)] text-[#f8f4ff]/80 tracking-wide">{current.title}</p>
          <p className="font-dm text-[clamp(12px,1.6vw,17px)] text-[#7c6f9a]">{current.artist}</p>
        </div>
        <div className="opacity-70 pt-4">
          <Waveform active={isHUDVisible} />
        </div>
      </motion.div>

      <motion.div 
        animate={{ opacity: isHUDVisible ? 1 : 0 }}
        transition={{ delay: isHUDVisible ? 0.6 : 0, duration: 0.5 }}
        className="mt-8 text-[#7c6f9a]/60 font-syne text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 pointer-events-none"
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


const PromoPlayingScreen = ({ video, onEnded, onPlaybackFailed, settings }) => {
  if (!video || !video.videoId) return null;
  const playerRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  const onPlaybackFailedRef = useRef(onPlaybackFailed);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onPlaybackFailedRef.current = onPlaybackFailed;
  }, [onPlaybackFailed]);

  useEffect(() => {
    if (!video || !video.videoId) return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player-promo', {
        videoId: video.videoId,
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
             if (e.data === 0 && onEndedRef.current) {
                onEndedRef.current();
             }
          },
          onError: (e) => {
             console.warn(`[YouTube Idle Player] Playback error for ${video.videoId} — error code: ${e.data}`);
             // Error codes 101/150 = embedding disabled by video owner
             if ([5, 100, 101, 150].includes(e.data) && onPlaybackFailedRef.current) {
               onPlaybackFailedRef.current(video.videoId);
             } else if (onEndedRef.current) {
               // Other errors: skip to next
               onEndedRef.current();
             }
          }
        }
      });
    };

    const checkAndInit = () => {
      if (window.YT && window.YT.Player && typeof window.YT.Player === 'function') {
        initPlayer();
        return true;
      }
      return false;
    };

    if (!checkAndInit()) {
      const interval = setInterval(() => {
        if (checkAndInit()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        clearInterval(interval);
        if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      };
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
    };
  }, [video.videoId]);

  const brightVal = settings?.brightness !== undefined ? settings.brightness : 115;
  const contrastVal = settings?.contrast !== undefined ? settings.contrast : 100;
  const opacityVal = settings?.overlayOpacity !== undefined ? settings.overlayOpacity : 20;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-black"
    >
      {/* YouTube Player Layer */}
      <div 
        className="absolute inset-0 z-7 bg-black overflow-hidden"
        style={{
          filter: `brightness(${brightVal}%) contrast(${contrastVal}%)`
        }}
      >
         <div id="yt-player-promo" className="w-full h-full pointer-events-none scale-[1.05]" />
         <div 
           className="absolute inset-0 bg-black pointer-events-none" 
           style={{ opacity: opacityVal / 100 }}
         />
      </div>

      {/* Branded Interlude Overlay — bottom-left */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="fixed bottom-12 left-12 z-20 flex items-center gap-4 bg-black/60 border border-white/10 backdrop-blur-xl px-5 py-3.5 rounded-2xl pointer-events-none"
      >
        {/* Animated waveform bars */}
        <div className="flex gap-[3px] h-5 items-end">
          {[0.6, 1, 0.7, 0.9, 0.5, 0.8, 1, 0.65].map((h, i) => (
            <motion.div
              key={i}
              className="w-[2.5px] rounded-full bg-gradient-to-t from-[#8B5CF6] to-[#EC4899]"
              animate={{ height: [`${h * 10}px`, `${Math.min(1, h + 0.3) * 20}px`, `${h * 10}px`] }}
              transition={{ duration: 0.8 + i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <div className="space-y-0.5">
          <span className="font-syne text-[8px] font-bold uppercase tracking-[0.3em] text-[#D946EF]">Music Interlude</span>
          <p className="font-syne font-semibold text-white text-[12px] leading-tight truncate max-w-[220px]">{video.title}</p>
          <p className="font-dm text-[9px] text-white/45">{video.channel || 'Trending'}</p>
        </div>
      </motion.div>

      {/* Top logo */}
      <div className="fixed top-12 right-12 z-20 opacity-30 font-syne text-[11px] tracking-[0.4em] uppercase text-white pointer-events-none">
        {settings?.businessName || 'Vibe Sessions Studio'}
      </div>
    </motion.div>
  );
};


// ──────────────────────────────────────────────
// Promo Stinger Card Component — Cinematic Broadcast Style
// ──────────────────────────────────────────────
const PromoStingerCard = ({ promos = [], activeIndex = 0 }) => {
  if (promos.length === 0) return null;
  const promo = promos[activeIndex % promos.length];
  
  const themeColors = {
    beer:      { border: 'border-amber-500/50',  glow: 'shadow-amber-500/30',  text: 'text-amber-400',  bg: 'from-amber-950/60 to-amber-900/20',  pulse: 'rgba(245,158,11,0.35)',  icon: '🍺' },
    dish:      { border: 'border-red-500/50',    glow: 'shadow-red-500/30',    text: 'text-red-400',    bg: 'from-red-950/60 to-red-900/20',      pulse: 'rgba(239,68,68,0)',      icon: '🍽️' },
    happyhour: { border: 'border-pink-500/50',   glow: 'shadow-pink-500/30',   text: 'text-pink-400',   bg: 'from-pink-950/60 to-pink-900/20',    pulse: 'rgba(236,72,153,0.35)',  icon: '⏰' },
    custom:    { border: 'border-purple-500/50', glow: 'shadow-purple-500/30', text: 'text-purple-400', bg: 'from-purple-950/60 to-purple-900/20', pulse: 'rgba(139,92,246,0)',     icon: '✨' }
  };
  
  const theme = themeColors[promo.type] || themeColors.custom;
  const isTimeboxed = promo.type === 'beer' || promo.type === 'happyhour';
  
  // Compute countdown display from schedule.endHour
  const getTimeLabel = () => {
    if (!promo.schedule || promo.schedule.endHour === undefined) return null;
    const endH = promo.schedule.endHour;
    const suffix = endH >= 12 ? 'PM' : 'AM';
    const displayH = endH > 12 ? endH - 12 : endH === 0 ? 12 : endH;
    return `Ends at ${displayH}:00 ${suffix}`;
  };
  const timeLabel = getTimeLabel();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={promo.id}
        // Cinematic broadcast drop-in: fall from above with slight rotation
        initial={{ opacity: 0, y: -120, rotate: -4, scale: 0.88 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, x: 220, rotate: 6, scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18, mass: 0.9 }}
        className={`fixed right-10 top-[18%] z-50 w-72 rounded-2xl flex flex-col gap-0 border ${theme.border} bg-gradient-to-br ${theme.bg} shadow-2xl ${theme.glow} overflow-hidden backdrop-blur-xl`}
        style={isTimeboxed ? {
          boxShadow: `0 0 40px ${theme.pulse}, 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`
        } : {
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`
        }}
      >
        {/* Top shimmer bar */}
        <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        
        {/* Pulsing halo ring for time-sensitive promos */}
        {isTimeboxed && (
          <motion.div
            className="absolute -inset-1 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ border: `2px solid ${theme.pulse}`, borderRadius: '1rem', filter: `blur(3px)` }}
          />
        )}

        {/* Image section */}
        {promo.imageUrl && (
          <div className="relative w-full h-40 overflow-hidden">
            <img 
              src={promo.imageUrl} 
              alt={promo.title} 
              className="w-full h-full object-cover scale-105"
            />
            {/* Gradient fade to card body */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Badge */}
            {promo.badgeText && (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                className="absolute top-3 left-3 text-[9px] font-syne font-extrabold uppercase px-3 py-1.5 rounded-full text-white shadow-lg flex items-center gap-1.5"
                style={{ backgroundColor: promo.badgeColor || '#ec4899' }}
              >
                {theme.icon} {promo.badgeText}
              </motion.span>
            )}

            {/* Time-sensitive label in image corner */}
            {timeLabel && (
              <span className={`absolute bottom-3 right-3 text-[8px] font-syne font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/70 border border-white/10 ${theme.text} backdrop-blur-sm flex items-center gap-1`}>
                ⏱ {timeLabel}
              </span>
            )}
          </div>
        )}
        
        {/* Card body */}
        <div className="p-4 space-y-3">
          <div className="space-y-0.5">
            <span className={`text-[9px] font-syne uppercase tracking-wider ${theme.text} font-bold`}>{promo.subtitle || 'SPECIAL OFFER'}</span>
            <h3 className="font-syne font-extrabold text-white text-[15px] leading-tight">{promo.title}</h3>
          </div>
          
          {/* Price row with shimmer effect */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-baseline gap-2">
              <span 
                className="font-syne font-black text-2xl text-white relative overflow-hidden"
                style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}
              >
                {/* Price shimmer sweep */}
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                  style={{ width: '60%' }}
                />
                {promo.price}
              </span>
              {promo.originalPrice && (
                <span className="font-dm text-xs text-white/35 line-through">{promo.originalPrice}</span>
              )}
            </div>
            <span className="text-[9px] font-syne tracking-widest text-white/40 uppercase border border-white/10 px-2 py-1 rounded-lg">ORDER NOW</span>
          </div>
        </div>
        
        {/* Pagination dots — only show if multiple promos */}
        {promos.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3">
            {promos.map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  width: i === (activeIndex % promos.length) ? 16 : 5,
                  opacity: i === (activeIndex % promos.length) ? 1 : 0.3
                }}
                transition={{ duration: 0.3 }}
                className="h-[3px] rounded-full bg-white"
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
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

  // Dynamic Content States (Improvement #2 & #3)
  const [promos, setPromos] = useState([]);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const [idlePlaylist, setIdlePlaylist] = useState([]);
  const [idleIndex, setIdleIndex] = useState(0);

  const inactivityTimerRef = useRef(null);
  const lastPrepIdRef = useRef(null);

  const [failedVideoIds, setFailedVideoIds] = useState(new Set());

  // Reset failed video list on song transition
  useEffect(() => {
    if (realCurrent?.id) {
      console.log(`[Stage] Resetting failed video list for new song ID: ${realCurrent.id}`);
      setFailedVideoIds(new Set());
    }
  }, [realCurrent?.id]);

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

    // Promos Fetch (Improvement #2)
    fetch(`/api/promos?room=${roomID}`)
      .then(res => res.json())
      .then(data => setPromos(data))
      .catch(err => console.warn('[Stage Promos Init] error:', err));

    // Idle Playlist Fetch (Improvement #3 — no cover fallback)
    fetch(`/api/idle-playlist?room=${roomID}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setIdlePlaylist(data);
        }
        // If empty, idlePlaylist stays [] — Stage shows admin prompt
      })
      .catch(err => {
        console.warn('[Stage Idle Playlist Init] error:', err);
        // No fallback to studio covers
      });

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

    const onPromosUpdated = (newPromos) => {
      console.log('[Stage] Promos updated:', newPromos);
      setPromos(newPromos);
    };

    const onIdlePlaylistUpdated = (newPlaylist) => {
      console.log('[Stage] Idle playlist updated:', newPlaylist);
      if (newPlaylist && newPlaylist.length > 0) {
        setIdlePlaylist(newPlaylist);
        setIdleIndex(0);
      }
    };

    socket.on('queue:updated', onQueueUpdated);
    socket.on('song:prep', onSongPrep);
    socket.on('state:sync', onStateSync);
    socket.on('song:play', onSongPlay);
    socket.on('settings:updated', onSettingsUpdated);
    socket.on('promos:updated', onPromosUpdated);
    socket.on('idle-playlist:updated', onIdlePlaylistUpdated);

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
      socket.off('promos:updated', onPromosUpdated);
      socket.off('idle-playlist:updated', onIdlePlaylistUpdated);
      clearInterval(pollInterval);
    };
  }, [isDemoMode]);

  // Calculated values for active display
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

  // Active Promo Filter (scheduled / enabled check)
  const activePromos = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    return promos.filter(p => {
      if (!p.enabled) return false;
      if (p.schedule) {
        const { startHour, endHour } = p.schedule;
        if (startHour !== undefined && endHour !== undefined) {
          if (startHour > endHour) {
            return currentHour >= startHour || currentHour < endHour;
          }
          return currentHour >= startHour && currentHour < endHour;
        }
      }
      return true;
    });
  }, [promos]);

  // Promo card rotation timer (Improvement #2)
  useEffect(() => {
    if (activePromos.length <= 1) return;
    const interval = setInterval(() => {
      setActivePromoIndex(prev => (prev + 1) % activePromos.length);
    }, 15000); // Rotate every 15s
    return () => clearInterval(interval);
  }, [activePromos]);

  // Cover Video Autoplay Inactivity Timer: after 30 seconds of total idle silence, start Idle Playlist
  useEffect(() => {
    const isIdle = hasStarted && realQueue.length === 0 && !realCurrent && !realPrep && stage === ST.IDLE;

    if (isIdle) {
      console.log("[Stage] Stage is idle. Starting 30-second cover autoplay countdown...");
      inactivityTimerRef.current = setTimeout(() => {
        console.log("[Stage] 30 seconds inactivity reached. Activating cover playlist mode!");
        setIdleIndex(0);
        setStage(ST.PROMO_PLAYING);
      }, 30000); // 30 seconds
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
  }, [hasStarted, realQueue.length, realCurrent, realPrep, stage]);

  const startSession = useCallback(async () => {
    if (isDemoMode) {
      setStage(ST.STINGER);
    } else {
      const params = new URLSearchParams(window.location.search);
      const roomID = params.get('room') || 'default';
      try {
        const res = await fetch(`/api/queue/next?room=${roomID}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setRealQueue(data.queue || []);
          setRealCurrent(data.currentSong || null);
          setRealPrep(data.currentPrep || null);
          if (data.currentSong) {
            setStage(ST.PLAYING);
          } else if (data.currentPrep) {
            lastPrepIdRef.current = data.currentPrep?.song?.id;
            setStage(ST.STINGER);
          } else {
            setStage(ST.IDLE);
          }
        }
      } catch (err) {
        console.warn('[Stage] HTTP next/start failed, falling back to socket:', err);
        socket.emit('queue:next');
      }
    }
  }, [isDemoMode]);

  const nextSong = useCallback(async () => {
    if (isDemoMode) {
      setDemoIndex(prev => (prev + 1) % DEMO_QUEUE.length);
      setStage(ST.STINGER);
    } else {
      const params = new URLSearchParams(window.location.search);
      const roomID = params.get('room') || 'default';
      try {
        const res = await fetch(`/api/queue/next?room=${roomID}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setRealQueue(data.queue || []);
          setRealCurrent(data.currentSong || null);
          setRealPrep(data.currentPrep || null);
          if (data.currentSong) {
            setStage(ST.PLAYING);
          } else if (data.currentPrep) {
            lastPrepIdRef.current = data.currentPrep?.song?.id;
            setStage(ST.STINGER);
          } else {
            setStage(ST.IDLE);
          }
        }
      } catch (err) {
        console.warn('[Stage] HTTP next failed, falling back to socket:', err);
        socket.emit('queue:next');
      }
    }
  }, [isDemoMode]);

  const handlePlaybackFailed = useCallback(async (brokenVideoId) => {
    if (!current) return;
    console.warn(`[Stage] Video playback failed for ID: ${brokenVideoId}. Attempting auto-recovery...`);
    
    // Add to failed video ids set
    setFailedVideoIds(prev => {
      const next = new Set(prev);
      next.add(brokenVideoId);
      return next;
    });

    const songTitle = current.title;
    const songArtist = current.artist || current.singerName;
    const searchQuery = `${songTitle} ${songArtist}`;

    try {
      console.log(`[Stage] Searching alternatives with checked oEmbed embeddability: "${searchQuery}"`);
      // Improvement #5: Call find-embeddable endpoint for verified video stream URL/ID
      const res = await fetch(`/api/find-embeddable?q=${encodeURIComponent(searchQuery)}&originalVideoId=${brokenVideoId}`);
      const data = await res.json();
      
      if (data && data.success && data.video) {
        const alternativeVideoId = data.video.videoId;
        console.log(`[Stage] Found oEmbed embeddable alternative: "${data.video.title}" with ID: ${alternativeVideoId}`);
        
        const params = new URLSearchParams(window.location.search);
        const roomID = params.get('room') || 'default';
        
        const updateRes = await fetch(`/api/queue/update-current-video?room=${roomID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: alternativeVideoId })
        });
        
        const updateData = await updateRes.json();
        if (updateData.success) {
          console.log(`[Stage] Successfully updated server currentSong to alternative: ${alternativeVideoId}`);
          return;
        }
      }
      
      // Fallback search proxy (with client-side verification if find-embeddable failed)
      const fallbackRes = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const fallbackData = await fallbackRes.json();
      
      if (fallbackData && Array.isArray(fallbackData.items)) {
        const currentFailed = new Set(failedVideoIds);
        currentFailed.add(brokenVideoId);

        const alternative = fallbackData.items.find(item => {
          const vId = item.videoId;
          return vId && vId !== brokenVideoId && !currentFailed.has(vId);
        });

        if (alternative) {
          const alternativeVideoId = alternative.videoId;
          console.log(`[Stage Fallback] Found working video alternative: "${alternative.title}" with ID: ${alternativeVideoId}`);
          
          const params = new URLSearchParams(window.location.search);
          const roomID = params.get('room') || 'default';
          
          const updateRes = await fetch(`/api/queue/update-current-video?room=${roomID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: alternativeVideoId })
          });
          
          const updateData = await updateRes.json();
          if (updateData.success) {
            console.log(`[Stage] Successfully updated server currentSong to fallback alternative: ${alternativeVideoId}`);
            return;
          }
        }
      }
      
      console.warn('[Stage] No viable alternative video found. Skipping to the next song in queue...');
      nextSong();
    } catch (err) {
      console.error('[Stage] Failed to recover playback:', err);
      nextSong();
    }
  }, [current, failedVideoIds, nextSong]);

  const updateLocalBrightness = async (newVal) => {
    if (!settings) return;
    const updated = { ...settings, brightness: newVal };
    setSettings(updated);
    
    // Save to server to persist and sync Kiosk view in real time
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';
    try {
      await fetch(`/api/settings?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.warn('[Stage] Failed to save quick brightness adjustments:', err);
    }
  };

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[#04020a] flex items-center justify-center text-white">
         <Atmo vignette={settings?.vignette} brightness={settings?.brightness} />
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

  const currentCoverVideo = idlePlaylist[idleIndex % (idlePlaylist.length || 1)] || null;

  return (
    <div className="fixed inset-0 bg-[#04020a] overflow-hidden select-none text-white">
      <Atmo vignette={settings?.vignette} brightness={settings?.brightness} />
      <Particles />

      {/* Logo Bug */}
      <div className="fixed top-12 left-12 z-25 opacity-30 font-syne text-[11px] text-[#f8f4ff] tracking-[0.4em] uppercase pointer-events-none flex items-center gap-4">
        <div className="w-1.5 h-1.5 bg-[#db2777] rounded-full animate-pulse" />
        {settings?.businessName || 'Vibe Sessions Studio'}
      </div>

      {/* Dynamic Stinger Card overlay for dishes/drinks promotions */}
      {(stage === ST.PLAYING || stage === ST.IDLE || stage === ST.PROMO_PLAYING) && activePromos.length > 0 && (
        <PromoStingerCard promos={activePromos} activeIndex={activePromoIndex} />
      )}

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
              key={`countdown-${current?.videoId || ''}`} 
              current={current} 
              onComplete={() => {
                setStage(ST.PLAYING);
                setTimeout(() => setShowHUD(false), 8000);
              }} 
            />
          )}

          {stage === ST.PLAYING && (
            <PlayingScreen 
              key={`playing-${current?.videoId || ''}`} 
              current={current} 
              queue={queue} 
              onEnded={nextSong}
              onPlaybackFailed={handlePlaybackFailed}
              showHUD={showHUD}
              settings={settings}
            />
          )}

          {stage === ST.PROMO_PLAYING && currentCoverVideo && (
            <PromoPlayingScreen 
              key={`promo-${currentCoverVideo.videoId || ''}`} 
              video={currentCoverVideo} 
              onEnded={() => {
                setIdleIndex(prev => {
                  if (idlePlaylist.length <= 1) return 0;
                  let next;
                  do {
                    next = Math.floor(Math.random() * idlePlaylist.length);
                  } while (next === prev);
                  return next;
                });
              }}
              onPlaybackFailed={(failedId) => {
                console.warn(`[Stage] Idle video ${failedId} failed embedding check. Skipping to next...`);
                setIdleIndex(prev => {
                  if (idlePlaylist.length <= 1) return 0;
                  let next;
                  do {
                    next = Math.floor(Math.random() * idlePlaylist.length);
                  } while (next === prev);
                  return next;
                });
              }}
              settings={settings}
            />
          )}
          {stage === ST.PROMO_PLAYING && !currentCoverVideo && (
            // No idle videos loaded — show a helpful admin prompt
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-6 text-center p-10"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-3xl">🎬</div>
              <div className="space-y-2">
                <h2 className="LuxeFont text-white text-3xl">Idle Playlist Empty</h2>
                <p className="font-dm text-white/40 text-sm max-w-sm">Open the Admin Console → Idle Playlist tab and add YouTube video URLs to play during intermissions.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stage === ST.STINGER && (
          <Stinger 
            key={`stinger-${current?.videoId || ''}`} 
            current={current} 
            onComplete={() => {
              setShowHUD(true);
              setStage(ST.COUNTDOWN);
            }} 
          />
        )}
      </div>

      {/* Manual Controls Overlay with dynamic brightness controls (Improvement #1) */}
      <div className="fixed bottom-6 right-6 p-2 opacity-0 hover:opacity-100 transition-opacity z-[1000] flex gap-3 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10">
         <div className="flex items-center gap-2 px-3 bg-white/10 rounded-xl">
           <Sun size={16} className="text-white/60 animate-spin-slow" />
           <input 
             type="range" 
             min="50" 
             max="175" 
             value={settings?.brightness || 100} 
             onChange={(e) => updateLocalBrightness(parseInt(e.target.value))}
             className="w-20 h-1 accent-[#db2777] bg-white/20 rounded-lg appearance-none cursor-pointer"
             title="Quick Stage Brightness"
           />
           <span className="text-[10px] font-syne font-bold w-8 text-right text-[#c8b9e6]/80">
             {settings?.brightness || 115}%
           </span>
         </div>
         <button onClick={() => setShowHUD(!showHUD)} title="Toggle HUD" className="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-colors"><Layout size={18} /></button>
         <button onClick={nextSong} title="Skip Song" className="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-colors"><Tv size={18} /></button>
         <button onClick={() => setStage(ST.IDLE)} title="Force Idle" className="bg-white/10 p-3 rounded-xl text-white hover:bg-white/20 transition-colors"><Settings size={18} /></button>
      </div>
    </div>
  );
}
