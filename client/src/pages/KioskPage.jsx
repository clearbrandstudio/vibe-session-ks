import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import socket from "../socket";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_YT_KEY = import.meta.env.VITE_YT_API_KEY || "";
const YT_BASE    = "https://www.googleapis.com/youtube/v3/search";

// Smart karaoke keywords per language — appended to every search query
const LANG_KEYWORDS = {
  all: ["karaoke", "karaoke 2024", "karaoke version"],
  en:  ["english karaoke", "karaoke english version", "english karaoke 2024"],
  km:  ["ខ្មែរ karaoke", "khmer karaoke", "cambodian song karaoke"],
  zh:  ["中文 karaoke", "chinese karaoke", "mandarin karaoke", "粤语 karaoke"],
  ms:  ["lagu karaoke melayu", "malaysia karaoke", "melayu karaoke"],
  ko:  ["한국어 karaoke", "kpop karaoke", "노래방", "korean karaoke"],
  th:  ["เพลงไทย karaoke", "thai karaoke", "ไทย karaoke"],
};

const KARAOKE_FILTERS = ["karaoke", "instrumental", "with lyrics", "sing along", "backing track"];

const LANGUAGES = [
  { id:"all", label:"All",     emoji:"🌐" },
  { id:"en",  label:"English" },
  { id:"km",  label:"Khmer"   },
  { id:"zh",  label:"Chinese" },
  { id:"ms",  label:"Malay"   },
  { id:"ko",  label:"Korean"  },
  { id:"th",  label:"Thai"    },
];

const CATEGORIES = [
  { id:"all",  label:"All Songs"     },
  { id:"pop",  label:"Pop"           },
  { id:"soul", label:"Soul & R&B"    },
  { id:"rock", label:"Classic Rock"  },
  { id:"kpop", label:"K-Pop"         },
  { id:"rnb",  label:"R&B / Hip-Hop" },
  { id:"ballad",label:"Ballad"       },
];

const TRENDING_CHIPS = [
  "Shape of You","Blinding Lights","Stay","Butter BTS",
  "Bohemian Rhapsody","As It Was","Heat Waves","Levitating",
  "Shallow","Someone Like You","Good 4 U","Dynamite BTS",
];

// ─── DESIGN TOKENS (Shared with Stage) ──────────────────────────────────────────
const T = {
  bg:"#04020a", 
  surface:"rgba(139,92,246,0.07)",
  border:"rgba(139,92,246,0.18)", 
  borderHot:"rgba(217,70,239,0.45)",
  purple:"#8B5CF6", 
  mag:"#D946EF", 
  pink:"#EC4899", 
  pl:"#F472B6",
  text:"#F8F4FF", 
  muted:"rgba(200,185,230,0.6)", 
  ghost:"rgba(139,92,246,0.35)",
  grad:"linear-gradient(135deg,#8B5CF6,#D946EF,#EC4899)",
  gradT:"linear-gradient(135deg,#F8F4FF 0%,#E9D5FF 30%,#F472B6 70%,#EC4899 100%)",
};

