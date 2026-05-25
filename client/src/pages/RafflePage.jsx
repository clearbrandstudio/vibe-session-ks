import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Settings, Play, Volume2, VolumeX, Trash2, Users, 
  RefreshCw, Sliders, Sparkles, Plus, Award, Check, Layout, HelpCircle
} from 'lucide-react';
import io from 'socket.io-client';

// Initial Socket connection
const params = new URLSearchParams(window.location.search);
const roomID = params.get('room') || 'default';
const socket = io(window.location.origin, {
  query: { room: roomID }
});

// Sound synthesizers (Zero-dependency Web Audio API sound generator for premium tactile feel)
const playBeep = (freq = 440, type = 'sine', duration = 0.08, volume = 0.1) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio Context failed or blocked
  }
};

const playVictoryFanfare = () => {
  const notes = [
    { f: 261.63, d: 0.15 }, // C4
    { f: 329.63, d: 0.15 }, // E4
    { f: 392.00, d: 0.15 }, // G4
    { f: 523.25, d: 0.4 }   // C5
  ];
  notes.forEach((note, i) => {
    setTimeout(() => {
      playBeep(note.f, 'triangle', note.d, 0.15);
    }, i * 150);
  });
};

export default function RafflePage() {
  // Config & State
  const [participants, setParticipants] = useState([
    "Phoenix", "Juggernaut", "Mirana", "Crystal Maiden", 
    "Sven", "Kunkka", "Lina", "Rubick", "Invoker", "Riki"
  ]);
  const [winners, setWinners] = useState([]);
  const [drawMode, setDrawMode] = useState('slot'); // 'slot' | 'roulette'
  
  // Settings / Controls drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [inputText, setInputText] = useState("");
  const [muted, setMuted] = useState(false);
  const [roomName, setRoomName] = useState("Vibe Sessions Studio");
  const [logoUrl, setLogoUrl] = useState("");

  // Animation states
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [slotItems, setSlotItems] = useState([]);
  const [targetSlotIndex, setTargetSlotIndex] = useState(0);

  // References
  const canvasRef = useRef(null);
  const wheelAngle = useRef(0);
  const animationFrameId = useRef(null);
  const confettiCanvasRef = useRef(null);
  const confettiParticles = useRef([]);

  // Load participants & history from server (falls back to local state)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await fetch(`/api/settings?room=${roomID}`);
        const settingsData = await settingsRes.json();
        if (settingsData.businessName) setRoomName(settingsData.businessName);
        if (settingsData.logoUrl) setLogoUrl(settingsData.logoUrl);

        const raffleRes = await fetch(`/api/raffle?room=${roomID}`);
        const raffleData = await raffleRes.json();
        if (raffleData.participants && raffleData.participants.length > 0) {
          setParticipants(raffleData.participants);
          setInputText(raffleData.participants.join('\n'));
        } else {
          setInputText(participants.join('\n'));
        }
        if (raffleData.winners) setWinners(raffleData.winners);
      } catch (err) {
        console.warn("[Raffle] Failed server fetch, operating locally:", err);
        setInputText(participants.join('\n'));
      }
    };
    fetchData();

    // Socket.io real-time listener for remote drawing/updates
    const onRaffleUpdated = (data) => {
      if (data.participants) {
        setParticipants(data.participants);
        setInputText(data.participants.join('\n'));
      }
      if (data.winners) setWinners(data.winners);
    };

    const onRaffleDraw = (data) => {
      // Trigger animation sync across devices
      if (data.winner) {
        triggerLocalDraw(data.winner.name);
      }
    };

    socket.on('raffle:updated', onRaffleUpdated);
    socket.on('raffle:draw', onRaffleDraw);

    return () => {
      socket.off('raffle:updated', onRaffleUpdated);
      socket.off('raffle:draw', onRaffleDraw);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [roomID]);

  // Sync canvas width and setup roulette rendering loop
  useEffect(() => {
    if (drawMode === 'roulette' && !spinning) {
      drawRouletteWheel(wheelAngle.current);
    }
  }, [drawMode, participants, spinning]);

  // Confetti Animation loop
  useEffect(() => {
    if (showCelebration) {
      setupConfetti();
      const loop = () => {
        updateAndRenderConfetti();
        animationFrameId.current = requestAnimationFrame(loop);
      };
      loop();
    } else {
      cancelAnimationFrame(animationFrameId.current);
      confettiParticles.current = [];
    }
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [showCelebration]);

  // ── ROULETTE DRAWER ───────────────────────────────────────────────────────────
  const drawRouletteWheel = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = 500;
    const height = 500;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 15;
    
    ctx.clearRect(0, 0, width, height);

    // Dynamic Sectors
    const totalSectors = participants.length;
    const arcSize = (Math.PI * 2) / (totalSectors || 1);

    // Glow effects
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';

    participants.forEach((name, i) => {
      const startAngle = angle + i * arcSize;
      const endAngle = startAngle + arcSize;

      // Premium segment themes: Dark gold / Purple gradient hues
      const isEven = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      // Premium Segment Gradient
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      if (isEven) {
        grad.addColorStop(0, '#1c1035');
        grad.addColorStop(0.5, '#120726');
        grad.addColorStop(1, '#0e041d');
      } else {
        grad.addColorStop(0, '#2d2010');
        grad.addColorStop(0.5, '#1c1205');
        grad.addColorStop(1, '#150d03');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Segments borders
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isEven ? 'rgba(139,92,246,0.3)' : 'rgba(217,70,239,0.3)';
      ctx.stroke();

      // Render Text in Segment
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      
      // Dynamic text sizing
      const fontSize = totalSectors > 24 ? 9 : totalSectors > 12 ? 11 : 13;
      ctx.font = `800 ${fontSize}px 'Syne', sans-serif`;
      ctx.fillStyle = isEven ? '#F8F4FF' : '#F5D193';
      ctx.shadowBlur = 5;
      ctx.shadowColor = isEven ? 'rgba(217,70,239,0.3)' : 'rgba(245,209,147,0.3)';
      
      // Truncate name if too long
      const displayName = name.length > 15 ? name.substring(0, 13) + '..' : name;
      ctx.fillText(displayName.toUpperCase(), radius - 30, 0);
      ctx.restore();
    });

    // Draw Outer Gold / Neon Rim
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(217, 70, 239, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(245, 209, 147, 0.9)'; // Dota Gold
    ctx.stroke();

    // Secondary inner glowing neon rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#D946EF';
    ctx.stroke();

    // Center Core Cap (Neon Core)
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#8B5CF6';
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#08060c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8B5CF6';
    ctx.stroke();

    // Inside Center Core Gold Emblem
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#F5D193';
    ctx.fill();
  };

  // ── SPIN WHEEL (ROULETTE) MECHANIC ───────────────────────────────────────────
  const spinRoulette = (winnerName) => {
    if (spinning || participants.length === 0) return;
    setSpinning(true);
    setWinner(null);
    setShowCelebration(false);

    const totalSectors = participants.length;
    const arcSize = (Math.PI * 2) / totalSectors;
    const winnerIndex = participants.indexOf(winnerName);
    
    // Target angle calculation to land exactly on the selected winner segment.
    // The selector is at the top (angle = -Math.PI / 2)
    const targetSectorAngle = -Math.PI / 2 - (winnerIndex * arcSize) - (arcSize / 2);
    
    // Add multiple full revolutions (between 5 and 8) for kinematic velocity feel
    const fullSpins = 6 + Math.floor(Math.random() * 3);
    const targetAngle = targetSectorAngle - (fullSpins * Math.PI * 2);

    let start = null;
    const duration = 5000; // 5 seconds
    const startAngle = wheelAngle.current;
    
    let lastTickAngle = startAngle;

    const animateSpin = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const percent = Math.min(progress / duration, 1);
      
      // Quartic Ease-Out curve for dramatic esports decel
      const ease = 1 - Math.pow(1 - percent, 4);
      const currentAngle = startAngle + (targetAngle - startAngle) * ease;
      
      wheelAngle.current = currentAngle;
      drawRouletteWheel(currentAngle);

      // Play tick sound whenever a segment boundaries rotates past the top
      const segmentProgress = Math.floor((currentAngle - (arcSize / 2)) / arcSize);
      const lastSegmentProgress = Math.floor((lastTickAngle - (arcSize / 2)) / arcSize);
      
      if (segmentProgress !== lastSegmentProgress) {
        if (!muted) {
          const t = 1 - ease;
          const pitch = 300 + t * 400; // rising pitch as it starts, decaying as it rests
          playBeep(pitch, 'triangle', 0.05, 0.08);
        }
        lastTickAngle = currentAngle;
      }

      if (percent < 1) {
        animationFrameId.current = requestAnimationFrame(animateSpin);
      } else {
        // Finished Spin
        setSpinning(false);
        finalizeWinner(winnerName);
      }
    };
    animationFrameId.current = requestAnimationFrame(animateSpin);
  };

  // ── SLOT MACHINE SHUFFLER MECHANIC ───────────────────────────────────────────
  const spinSlotMachine = (winnerName) => {
    if (spinning || participants.length === 0) return;
    setSpinning(true);
    setWinner(null);
    setShowCelebration(false);

    // Create an elongated reel array containing duplicates of candidates to scroll through
    const baseList = [...participants];
    const shufflesCount = 55; // Reel length
    const finalReel = [];
    
    for (let i = 0; i < shufflesCount; i++) {
      finalReel.push(baseList[i % baseList.length]);
    }
    
    // Set the selected winner at the target alignment point
    const targetIndex = shufflesCount - 4; // Align winner 4 items from bottom
    finalReel[targetIndex] = winnerName;

    setSlotItems(finalReel);
    setTargetSlotIndex(0);

    let currentIdx = 0;
    const duration = 4500; // 4.5 seconds
    const start = performance.now();

    const animateReel = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing Curve
      const ease = 1 - Math.pow(1 - progress, 5);
      
      // Map easing index mapping to reel indices
      const currentScrollIndex = Math.floor(ease * targetIndex);
      setTargetSlotIndex(currentScrollIndex);

      if (currentScrollIndex !== currentIdx) {
        if (!muted) {
          // Tactical rolling sounds
          const rate = 1 - progress;
          playBeep(320 + rate * 300, 'square', 0.03, 0.05);
        }
        currentIdx = currentScrollIndex;
      }

      if (progress < 1) {
        animationFrameId.current = requestAnimationFrame(animateReel);
      } else {
        setSpinning(false);
        setTargetSlotIndex(targetIndex);
        finalizeWinner(winnerName);
      }
    };
    animationFrameId.current = requestAnimationFrame(animateReel);
  };

  // ── TRIGGER RANDOMIZER DRAW ──────────────────────────────────────────────────
  const drawRaffleWinner = async () => {
    if (spinning || participants.length === 0) return;
    
    // Select winner randomly from candidate pool
    const randWinner = participants[Math.floor(Math.random() * participants.length)];
    
    try {
      // POST drawn winner to server to persist and broadcast
      const res = await fetch(`/api/raffle/draw?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: randWinner })
      });
      const data = await res.json();
      if (!data.success) {
        // offline server fallback
        triggerLocalDraw(randWinner);
      }
    } catch (e) {
      // offline fallback
      triggerLocalDraw(randWinner);
    }
  };

  const triggerLocalDraw = (winnerName) => {
    if (drawMode === 'slot') {
      spinSlotMachine(winnerName);
    } else {
      spinRoulette(winnerName);
    }
  };

  const finalizeWinner = async (winnerName) => {
    setWinner(winnerName);
    setShowCelebration(true);
    if (!muted) playVictoryFanfare();
    
    // Sync local winners list state in case of offline fallback
    setWinners(prev => [
      { name: winnerName, drawnAt: new Date().toISOString(), id: 'local-' + Date.now() },
      ...prev
    ]);
  };

  // ── SAVE PARTICIPANTS LIST ───────────────────────────────────────────────────
  const handleSaveParticipants = async () => {
    const list = inputText
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
      
    if (list.length === 0) {
      showToast("List cannot be empty!", "error");
      return;
    }

    setParticipants(list);
    setShowDrawer(false);
    showToast("Participant list saved!");

    try {
      await fetch(`/api/raffle/participants?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: list })
      });
    } catch (err) {
      console.warn("[Raffle] Failed saving to server, local operating active.");
    }
  };

  // ── CLEAR HISTORY LOGS ───────────────────────────────────────────────────────
  const handleClearWinners = async () => {
    if (!confirm("Are you sure you want to clear all winner records for this event?")) return;
    setWinners([]);
    showToast("Winners log cleared!");
    try {
      await fetch(`/api/raffle/winners?room=${roomID}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("[Raffle] Failed clearing from server.");
    }
  };

  // ── CANVAS PHYSICS CONFETTI ENGINE ─────────────────────────────────────────────
  const setupConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const colors = ['#D946EF', '#8B5CF6', '#F5D193', '#EC4899', '#06B6D4', '#10B981'];
    const count = 180;
    const array = [];
    
    // Emitters from left, right and center
    for (let i = 0; i < count; i++) {
      const fromLeft = Math.random() < 0.4;
      const fromRight = !fromLeft && Math.random() < 0.6;
      
      array.push({
        x: fromLeft ? 0 : fromRight ? canvas.width : canvas.width / 2,
        y: fromLeft || fromRight ? canvas.height * 0.75 : canvas.height,
        vx: fromLeft 
          ? 8 + Math.random() * 12 
          : fromRight 
            ? -8 - Math.random() * 12 
            : -5 + Math.random() * 10,
        vy: -15 - Math.random() * 22,
        gravity: 0.45 + Math.random() * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 12,
        rotation: Math.random() * 360,
        rotationSpeed: -8 + Math.random() * 16,
        type: Math.random() < 0.25 ? 'star' : Math.random() < 0.25 ? 'ribbon' : 'circle'
      });
    }
    confettiParticles.current = array;
  };

  const updateAndRenderConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confettiParticles.current.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98; // Friction
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ribbon') {
        ctx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2);
      } else {
        // Draw Star
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(0, -p.size);
          ctx.rotate((Math.PI * 2) / 10);
          ctx.lineTo(0, -p.size / 2);
          ctx.rotate((Math.PI * 2) / 10);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  };

  return (
    <div className="fixed inset-0 bg-[#06030b] text-[#F8F4FF] overflow-hidden select-none font-dm">
      
      {/* ── BACKGROUND ESPORTS ATMOSPHERE ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.18)_0%,rgba(6,3,11,0.95)_75%)]" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(217,70,239,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Floating Esports particles */}
        <div className="absolute top-[20%] left-[15%] w-96 h-96 rounded-full bg-[#8B5CF6]/10 blur-[150px] animate-[pulse_6s_infinite]" />
        <div className="absolute bottom-[20%] right-[15%] w-[480px] h-[480px] rounded-full bg-[#D946EF]/8 blur-[180px] animate-[pulse_9s_infinite]" />
      </div>

      <canvas ref={confettiCanvasRef} className="absolute inset-0 pointer-events-none z-50" />

      {/* ── TOP ACTION HEADER BAR ── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-white/[0.06] bg-[#06030b]/80 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 max-w-[150px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          ) : (
            <div className="LuxeFont text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] text-lg font-bold tracking-[0.25em] uppercase">Vibe Sessions</div>
          )}
          <div className="w-[1px] h-6 bg-white/[0.08]" />
          <span className="font-syne text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#F5D193] px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5D193] animate-pulse" />
            Raffle Draw Event
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Draw Mode Selectors */}
          <div className="flex bg-black/40 border border-white/[0.08] p-1 rounded-xl">
            <button
              onClick={() => { if (!spinning) setDrawMode('slot'); }}
              disabled={spinning}
              className={`px-4 py-2 text-[10px] font-syne font-bold uppercase tracking-wider rounded-lg transition-all ${drawMode === 'slot' ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/35' : 'text-white/40 hover:text-white/80'}`}
            >
              🎰 Slot Reel
            </button>
            <button
              onClick={() => { if (!spinning) setDrawMode('roulette'); }}
              disabled={spinning}
              className={`px-4 py-2 text-[10px] font-syne font-bold uppercase tracking-wider rounded-lg transition-all ${drawMode === 'roulette' ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/35' : 'text-white/40 hover:text-white/80'}`}
            >
              🎡 Roulette
            </button>
          </div>

          <button
            onClick={() => setMuted(!muted)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all hover:bg-white/10 active:scale-95"
            title={muted ? "Unmute" : "Mute SFX"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <button
            onClick={() => setShowDrawer(true)}
            className="px-5 py-2.5 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30 text-white font-syne font-bold text-[10px] uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] active:scale-95 flex items-center gap-2"
          >
            <Settings size={13} /> Settings Drawer
          </button>
        </div>
      </header>

      {/* ── MAIN SCREEN BODY ── */}
      <div className="relative z-10 w-full h-[calc(100vh-80px)] flex">
        
        {/* LEFT COLUMN: MAIN DRAW MECHANICS (WHEEL / SLOT) */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
          
          <AnimatePresence mode="wait">
            {/* MODE A: SLOT MACHINE SHUFFLER */}
            {drawMode === 'slot' && (
              <motion.div
                key="slot-machine"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-8 w-full max-w-xl"
              >
                {/* 3D Glass Slot Cylinder */}
                <div className="relative w-full h-44 rounded-[2rem] border-2 border-[#F5D193]/35 bg-gradient-to-b from-[#110725]/90 via-[#070311]/97 to-[#110725]/90 p-1 shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden">
                  
                  {/* Top/Bottom shadow shading covers */}
                  <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#06030b] to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#06030b] to-transparent z-10 pointer-events-none" />

                  {/* Horizontal Alignment Guides */}
                  <div className="absolute inset-y-0 left-6 right-6 flex items-center justify-between pointer-events-none z-10">
                    <div className="w-1.5 h-16 rounded-full bg-[#F5D193] shadow-[0_0_15px_#F5D193]" />
                    <div className="w-1.5 h-16 rounded-full bg-[#F5D193] shadow-[0_0_15px_#F5D193]" />
                  </div>

                  {/* Golden Center Target Frame */}
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-20 rounded-2xl bg-[#F5D193]/[0.02] border border-[#F5D193]/30 pointer-events-none z-10 shadow-[inset_0_0_30px_rgba(245,209,147,0.1),0_0_40px_rgba(0,0,0,0.6)]" />

                  {/* Dynamic scrolling content strip */}
                  <div 
                    className="w-full flex flex-col items-center transition-transform duration-[40ms] ease-out"
                    style={{ transform: `translateY(calc(-${targetSlotIndex * 80}px + 44px))` }}
                  >
                    {slotItems.length === 0 ? (
                      <div className="h-20 flex items-center justify-center font-syne text-xl text-white/20 uppercase tracking-widest">
                        PULL LEVER TO DRAW
                      </div>
                    ) : (
                      slotItems.map((item, idx) => {
                        const isWinner = idx === targetSlotIndex;
                        return (
                          <div 
                            key={idx} 
                            style={{ height: '80px' }} 
                            className="flex items-center justify-center shrink-0 w-full"
                          >
                            <span 
                              className={`font-syne uppercase tracking-widest text-center truncate px-8 transition-all ${
                                isWinner 
                                  ? 'text-[36px] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] to-[#F5D193] drop-shadow-[0_0_20px_rgba(245,209,147,0.6)] scale-110' 
                                  : spinning 
                                    ? 'text-[24px] font-bold text-white/10 blur-[2px]' 
                                    : 'text-[26px] font-bold text-white/20'
                              }`}
                            >
                              {item}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* MODE B: ROULETTE WHEEL */}
            {drawMode === 'roulette' && (
              <motion.div
                key="roulette-wheel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="relative w-[500px] h-[500px] flex items-center justify-center"
              >
                {/* Pointer arrow at the top */}
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)] filter">
                  <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[34px] border-t-[#F5D193] filter drop-shadow-[0_0_10px_rgba(245,209,147,0.7)]" />
                </div>

                {/* Rotating Canvas */}
                <canvas 
                  ref={canvasRef} 
                  className="rounded-full shadow-[0_30px_90px_rgba(0,0,0,0.9)] bg-[#08060c]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* SPIN & DRAW BUTTONS (DOTA 2 STYLE) */}
          <div className="mt-14 z-20 flex flex-col items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={spinning || participants.length === 0}
              onClick={drawRaffleWinner}
              className={`relative overflow-hidden px-16 py-6 rounded-[1.2rem] text-white font-syne font-black uppercase text-sm tracking-[0.25em] flex items-center gap-3 transition-all ${
                spinning 
                  ? 'opacity-40 cursor-not-allowed bg-white/5 border border-white/10' 
                  : participants.length === 0
                    ? 'opacity-20 bg-white/5 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] shadow-[0_0_40px_rgba(217,70,239,0.35)] border border-white/10'
              }`}
            >
              {spinning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Drawing Winner...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-[#F5D193]" />
                  Draw Next Winner
                </>
              )}

              {/* Shine glow overlay */}
              {!spinning && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  style={{ transform: 'skewX(-20deg) translateX(-150%)', animation: 'shine 4s infinite' }}
                />
              )}
            </motion.button>
            <p className="text-[10px] font-syne uppercase tracking-widest text-[#7c6f9a] font-bold">
              {participants.length} Candidates Loaded
            </p>
          </div>
        </main>

        {/* RIGHT COLUMN: WINNERS HISTORY LOGS */}
        <aside className="w-[300px] border-l border-white/[0.06] bg-[#06030b]/60 backdrop-blur-3xl flex flex-col relative z-10 shrink-0">
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-widest text-[#D946EF] flex items-center gap-2">
              <Trophy size={13} /> Winners Log
            </h3>
            {winners.length > 0 && (
              <button
                onClick={handleClearWinners}
                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9px] font-syne uppercase font-bold tracking-wider transition-all"
                title="Reset Records"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {winners.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-25 gap-3">
                <Trophy size={32} className="text-white/40" />
                <p className="font-syne text-[10px] font-bold uppercase tracking-wider text-center">No winners drawn yet</p>
              </div>
            ) : (
              <AnimatePresence>
                {winners.map((winnerObj, idx) => (
                  <motion.div
                    key={winnerObj.id || idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-md flex items-center gap-4 relative overflow-hidden"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6]/30 to-[#D946EF]/30 flex items-center justify-center text-sm border border-[#D946EF]/20 shadow-lg text-[#F5D193]">
                      🏆
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-extrabold text-[13px] text-white truncate">{winnerObj.name.toUpperCase()}</p>
                      <p className="font-dm text-[9px] text-white/35 mt-0.5">
                        Drawn at {new Date(winnerObj.drawnAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="font-mono text-[#F5D193]/70 font-extrabold text-[11px]">#{winners.length - idx}</span>
                    
                    {/* Glowing side line */}
                    <div className="absolute top-0 right-0 w-[3px] h-full bg-gradient-to-b from-[#8B5CF6] to-[#D946EF]" />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="p-4 border-t border-white/[0.06] bg-black/40 text-center font-dm text-[9px] text-[#7c6f9a] italic leading-relaxed">
            Candidates sync automatically in real-time.<br/>Persistent across browser reloads.
          </div>
        </aside>
      </div>

      {/* ── SETTINGS DRAWER OVERLAY ── */}
      <AnimatePresence>
        {showDrawer && (
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999]"
            onClick={() => setShowDrawer(false)}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="absolute top-0 right-0 h-full w-[440px] max-w-full bg-[#06030b]/98 border-l border-white/[0.06] flex flex-col p-8 z-[1000]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.06]">
                <h3 className="font-syne text-sm font-extrabold uppercase tracking-widest text-[#8B5CF6] flex items-center gap-2">
                  <Settings size={15} /> Raffle Setup Console
                </h3>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:text-white text-white/50 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-6">
                
                {/* Candidate List Input */}
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between text-[11px] font-syne font-bold uppercase tracking-widest text-white/50">
                    <span>Candidates Pool</span>
                    <span className="text-[10px] font-mono text-[#D946EF]">{participants.length} Loaded</span>
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter one candidate name per line..."
                    className="w-full h-80 bg-white/[0.02] border border-white/10 rounded-2xl p-5 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 transition-all resize-none leading-relaxed"
                  />
                  <p className="text-[9px] text-white/20 italic">Type or paste candidate names. Empty entries will be skipped automatically.</p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => {
                      setInputText("");
                    }}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-syne font-bold text-[9px] uppercase tracking-wider hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                  >
                    Clear Pool
                  </button>
                  <button
                    onClick={handleSaveParticipants}
                    className="flex-1 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] rounded-2xl font-syne font-bold text-[9px] uppercase tracking-wider text-white hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check size={12} /> Sync & Save Candidates
                  </button>
                </div>

                {/* Info block */}
                <div className="p-5 rounded-2xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/15 flex items-start gap-4">
                  <HelpCircle size={18} className="text-[#8B5CF6] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Stand-alone Stage Sync</p>
                    <p className="text-[10px] text-white/40 leading-relaxed">You can open this page on any big screen TV. Updating candidates from this drawer will instantly sync across all connected raffle page instances.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.06] text-center font-dm text-[9px] text-[#7c6f9a]">
                Powered by Vibe Sessions Raffle Engine
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONGRATULATIONS MODAL CARD OVERLAY ── */}
      <AnimatePresence>
        {winner && showCelebration && (
          <motion.div
            key="celebration-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[5000] flex items-center justify-center p-6"
          >
            {/* Ambient Gold Halo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-[#F5D193]/10 blur-[180px] pointer-events-none animate-pulse" />

            <motion.div
              initial={{ scale: 0.85, y: 50, rotateX: 30 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.85, y: 50, rotateX: -30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 180, mass: 1 }}
              style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
              className="relative w-full max-w-[500px] bg-gradient-to-br from-[#1b1030] to-[#070311] border-2 border-[#F5D193] rounded-[3rem] p-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_80px_rgba(245,209,147,0.25)] flex flex-col items-center gap-6"
            >
              {/* Gold Ribbon Emblem */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#F5D193] to-[#b38f4d] flex items-center justify-center text-4xl border border-white/20 shadow-2xl shadow-[#F5D193]/30">
                🏆
              </div>

              <div className="space-y-1.5 mt-2">
                <span className="font-syne text-[10px] font-extrabold uppercase tracking-[0.45em] text-[#F5D193] animate-pulse">Congratulations</span>
                <h2 className="LuxeFont text-5xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] leading-tight">We Have A Winner</h2>
              </div>

              {/* Gold divider line */}
              <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-[#F5D193] to-transparent shadow-[0_0_15px_rgba(245,209,147,0.7)]" />

              {/* Sparkle effects around name */}
              <div className="relative py-4 w-full">
                <h1 className="font-syne font-black text-6xl text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] via-[#FFF] to-[#F5D193] filter drop-shadow-[0_0_25px_rgba(245,209,147,0.75)] uppercase tracking-widest line-clamp-2 px-4 leading-none">
                  {winner}
                </h1>
              </div>

              <div className="w-full pt-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCelebration(false)}
                  className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-[#F5D193] to-[#b38f4d] text-[#06030b] font-syne font-extrabold uppercase tracking-widest text-xs border border-white/25 shadow-xl transition-all shadow-[#F5D193]/15 flex items-center justify-center gap-2"
                >
                  <Award size={14} /> Claim Reward & Continue
                </motion.button>
              </div>

              {/* L-Brackets decorative corners */}
              <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-[#F5D193]/35 rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-[#F5D193]/35 rounded-tr-lg" />
              <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-[#F5D193]/35 rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-[#F5D193]/35 rounded-br-lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global CSS Shines */}
      <style>{`
        @keyframes shine {
          0% { transform: skewX(-20deg) translateX(-150%); }
          50% { transform: skewX(-20deg) translateX(150%); }
          100% { transform: skewX(-20deg) translateX(150%); }
        }
      `}</style>
    </div>
  );
}
