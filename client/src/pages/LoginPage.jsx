import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const params = new URLSearchParams(window.location.search);
  const roomID = params.get('room') || 'default';
  const redirect = params.get('redirect') || `/admin?room=${roomID}`;

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);

  useEffect(() => {
    // Check auth status
    fetch(`/api/auth/status?room=${roomID}`)
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          window.location.href = redirect;
          return;
        }
        setRoomInfo(data);
      })
      .catch(() => setRoomInfo({ requiresAuth: false }));
  }, [roomID]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomID, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem(`vibe_token_${roomID}`, data.token);
        localStorage.setItem(`vibe_room_name_${roomID}`, data.businessName || roomID);
        window.location.href = redirect;
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-[#04020a] flex items-center justify-center overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] rounded-full bg-[#8B5CF6]/15 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full bg-[#D946EF]/15 blur-[140px]" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Glass card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[32px] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          {/* Top glow line */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#D946EF]/60 to-transparent rounded-full" />

          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#D946EF] shadow-[0_0_30px_rgba(217,70,239,0.4)] mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h1 className="font-syne text-2xl font-extrabold text-white">Vibe Sessions</h1>
            <p className="font-dm text-white/40 text-sm">
              {roomInfo?.businessName || roomID.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
            <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="font-syne text-[9px] uppercase tracking-widest text-[#D946EF]">Admin Console Access</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40">Room</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white/60">
                {roomID}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your admin password"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 focus:ring-1 focus:ring-[#D946EF]/20 transition-all placeholder:text-white/20"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-dm text-xs"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading || !password.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] text-white font-syne font-bold uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(217,70,239,0.3)] disabled:opacity-40 transition-all"
            >
              {loading ? 'Authenticating...' : 'Access Console'}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="font-dm text-[10px] text-white/20">
              Powered by Vibe Sessions Studio Platform
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