const FLAG_SVG = {
  en: `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#B22234"/><rect y="4.6" width="60" height="4.6" fill="#fff"/><rect y="13.8" width="60" height="4.6" fill="#fff"/><rect y="23" width="60" height="4.6" fill="#fff"/><rect y="32.2" width="60" height="4.6" fill="#fff"/><rect width="24" height="21.5" fill="#3C3B6E"/></svg>`,
  km: `<svg viewBox="0 0 60 40"><rect width="60" height="13.3" fill="#032EA1"/><rect y="13.3" width="60" height="13.3" fill="#E00025"/><rect y="26.7" width="60" height="13.3" fill="#032EA1"/></svg>`,
  zh: `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#DE2910"/><polygon points="10,4 12,10 18,10 13,14 15,20 10,16 5,20 7,14 2,10 8,10" fill="#FFDE00"/></svg>`,
  ms: `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#CC0001"/><rect y="5.7" width="60" height="5.7" fill="#fff"/><rect y="17.1" width="60" height="5.7" fill="#fff"/><rect y="28.6" width="60" height="5.7" fill="#fff"/><rect width="28" height="22" fill="#010066"/></svg>`,
  ko: `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="10" fill="#C60C30"/><path d="M30 10 A10 10 0 0 1 30 30" fill="#003478"/></svg>`,
  th: `<svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#A51931"/><rect y="6.7" width="60" height="6.7" fill="#fff"/><rect y="13.3" width="60" height="13.3" fill="#2D2A4A"/><rect y="26.7" width="60" height="6.7" fill="#fff"/></svg>`,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function searchYouTube(rawQuery, lang = "all", maxResults = 24, customKey = "") {
  const apiKey = customKey || DEFAULT_YT_KEY;
  if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY_HERE") throw new Error("Missing YouTube API Key");
  
  const langKw = lang !== "all" ? (LANG_KEYWORDS[lang]?.[0] || "karaoke") : "karaoke";
  const enforced = rawQuery.toLowerCase().includes("karaoke") ? rawQuery : `${rawQuery} ${langKw}`;

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    maxResults: String(maxResults),
    q: enforced,
    key: apiKey,
    safeSearch: "none",
    relevanceLanguage: lang === "all" ? "en" : lang,
    videoEmbeddable: "true",
  });

  const res = await fetch(`${YT_BASE}?${params}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return (data.items || [])
    .filter(item => {
      const title = (item.snippet.title || "").toLowerCase();
      const desc  = (item.snippet.description || "").toLowerCase();
      return KARAOKE_FILTERS.some(kw => title.includes(kw) || desc.includes(kw));
    })
    .map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title.replace(/\(karaoke.*?\)/gi, "").replace(/\[karaoke.*?\]/gi, "").trim(),
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    }));
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const Waveform = () => (
    <div className="flex gap-[2px] items-end h-[12px]">
      {[1, 1.3, 0.9].map((d, i) => (
        <div key={i} className="w-[2px] rounded-full bg-gradient-to-t from-[#8B5CF6] to-[#EC4899] animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDuration: `${d}s`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
);

const Atmo = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#04020a] z-0">
    <div className="absolute inset-0 opacity-55 animate-[meshA_9s_ease-in-out_infinite]">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 15% 25%, #4c1d95 0%, transparent 50%), radial-gradient(circle at 85% 75%, #db2777 0%, transparent 50%), radial-gradient(circle at 50% 50%, #7c3aed 0%, transparent 60%)' }} />
    </div>
    <div className="perspective-grid absolute inset-0 z-1 opacity-40" />
    <div className="scanlines absolute inset-0 z-3 pointer-events-none opacity-20" />
    <div className="radial-vignette absolute inset-0 z-5 pointer-events-none" />
  </div>
);

const Particles = () => {
    const ref = useRef(null);
    useEffect(() => {
      const c = ref.current; if (!c) return;
      const ctx = c.getContext("2d");
      let raf;
      const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
      resize(); window.addEventListener("resize", resize);
      const pts = Array.from({ length: 70 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.4 + 0.3,
        vy: -(Math.random() * 0.4 + 0.1),
        vx: (Math.random() - 0.5) * 0.2,
        a: Math.random() * 0.4 + 0.05,
        h: Math.random() > 0.5 ? 280 : 320
      }));
      const loop = () => {
        ctx.clearRect(0, 0, c.width, c.height);
        pts.forEach(p => {
          p.y += p.vy; p.x += p.vx;
          if (p.y < -5) { p.y = c.height + 5; p.x = Math.random() * c.width; }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.h}, 90%, 70%, ${p.a})`; ctx.fill();
        });
        raf = requestAnimationFrame(loop);
      };
      loop();
      return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, []);
    return <canvas ref={ref} className="fixed inset-0 z-4 pointer-events-none" />;
};

const QueueItem = ({ song, index, onCancel }) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={song}
      dragListener={false}
      dragControls={dragControls}
      as="div"
      className="group relative flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-transparent hover:border-[#ec4899]/18 transition-all"
    >
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing p-1 text-white/20 hover:text-white/60 transition-colors shrink-0"
      >
        <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
          <circle cx="2" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="2" cy="15" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="9" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="15" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div className="text-[9px] font-syne text-[#8b5cf6]/35 w-4 text-center shrink-0">{index + 1}</div>
      <div className="w-10 h-7 rounded-lg overflow-hidden border border-white/5 shrink-0">
        <img src={song.thumbnail} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <div className="text-[10px] font-bold truncate">{song.title}</div>
        <div className="text-[9px] text-[#7c6f9a] truncate">{song.singerName}</div>
      </div>
      <button 
        onClick={() => onCancel(song)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#ec4899]/14 text-[#ec4899] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ec4899]/25"
      >
        ✕
      </button>
    </Reorder.Item>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function KioskPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState("all");
  const [activeCat, setActiveCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [singerName, setSingerName] = useState("");
  const [addedSong, setAddedSong] = useState(null);
  const [cancelSong, setCancelSong] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem("VIBE_YT_KEY") || "");
  const [businessName, setBusinessName] = useState("Vibe Sessions");
  const [promoText, setPromoText] = useState("");
  const [prepDuration, setPrepDuration] = useState(15);
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [shakeInput, setShakeInput] = useState(false);

  // Temp settings values for modal
  const [tempApiKey, setTempApiKey] = useState("");
  const [tempBusinessName, setTempBusinessName] = useState("");
  const [tempPromoText, setTempPromoText] = useState("");
  const [tempPrepDuration, setTempPrepDuration] = useState(15);

  const [showCancelCurrentModal, setShowCancelCurrentModal] = useState(false);

  // Server state sync
  const [serverQueue, setServerQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [currentPrep, setCurrentPrep] = useState(null);

  const singerRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast({ show: true, msg });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2600);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';

    // Initial fetch
    handleSearch("karaoke hits 2024", "all");

    // Settings Fetch
    fetch(`/api/settings?room=${roomID}`)
      .then(res => res.json())
      .then(data => {
        if (data.businessName) setBusinessName(data.businessName);
        if (data.promoText) setPromoText(data.promoText);
        if (data.prepDuration) setPrepDuration(data.prepDuration);
        if (data.youtubeApiKey) setCustomApiKey(data.youtubeApiKey);
      });

    // settings updated listener
    const onSettingsUpdated = (newSettings) => {
      if (newSettings.businessName) setBusinessName(newSettings.businessName);
      if (newSettings.promoText) setPromoText(newSettings.promoText);
      if (newSettings.prepDuration) setPrepDuration(newSettings.prepDuration);
      if (newSettings.youtubeApiKey) setCustomApiKey(newSettings.youtubeApiKey);
    };
    socket.on("settings:updated", onSettingsUpdated);

    // Socket listeners
    const onSync = ({ queue, currentSong, currentPrep }) => {
      setServerQueue(queue || []);
      setCurrentSong(currentSong);
      setCurrentPrep(currentPrep);
    };
    const onUpdate = ({ queue, currentSong, currentPrep }) => {
      setServerQueue(queue || []);
      setCurrentSong(currentSong);
      setCurrentPrep(currentPrep);
    };

    socket.on("state:sync", onSync);
    socket.on("queue:updated", onUpdate);

    return () => {
      socket.off("state:sync", onSync);
      socket.off("queue:updated", onUpdate);
      socket.off("settings:updated", onSettingsUpdated);
    };
  }, []);

  const handleSearch = async (query, lang = activeLang) => {
    if (!query) return;
    setLoading(true);
    setSearchQuery(query);
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&room=${roomID}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      console.error(err);
      showToast("Search error — please try again later");
    } finally {
      setLoading(false);
    }
  };

  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingSong, setPendingSong] = useState(null);

  const queueSongToServer = (song) => {
    if (serverQueue.some(s => s.videoId === song.videoId && s.singerName === singerName.trim())) {
      showToast("Already queued this song under your name!");
      return;
    }
    
    socket.emit("queue:add", {
      ...song,
      singerName: singerName.trim()
    });

    setAddedSong({ song, position: serverQueue.length + 1 });
    showToast(`Reserved "${song.title}"!`);
  };

  const handleSongClick = (song) => {
    setPendingSong(song);
    setShowNamePrompt(true);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (singerName.trim() && pendingSong) {
      queueSongToServer(pendingSong);
      setPendingSong(null);
      setShowNamePrompt(false);
    } else if (!singerName.trim()) {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 400);
    }
  };

  const removeSongFromServer = (id) => {
    socket.emit("queue:remove", { id });
    setCancelSong(null);
    showToast("Removed song from queue");
  };

  const handleReorder = (newQueue) => {
    setServerQueue(newQueue);
    socket.emit("queue:reorder", { queue: newQueue });
  };

  const saveSettings = async (key, bName, pText, duration) => {
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';

    try {
      const res = await fetch(`/api/settings?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeApiKey: key,
          businessName: bName,
          promoText: pText,
          prepDuration: parseInt(duration) || 15
        })
      });
      const data = await res.json();
      if (data.success) {
        setCustomApiKey(key);
        setBusinessName(bName);
        setPromoText(pText);
        setPrepDuration(parseInt(duration) || 15);
        setShowSettings(false);
        showToast("Settings saved to server!");
        handleSearch(searchValue || "karaoke hits 2024");
      }
    } catch (err) {
      showToast("Failed to save settings to server");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#04020a] text-[#F8F4FF] font-dm overflow-hidden flex flex-col z-[100]">
      <Atmo />
      <Particles />

      {/* NAV BAR */}
      <nav className="relative z-[100] flex items-center gap-4 px-6 py-3 border-b border-[#8b5cf6]/18 bg-[#040202]/88 backdrop-blur-2xl">
        <div className="LuxeFont text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] text-sm font-bold tracking-[0.3em] uppercase animate-[glow_3s_infinite] shrink-0">
          {businessName || 'Vibe Sessions'}
        </div>
        <div className="flex-1" />
        
        {/* Search Bar */}
        <div className="flex-1 max-w-[520px] relative">
          <div className={`flex items-center bg-[#8b5cf6]/9 border rounded-full px-4 py-1.5 transition-all ${focused ? 'border-[#d946ef]/45 ring-4 ring-[#d946ef]/10' : 'border-[#8b5cf6]/18'}`}>
            <span className="opacity-50 mr-2">🔍</span>
            <input 
              className="bg-transparent border-none outline-none flex-1 text-sm text-[#F8F4FF]"
              placeholder="Search songs, artists..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => { setFocused(true); setShowSugg(true); }}
              onBlur={() => { setFocused(false); setTimeout(() => setShowSugg(false), 200); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchValue)}
            />
            {/* Lang Badge */}
            <div className="flex items-center gap-1.5 bg-[#8b5cf6]/15 border border-[#8b5cf6]/25 rounded-full px-2 py-1 cursor-pointer shrink-0">
               <div className="w-4 h-4 rounded-full overflow-hidden" dangerouslySetInnerHTML={{ __html: activeLang === 'all' ? '🌐' : FLAG_SVG[activeLang] }} />
               <span className="text-[10px] font-syne font-bold uppercase tracking-wider">{LANGUAGES.find(l => l.id === activeLang)?.label}</span>
            </div>
            <button 
              onClick={() => handleSearch(searchValue)}
              className="ml-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-syne text-[10px] font-bold uppercase px-4 py-1.5 rounded-full shadow-lg"
            >
              Search
            </button>
          </div>

          {/* Search Suggestions */}
          <AnimatePresence>
            {showSugg && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-full left-0 right-0 mt-3 bg-[#0c061a]/97 border border-[#d946ef]/45 rounded-[18px] backdrop-blur-3xl shadow-2xl p-4 overflow-hidden"
              >
                <div className="text-[9px] font-syne font-bold uppercase tracking-[0.35em] text-[#8b5cf6]/35 mb-2">Trending</div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_CHIPS.map(chip => (
                    <button 
                      key={chip} 
                      onClick={() => { setSearchValue(chip); handleSearch(chip); setShowSugg(false); }}
                      className="px-3 py-1 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[10px] text-[#C4B5FD] hover:bg-[#d946ef]/15 hover:border-[#d946ef]/45 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <button className="flex items-center gap-2 bg-[#8b5cf6]/7 border border-[#8b5cf6]/18 rounded-full px-4 py-1.5 font-syne font-bold text-[10px] tracking-wider uppercase">
            <span className="text-[#8B5CF6]">Queue</span>
            <span className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] px-2 py-0.5 rounded-full text-white">{serverQueue.length}</span>
          </button>
        </div>
      </nav>

      {/* Floating Settings Gear (top right for easy access) */}
      <button 
        onClick={() => {
          setTempApiKey(customApiKey);
          setTempBusinessName(businessName);
          setTempPromoText(promoText);
          setTempPrepDuration(prepDuration);
          setShowSettings(true);
        }}
        className="fixed top-3 right-3 z-[200] w-10 h-10 rounded-full bg-[#0c061a]/80 backdrop-blur-xl border border-[#8b5cf6]/30 flex items-center justify-center text-[#8b5cf6] hover:text-[#d946ef] hover:border-[#d946ef]/60 transition-all shadow-2xl group"
      >
        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      <div className="flex-1 flex overflow-hidden relative z-[50]">
        {/* SIDE NAV / CATEGORIES */}
        <aside className="w-[200px] p-4 border-r border-[#8b5cf6]/18 space-y-2 overflow-y-auto bg-[#04020a]/40">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => { setActiveCat(cat.id); handleSearch(`${cat.label} karaoke`); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all ${activeCat === cat.id ? 'bg-[#8b5cf6]/12 border border-[#d946ef]/45 text-white' : 'text-[#c8b9e6]/60 hover:bg-white/5'}`}
            >
              <div className={`w-2 h-2 rounded-full ${activeCat === cat.id ? 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] shadow-[0_0_8px_rgba(217,70,239,0.6)]' : 'bg-[#8b5cf6]/30'}`} />
              <span className="text-xs font-syne font-bold uppercase tracking-wide">{cat.label}</span>
            </button>
          ))}
        </aside>

        {/* SONG GRID */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#04020a]/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-8 shrink-0">
            <div className="flex items-center gap-4 font-syne text-[11px] font-bold uppercase tracking-[0.4em] text-[#8B5CF6]">
              {loading && <div className="w-5 h-5 border-2 border-[#d946ef]/25 border-t-[#d946ef] rounded-full animate-spin" />}
              {searchQuery ? `Results: "${searchQuery}"` : "Discover High-Fidelity Tracks"}
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar px-2 max-w-[400px]">
              {LANGUAGES.map(lang => (
                <button 
                  key={lang.id} 
                  onClick={() => { setActiveLang(lang.id); handleSearch(searchValue || "karaoke hits 2024", lang.id); }}
                  className={`flex flex-col items-center gap-2 shrink-0 ${activeLang === lang.id ? 'opacity-100' : 'opacity-40 hover:opacity-60'} transition-all`}
                >
                  <div className={`w-10 h-10 rounded-full overflow-hidden border-2 p-0.5 ${activeLang === lang.id ? 'border-[#d946ef] shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'border-transparent'}`}>
                    <div className="w-full h-full rounded-full overflow-hidden" dangerouslySetInnerHTML={{ __html: lang.id === 'all' ? `<div class="bg-indigo-900/50 w-full h-full flex items-center justify-center text-lg">🌐</div>` : FLAG_SVG[lang.id] }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-32">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-40">
                <div className="w-10 h-10 border-2 border-[#d946ef]/25 border-t-[#d946ef] rounded-full animate-spin" />
                <span className="text-sm font-syne uppercase tracking-widest">Optimizing results for you...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-30 gap-4">
                <span className="text-5xl animate-bounce">🔍</span>
                <span className="text-sm font-syne uppercase tracking-[0.3em]">No matching tracks found</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((song, i) => (
                  <motion.div 
                    key={song.videoId}
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ delay: (i % 9) * 0.05 }}
                    onClick={() => handleSongClick(song)}
                    className={`group relative overflow-hidden rounded-2xl bg-[#8b5cf6]/5 border border-[#8b5cf6]/10 hover:border-[#d946ef]/40 transition-all cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(217,70,239,0.15)] ${serverQueue.some(s => s.videoId === song.videoId) ? 'bg-[#8b5cf6]/15 border-[#d946ef]/60 ring-2 ring-[#d946ef]/20' : ''}`}
                  >
                    {/* Thumbnail 16:9 */}
                    <div className="aspect-video w-full overflow-hidden bg-black/40 relative">
                      <img src={song.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={song.title} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                      
                      {/* Queue Status Overlay */}
                      {serverQueue.some(s => s.videoId === song.videoId) && (
                        <div className="absolute inset-0 bg-[#d946ef]/20 backdrop-blur-[2px] flex items-center justify-center">
                           <div className="bg-white text-[#d946ef] font-syne font-bold text-[10px] px-3 py-1 rounded-full shadow-xl animate-pulse">ALREADY QUEUED</div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-1 relative">
                      <h4 className="text-[14px] font-syne font-bold line-clamp-2 leading-tight group-hover:text-[#D946EF] transition-colors capitalize">{song.title.toLowerCase()}</h4>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-[#7c6f9a] font-medium tracking-wide truncate flex-1">{song.channel}</p>
                        <div className="shrink-0 w-8 h-8 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#8B5CF6] group-hover:bg-[#d946ef] group-hover:text-white group-hover:border-[#d946ef] transition-all shadow-lg group-active:scale-90">
                           <span className="text-lg font-bold leading-none">+</span>
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Light */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#d946ef]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* QUEUE SIDEBAR */}
        <aside className="w-[300px] border-l border-[#8b5cf6]/18 bg-[#04020a]/68 backdrop-blur-3xl flex flex-col shrink-0">
          <div className="p-5 border-b border-[#8b5cf6]/18 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-syne text-[10px] font-bold uppercase tracking-[0.35em] text-[#8B5CF6]">Stage Queue</h3>
              <span className="text-[9px] text-[#8b5cf6]/50 uppercase font-bold">{serverQueue.length} active</span>
            </div>
            
            <div className={`relative ${shakeInput ? 'animate-[shake_0.3s_ease]' : ''}`}>
              <input 
                 ref={singerRef}
                 className="w-full bg-[#0c051a] border border-[#8b5cf6]/30 text-white placeholder-[#7c6f9a]/40 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#d946ef] transition-all"
                 placeholder="Your Name (e.g. Sam S.)"
                 value={singerName}
                 onChange={(e) => setSingerName(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 border-b border-[#8b5cf6]/18 bg-white/5">
             <div className="flex items-center gap-2 font-syne text-[9px] font-bold uppercase tracking-[0.4em] text-[#D946EF] mb-3">
                <Waveform /> Now Performing
             </div>
             {currentSong ? (
               <div className="flex items-center gap-3 animate-[fadeIn_0.5s_ease]">
                 <div className="w-10 h-7 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-xs">🎤</div>
                 <div className="flex-1 min-w-0 px-1">
                    <div className="text-[11px] font-bold truncate">{currentSong.title}</div>
                    <div className="text-[9px] text-[#7c6f9a] truncate">{currentSong.singerName}</div>
                 </div>
                 <button
                   onClick={() => setShowCancelCurrentModal(true)}
                   className="px-2.5 py-1 rounded-full bg-[#ec4899]/15 text-[#ec4899] hover:bg-[#ec4899]/25 text-[8px] font-syne font-bold uppercase tracking-wider transition-all shrink-0"
                   title="Stop current performance"
                 >
                   Stop
                 </button>
               </div>
             ) : (
               <div className="text-[10px] text-[#7c6f9a]/30 italic text-center py-2 uppercase tracking-tighter">No live performer</div>
             )}
          </div>

          {serverQueue.length === 0 ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-3 opacity-20">
              <span className="text-3xl">🎶</span>
              <p className="text-[11px] text-center font-syne uppercase tracking-wider">Queue is Empty</p>
            </div>
          ) : (
            <Reorder.Group 
              values={serverQueue} 
              onReorder={handleReorder} 
              className="flex-1 overflow-y-auto p-4 space-y-2"
              axis="y"
            >
              {serverQueue.map((song, i) => (
                <QueueItem 
                  key={song.id} 
                  song={song} 
                  index={i} 
                  onCancel={setCancelSong} 
                />
              ))}
            </Reorder.Group>
          )}

          <div className="p-5 border-t border-[#8b5cf6]/18 shrink-0 text-center bg-[#0c051a]/40">
             <p className="text-[10px] font-syne font-bold uppercase tracking-wider text-[#c8b9e6]/50 mb-1">Select a song to book</p>
             <p className="text-[9px] text-[#7c6f9a]/70 italic leading-relaxed">It will instantly sync to the stage screen.</p>
          </div>
        </aside>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {cancelSong && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md" onClick={() => setCancelSong(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0c051a]/97 border border-[#d946ef]/45 rounded-3xl p-8 max-w-[340px] w-full shadow-[0_0_60px_rgba(217,70,239,0.2)]"
              onClick={e => e.stopPropagation()}
            >
               <div className="w-14 h-14 rounded-2xl bg-[#ec4899]/12 border border-[#ec4899]/24 flex items-center justify-center mx-auto mb-4 text-2xl text-[#EC4899]">✕</div>
               <h3 className="LuxeFont text-xl text-center mb-6">Remove this song?</h3>
               <div className="flex gap-4">
                  <button onClick={() => setCancelSong(null)} className="flex-1 py-3 rounded-full border border-[#8b5cf6]/18 text-[10px] font-bold uppercase tracking-widest text-[#F8F4FF]/60 hover:text-white transition-all">Keep</button>
                  <button onClick={() => removeSongFromServer(cancelSong.id)} className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#EC4899] to-[#D946EF] text-white text-[10px] font-bold uppercase tracking-widest">Remove</button>
               </div>
            </motion.div>
          </div>
        )}
        
        {addedSong && (
           <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md" onClick={() => setAddedSong(null)}>
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
               className="bg-[#0c051a]/97 border border-[#d946ef]/45 rounded-[40px] p-10 max-w-[360px] w-full shadow-2xl text-center"
               onClick={e => e.stopPropagation()}
             >
                <div className="w-20 h-20 rounded-[28px] bg-[#8b5cf6]/12 border border-[#8b5cf6]/24 flex items-center justify-center mx-auto mb-8">
                   <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-4xl text-[#A78BFA]">✓</motion.span>
                </div>
                <h2 className="LuxeFont text-3xl mb-3 text-gradient-broadcast">Success!</h2>
                <p className="text-[13px] text-[#c8b9e6]/60 mb-10 px-4 leading-relaxed">Song reserved at position <span className="text-[#D946EF] font-bold">#{addedSong.position}</span> in the stage queue.</p>
                <button onClick={() => setAddedSong(null)} className="w-full py-4 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] text-white text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">Keep Searching</button>
             </motion.div>
           </div>
         )}
        {showNamePrompt && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={() => { setShowNamePrompt(false); setPendingSong(null); }}>
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c051a]/97 border border-[#d946ef]/60 rounded-[40px] p-10 max-w-[400px] w-full shadow-[0_0_80px_rgba(217,70,239,0.25)] text-center relative"
              onClick={e => e.stopPropagation()}
            >
               <button onClick={() => { setShowNamePrompt(false); setPendingSong(null); }} className="absolute top-6 right-6 text-[#8b5cf6]/35 hover:text-white transition-all">✕</button>
               
               <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#8B5CF6] to-[#D946EF] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#8B5CF6]/20">
                 <span className="text-4xl text-white">🎤</span>
               </div>
               
               <h2 className="LuxeFont text-3xl mb-2 text-gradient-broadcast">Who's Singing?</h2>
               <p className="text-[13px] text-[#c8b9e6]/60 mb-8 leading-relaxed">We need your name to show it on the <br/>stage animations for <span className="text-[#D946EF] font-bold">"{pendingSong?.title}"</span></p>
               
               <form onSubmit={handleNameSubmit} className="space-y-6">
                 <div className={`relative ${shakeInput ? 'animate-[shake_0.4s_ease]' : ''}`}>
                    <input 
                      autoFocus
                      className="w-full bg-[#0c051a] border border-[#8b5cf6]/35 text-white rounded-2xl px-6 py-4 text-base text-center outline-none focus:border-[#d946ef] transition-all placeholder:text-[#7c6f9a]/40"
                      placeholder="Enter Your Name..."
                      value={singerName}
                      onChange={(e) => setSingerName(e.target.value)}
                    />
                 </div>
                 <button 
                   type="submit"
                   className="w-full py-4 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] text-white text-[11px] font-bold uppercase tracking-[0.25em] shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                 >
                   Confirm & Reserve
                 </button>
               </form>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl" onClick={() => setShowSettings(false)}>
            <motion.div 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="bg-[#0c051a]/97 border border-[#8b5cf6]/18 rounded-[32px] p-8 max-w-[420px] w-full shadow-2xl relative overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
               <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-[#8b5cf6]/35 hover:text-white transition-all">✕</button>
               <h3 className="font-syne text-[11px] font-bold uppercase tracking-[0.5em] text-[#8B5CF6] mb-8">Service Settings</h3>
               
               <div className="space-y-6">
                 <div>
                   <label className="block font-syne text-[9px] uppercase tracking-widest text-[#7c6f9a] mb-2">Event / Show Title</label>
                   <input 
                      type="text"
                      className="w-full bg-[#0c051a] border border-[#8b5cf6]/30 rounded-2xl px-5 py-3 text-xs outline-none focus:border-[#d946ef] transition-all text-[#F8F4FF] placeholder-[#7c6f9a]/40"
                      placeholder="e.g. John's Birthday, Vibe Sessions Studio..."
                      value={tempBusinessName}
                      onChange={(e) => setTempBusinessName(e.target.value)}
                   />
                 </div>

                 <div>
                   <label className="block font-syne text-[9px] uppercase tracking-widest text-[#7c6f9a] mb-2">Slogan / Rolling Text Bar</label>
                   <input 
                      type="text"
                      className="w-full bg-[#0c051a] border border-[#8b5cf6]/30 rounded-2xl px-5 py-3 text-xs outline-none focus:border-[#d946ef] transition-all text-[#F8F4FF] placeholder-[#7c6f9a]/40"
                      placeholder="e.g. Get 20% off all drinks at the bar! 🎤"
                      value={tempPromoText}
                      onChange={(e) => setTempPromoText(e.target.value)}
                   />
                 </div>

                 <div>
                   <label className="block font-syne text-[9px] uppercase tracking-widest text-[#7c6f9a] mb-2">Singer Loading Time (Seconds)</label>
                   <select 
                      className="w-full bg-[#0c051a] border border-[#8b5cf6]/30 rounded-2xl px-5 py-3 text-xs outline-none focus:border-[#d946ef] transition-all text-[#F8F4FF]"
                      value={tempPrepDuration}
                      onChange={(e) => setTempPrepDuration(parseInt(e.target.value))}
                   >
                      <option value={5}>5 seconds (Fastest)</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds (Standard)</option>
                      <option value={20}>20 seconds</option>
                      <option value={30}>30 seconds (Long showcase)</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                   </select>
                 </div>

                 <div>
                   <label className="block font-syne text-[9px] uppercase tracking-widest text-[#7c6f9a] mb-2">YouTube API Key</label>
                   <input 
                      type="password"
                      className="w-full bg-[#0c051a] border border-[#8b5cf6]/30 rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#d946ef] transition-all font-mono text-[#F8F4FF] placeholder-[#7c6f9a]/40"
                      placeholder="Paste your key here..."
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                   />
                   <p className="mt-2 text-[8px] text-[#7c6f9a]/60 leading-relaxed italic">Synchronized instantly to Stage and all connected Kiosks.</p>
                 </div>

                 <button 
                   onClick={() => saveSettings(tempApiKey, tempBusinessName, tempPromoText, tempPrepDuration)}
                   className="w-full py-4 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-syne text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                 >
                   Save & Sync Configuration
                 </button>
               </div>
            </motion.div>
          </div>
        )}
        {showCancelCurrentModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl" onClick={() => setShowCancelCurrentModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c051a]/97 border border-[#ec4899]/60 rounded-[32px] p-8 max-w-[360px] w-full shadow-[0_0_60px_rgba(236,72,153,0.25)] text-center relative"
              onClick={e => e.stopPropagation()}
            >
               <button onClick={() => setShowCancelCurrentModal(false)} className="absolute top-6 right-6 text-[#8b5cf6]/35 hover:text-white transition-all">✕</button>
               
               <div className="w-14 h-14 rounded-2xl bg-[#ec4899]/12 border border-[#ec4899]/24 flex items-center justify-center mx-auto mb-4 text-2xl text-[#EC4899]">⚠️</div>
               
               <h3 className="LuxeFont text-xl text-center mb-2">Stop Performance?</h3>
               <p className="text-[11px] text-[#c8b9e6]/60 mb-6 leading-relaxed">Are you sure to stop the current song being performed?</p>
               
               <div className="flex gap-4">
                  <button onClick={() => setShowCancelCurrentModal(false)} className="flex-1 py-3 rounded-full border border-[#8b5cf6]/18 text-[10px] font-bold uppercase tracking-widest text-[#F8F4FF]/60 hover:text-white transition-all">No</button>
                  <button 
                    onClick={() => {
                      socket.emit("queue:next");
                      setShowCancelCurrentModal(false);
                      showToast("Stopping current performance");
                    }}
                    className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#EC4899] to-[#D946EF] text-white text-[10px] font-bold uppercase tracking-widest"
                  >
                    Yes, Stop
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[3000] px-8 py-4 rounded-full bg-[#0c051a]/95 border border-[#d946ef]/45 text-[10px] font-syne font-bold uppercase tracking-[0.2em] text-[#F8F4FF] shadow-2xl transition-all duration-700 flex items-center gap-4 pointer-events-none ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
         <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] shadow-[0_0_15px_rgba(217,70,239,0.9)]" />
         {toast.msg}
      </div>
    </div>
  );
}
