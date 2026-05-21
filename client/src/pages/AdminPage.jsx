import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Save, Layout, Tv, Megaphone, CheckCircle2, AlertCircle, 
  Trash2, Plus, ArrowUp, ArrowDown, Play, ExternalLink, Image as ImageIcon, 
  Clock, Sparkles, Volume2, Power, Eye, Edit2, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';

const InputField = ({ label, value, onChange, placeholder, icon: Icon, type = 'text', textarea = false }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-[11px] font-syne font-bold uppercase tracking-widest text-white/50">
      {Icon && <Icon size={13} className="text-[#8B5CF6]" />}
      {label}
    </label>
    <div className="relative">
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 focus:ring-1 focus:ring-[#D946EF]/20 transition-all resize-none h-24"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 focus:ring-1 focus:ring-[#D946EF]/20 transition-all"
        />
      )}
    </div>
  </div>
);

export default function AdminPage() {
  const params = new URLSearchParams(window.location.search);
  const roomID = params.get('room') || 'default';

  // Config State
  const [settings, setSettings] = useState({
    businessName: '',
    youtubeApiKeySet: false,
    youtubeApiKeyInput: '',
    promoText: '',
    prepDuration: 15,
    vignette: 25,
    brightness: 115,
    contrast: 100,
    overlayOpacity: 25,
    ambientMode: 'bar',
    // Promo Display Engine
    promoPosition: 'bottom-right',
    promoAnimation: 'slide',
    promoDuration: 20,
    promoGap: 60,
    // Ticker timing
    tickerMode: 'intro',
    tickerDuration: 30
  });

  // Feature Lists
  const [promos, setPromos] = useState([]);
  const [idlePlaylist, setIdlePlaylist] = useState([]);

  // Editor States
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // UI Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Load configuration
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const settingsRes = await fetch(`/api/settings?room=${roomID}`);
        const settingsData = await settingsRes.json();
        setSettings({
          businessName: settingsData.businessName || '',
          youtubeApiKeySet: settingsData.youtubeApiKeySet || false,
          youtubeApiKeyInput: '',
          promoText: settingsData.promoText || '',
          prepDuration: settingsData.prepDuration || 15,
          vignette: settingsData.vignette !== undefined ? settingsData.vignette : 25,
          brightness: settingsData.brightness !== undefined ? settingsData.brightness : 115,
          contrast: settingsData.contrast !== undefined ? settingsData.contrast : 100,
          overlayOpacity: settingsData.overlayOpacity !== undefined ? settingsData.overlayOpacity : 25,
          ambientMode: settingsData.ambientMode || 'bar',
          // Promo Display Engine
          promoPosition: settingsData.promoPosition || 'bottom-right',
          promoAnimation: settingsData.promoAnimation || 'slide',
          promoDuration: settingsData.promoDuration !== undefined ? settingsData.promoDuration : 20,
          promoGap: settingsData.promoGap !== undefined ? settingsData.promoGap : 60,
          // Ticker timing
          tickerMode: settingsData.tickerMode || 'intro',
          tickerDuration: settingsData.tickerDuration !== undefined ? settingsData.tickerDuration : 30
        });

        const promosRes = await fetch(`/api/promos?room=${roomID}`);
        const promosData = await promosRes.json();
        setPromos(promosData || []);

        const playlistRes = await fetch(`/api/idle-playlist?room=${roomID}`);
        const playlistData = await playlistRes.json();
        setIdlePlaylist(playlistData || []);

        setLoading(false);
      } catch (err) {
        console.error('[Admin] Error loading setup data:', err);
        setLoading(false);
      }
    };
    loadAllData();
  }, [roomID]);

  // Toast notifier
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Save Settings configuration
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Build payload — only include API key if user typed a new one
      const payload = {
        businessName: settings.businessName,
        promoText: settings.promoText,
        prepDuration: settings.prepDuration,
        vignette: settings.vignette,
        brightness: settings.brightness,
        contrast: settings.contrast,
        overlayOpacity: settings.overlayOpacity,
        ambientMode: settings.ambientMode,
        // Promo Display Engine
        promoPosition: settings.promoPosition,
        promoAnimation: settings.promoAnimation,
        promoDuration: settings.promoDuration,
        promoGap: settings.promoGap,
        // Ticker timing
        tickerMode: settings.tickerMode,
        tickerDuration: settings.tickerDuration
      };
      if (settings.youtubeApiKeyInput && settings.youtubeApiKeyInput.trim().length > 5) {
        payload.youtubeApiKey = settings.youtubeApiKeyInput.trim();
      }

      const res = await fetch(`/api/settings?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // Update key status from server response
        setSettings(s => ({ ...s, youtubeApiKeySet: data.youtubeApiKeySet || s.youtubeApiKeySet, youtubeApiKeyInput: '' }));
        showToast('Configuration synced to room displays!');
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast('Network error saving settings', 'error');
    }
    setSaving(false);
  };

  // Ambient Mode Presets
  const applyPreset = (mode) => {
    let presetValues = {};
    if (mode === 'dark') {
      presetValues = { brightness: 75, contrast: 120, vignette: 50, overlayOpacity: 50 };
    } else if (mode === 'bright') {
      presetValues = { brightness: 145, contrast: 95, vignette: 10, overlayOpacity: 15 };
    } else if (mode === 'bar') {
      presetValues = { brightness: 120, contrast: 105, vignette: 20, overlayOpacity: 20 };
    } else {
      // balanced / cinema
      presetValues = { brightness: 115, contrast: 100, vignette: 25, overlayOpacity: 25 };
    }
    setSettings(s => ({
      ...s,
      ambientMode: mode,
      ...presetValues
    }));
    showToast(`Ambient preset: ${mode.toUpperCase()} applied!`);
    // Auto-save the preset immediately
    setTimeout(async () => {
      try {
        await fetch(`/api/settings?room=${roomID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ambientMode: mode, ...presetValues })
        });
      } catch (e) {}
    }, 100);
  };

  // --- Promo Cards CRUD Helper Functions ---
  const selectOrCreatePromo = (promo = null) => {
    if (promo) {
      setSelectedPromo({ ...promo });
    } else {
      setSelectedPromo({
        id: `promo-${Date.now()}`,
        type: 'dish',
        title: 'Crispy Pork Belly',
        subtitle: "Chef's Special",
        price: '$12.99',
        originalPrice: '$18.99',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
        badgeText: '🔥 HOT DEAL',
        badgeColor: '#eb3422',
        schedule: { startHour: 0, endHour: 24 },
        enabled: true
      });
    }
  };

  const handleSavePromo = async () => {
    if (!selectedPromo) return;
    if (!selectedPromo.title) {
      showToast('Card title is required', 'error');
      return;
    }

    let newList = [];
    if (promos.some(p => p.id === selectedPromo.id)) {
      newList = promos.map(p => p.id === selectedPromo.id ? selectedPromo : p);
    } else {
      newList = [...promos, selectedPromo];
    }

    try {
      const res = await fetch(`/api/promos?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      const data = await res.json();
      if (data.success) {
        setPromos(data.promos);
        showToast('Promo stinger saved and synced!');
      }
    } catch (e) {
      showToast('Error syncing promos data', 'error');
    }
  };

  const handleDeletePromo = async (promoId) => {
    const newList = promos.filter(p => p.id !== promoId);
    try {
      const res = await fetch(`/api/promos?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      const data = await res.json();
      if (data.success) {
        setPromos(data.promos);
        if (selectedPromo?.id === promoId) setSelectedPromo(null);
        showToast('Promo stinger card removed.');
      }
    } catch (e) {
      showToast('Error deleting promo card', 'error');
    }
  };

  const togglePromoState = async (promo) => {
    const updated = { ...promo, enabled: !promo.enabled };
    const newList = promos.map(p => p.id === promo.id ? updated : p);
    try {
      const res = await fetch(`/api/promos?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      const data = await res.json();
      if (data.success) {
        setPromos(data.promos);
        if (selectedPromo?.id === promo.id) setSelectedPromo(updated);
        showToast(`Promo ${updated.enabled ? 'activated' : 'deactivated'}`);
      }
    } catch (e) {
      showToast('Failed to toggle status', 'error');
    }
  };

  // --- Idle Playlist Managers ---
  const handleAddVideo = async () => {
    if (!newVideoUrl) return;
    try {
      const res = await fetch(`/api/idle-playlist/add?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newVideoUrl })
      });
      const data = await res.json();
      if (data.success) {
        setIdlePlaylist(data.playlist);
        setNewVideoUrl('');
        showToast('Music video preloaded in idle playlist!');
      } else {
        showToast(data.error || 'Failed to add video', 'error');
      }
    } catch (e) {
      showToast('Network error preloading video', 'error');
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      const res = await fetch(`/api/idle-playlist/remove?room=${roomID}&videoId=${videoId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setIdlePlaylist(data.playlist);
        showToast('Video removed from bucket list.');
      }
    } catch (e) {
      showToast('Failed to remove video', 'error');
    }
  };

  const handleOrderVideo = async (index, direction) => {
    const newList = [...idlePlaylist];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newList.length) return;

    // Swap elements
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    try {
      const res = await fetch(`/api/idle-playlist?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      const data = await res.json();
      if (data.success) {
        setIdlePlaylist(data.playlist);
      }
    } catch (e) {
      showToast('Error saving playlist order', 'error');
    }
  };

  const handleCurateTrending = async () => {
    const curated = [
      { id: 'salamin-salamin', videoId: 'Jm53M7d4B6Q', title: "BINI | 'Salamin, Salamin' Official MV", thumbnail: 'https://i.ytimg.com/vi/Jm53M7d4B6Q/hqdefault.jpg', channel: 'BINI Official' },
      { id: 'gento', videoId: 'Pg-mI1NqV5E', title: "SB19 'GENTO' Official MV", thumbnail: 'https://i.ytimg.com/vi/Pg-mI1NqV5E/hqdefault.jpg', channel: 'SB19 Official' },
      { id: 'pantropiko', videoId: 'XsM5E9_4n30', title: "BINI | 'Pantropiko' Performance Video", thumbnail: 'https://i.ytimg.com/vi/XsM5E9_4n30/hqdefault.jpg', channel: 'BINI Official' },
      { id: 'super-shy', videoId: 'ArmDp-zijFI', title: "NewJeans (뉴진스) 'Super Shy' Official MV", thumbnail: 'https://i.ytimg.com/vi/ArmDp-zijFI/hqdefault.jpg', channel: 'HYBE LABELS' },
      { id: 'how-you-like-that', videoId: 'ioNng23DkIM', title: "BLACKPINK - 'How You Like That' M/V", thumbnail: 'https://i.ytimg.com/vi/ioNng23DkIM/hqdefault.jpg', channel: 'BLACKPINK' },
      { id: 'dynamite', videoId: 'gdZLi9oWNZg', title: "BTS (방탄소년단) 'Dynamite' Official MV", thumbnail: 'https://i.ytimg.com/vi/gdZLi9oWNZg/hqdefault.jpg', channel: 'HYBE LABELS' },
      { id: 'bini-na-na-na', videoId: 'vPwaXytZcgI', title: "BINI | 'Na Na Na' Official MV", thumbnail: 'https://i.ytimg.com/vi/vPwaXytZcgI/hqdefault.jpg', channel: 'BINI Official' },
      { id: 'mapa-sb19', videoId: 'FqbDWvSKASQ', title: "SB19 'MAPA' Official MV", thumbnail: 'https://i.ytimg.com/vi/FqbDWvSKASQ/hqdefault.jpg', channel: 'SB19 Official' },
      { id: 'lucky7-hori7on', videoId: 'N_mL-FiMerI', title: "HORI7ON - 'LUCKY 7' Official MV", thumbnail: 'https://i.ytimg.com/vi/N_mL-FiMerI/hqdefault.jpg', channel: 'HORI7ON' },
      { id: 'ditto-newjeans', videoId: 'pSUydWEqKwE', title: "NewJeans (뉴진스) 'Ditto' Official MV", thumbnail: 'https://i.ytimg.com/vi/pSUydWEqKwE/hqdefault.jpg', channel: 'HYBE LABELS' },
      { id: 'flower-jisoo', videoId: 'lVEsJLuDKmg', title: "JISOO - '꽃 (FLOWER)' M/V", thumbnail: 'https://i.ytimg.com/vi/lVEsJLuDKmg/hqdefault.jpg', channel: 'BLACKPINK' },
      { id: 'pink-venom', videoId: 'tyR_sCVpIco', title: "BLACKPINK - 'Pink Venom' M/V", thumbnail: 'https://i.ytimg.com/vi/tyR_sCVpIco/hqdefault.jpg', channel: 'BLACKPINK' },
    ];

    try {
      const res = await fetch(`/api/idle-playlist?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(curated)
      });
      const data = await res.json();
      if (data.success) {
        setIdlePlaylist(data.playlist);
        showToast(`✨ ${data.playlist.length} trending MVs loaded into idle playlist!`);
      }
    } catch (e) {
      showToast('Error populating curated list', 'error');
    }
  };

  // Verify embeddability of all idle playlist videos
  const [verifyResults, setVerifyResults] = useState({});
  const [verifying, setVerifying] = useState(false);

  const handleVerifyPlaylist = async () => {
    setVerifying(true);
    setVerifyResults({});
    showToast('Checking embeddability via YouTube oEmbed...');
    try {
      const res = await fetch(`/api/idle-playlist/verify?room=${roomID}`);
      const data = await res.json();
      if (data.results) {
        const map = {};
        data.results.forEach(r => { map[r.videoId] = r.embeddable; });
        setVerifyResults(map);
        const { ok, blocked } = data.summary;
        showToast(`Verify done: ${ok} ✅ playable, ${blocked} ❌ blocked`, blocked > 0 ? 'error' : 'success');
      }
    } catch (e) {
      showToast('Failed to verify playlist', 'error');
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04020a] flex items-center justify-center text-white font-syne">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#8B5CF6]/30 border-t-[#D946EF] rounded-full animate-spin" />
          <div className="animate-pulse text-sm font-bold tracking-widest text-[#d946ef] uppercase">Loading Premium CMS...</div>
        </div>
      </div>
    );
  }

  // Live Promo Card Preview parameters
  const getPromoTheme = (type) => {
    const themeColors = {
      beer: { border: 'border-amber-500/40', glow: 'shadow-amber-500/20', text: 'text-amber-400', bg: 'from-amber-950/40 to-amber-900/10' },
      dish: { border: 'border-red-500/40', glow: 'shadow-red-500/20', text: 'text-red-400', bg: 'from-red-950/40 to-red-900/10' },
      happyhour: { border: 'border-pink-500/40', glow: 'shadow-pink-500/20', text: 'text-pink-400', bg: 'from-pink-950/40 to-pink-900/10' },
      custom: { border: 'border-purple-500/40', glow: 'shadow-purple-500/20', text: 'text-purple-400', bg: 'from-purple-950/40 to-purple-900/10' }
    };
    return themeColors[type] || themeColors.custom;
  };

  const tabs = [
    { id: 'general', label: 'Settings', icon: Settings },
    { id: 'display', label: 'Display Controls', icon: Tv },
    { id: 'promos', label: 'Promos', icon: Megaphone, badge: promos.length > 0 ? promos.length : null },
    { id: 'idlePlaylist', label: 'Idle Playlist', icon: Layout, badge: idlePlaylist.length > 0 ? idlePlaylist.length : null },
    { id: 'signage', label: 'Signage', icon: Volume2 }
  ];

  return (
    <div className="min-h-screen bg-[#04020a] text-white selection:bg-[#D946EF]/30 relative overflow-x-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/30 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D946EF]/30 blur-[130px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        
        {/* HEADER BAR */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
          <div className="space-y-1">
            <h1 className="LuxeFont text-3xl sm:text-4xl text-gradient-broadcast">Admin Console</h1>
            <p className="font-dm text-white/40 uppercase tracking-widest text-[9px] flex items-center gap-1.5">
              <Sparkles size={11} className="text-[#D946EF]" />
              Vibe Sessions Studio Management Console — Room: {roomID.toUpperCase()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {activeTab !== 'promos' && activeTab !== 'idlePlaylist' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] rounded-xl font-syne font-bold text-[11px] uppercase tracking-wider shadow-[0_0_20px_rgba(217,70,239,0.2)] disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Syncing...' : 'Save & Sync'}
              </motion.button>
            )}
          </div>
        </header>

        {/* TOAST ALERT */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3.5 rounded-2xl border shadow-xl flex items-center gap-3 font-dm text-sm ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400 backdrop-blur-2xl' 
                  : 'bg-red-950/80 border-red-500/30 text-red-400 backdrop-blur-2xl'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-red-400" />}
              <span>{toast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NAVIGATION TABS */}
        <nav className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-syne font-bold text-[10px] uppercase tracking-wider transition-all duration-300 shrink-0 ${
                  active ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/20 to-[#d946ef]/20 border border-[#8b5cf6]/35 rounded-xl z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon size={14} className={active ? 'text-[#D946EF] z-10' : 'text-white/40 z-10'} />
                <span className="relative z-10">{tab.label}</span>
                {/* Item count badge — makes Promos & Idle Playlist discoverable */}
                {tab.badge != null && (
                  <span className={`relative z-10 ml-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold px-1 ${
                    active 
                      ? 'bg-[#D946EF] text-white' 
                      : 'bg-[#8B5CF6]/30 text-[#D946EF]'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* TAB CONTENTS */}
        <div className="min-h-[480px]">

          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="glass-card-stage p-8 md:col-span-2 space-y-6">
                <h2 className="flex items-center gap-3 LuxeFont text-xl">
                  <Settings className="text-[#8B5CF6]" /> 
                  General Room Settings
                </h2>
                <p className="text-white/40 font-dm text-xs leading-relaxed">
                  Configure the primary identities of this Room. Modifying these settings will propagate updates in real-time across connected displays.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <InputField
                    label="Business / Room Name"
                    placeholder="e.g. Vibe Room 101"
                    icon={Layout}
                    value={settings.businessName}
                    onChange={(val) => setSettings(s => ({ ...s, businessName: val }))}
                  />

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-syne font-bold uppercase tracking-widest text-white/50">
                      <Clock size={13} className="text-[#8B5CF6]" />
                      Preparation Time
                    </label>
                    <select
                      value={settings.prepDuration}
                      onChange={(e) => setSettings(s => ({ ...s, prepDuration: parseInt(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 focus:ring-1 focus:ring-[#D946EF]/20 transition-all cursor-pointer"
                    >
                      <option value={5}>5 Seconds (Demo / Fast)</option>
                      <option value={10}>10 Seconds</option>
                      <option value={15}>15 Seconds (Default)</option>
                      <option value={20}>20 Seconds</option>
                      <option value={30}>30 Seconds</option>
                      <option value={60}>1 Minute</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  {/* YouTube API Key — masked UX */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-syne font-bold uppercase tracking-widest text-white/50">
                      <Tv size={13} className="text-[#8B5CF6]" />
                      YouTube API Key
                      {settings.youtubeApiKeySet ? (
                        <span className="ml-auto flex items-center gap-1 text-emerald-400 text-[9px] font-bold normal-case tracking-wide">
                          <CheckCircle2 size={10} /> Key Active
                        </span>
                      ) : (
                        <span className="ml-auto flex items-center gap-1 text-amber-400 text-[9px] font-bold normal-case tracking-wide">
                          <AlertCircle size={10} /> No Key Set
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={settings.youtubeApiKeyInput}
                      onChange={(e) => setSettings(s => ({ ...s, youtubeApiKeyInput: e.target.value }))}
                      placeholder={settings.youtubeApiKeySet ? '•••••••• [Key Saved] — Type new key to replace' : 'AIzaSy... paste new key here'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 focus:ring-1 focus:ring-[#D946EF]/20 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-white/30 italic mt-1 leading-relaxed">
                    The API key is stored securely on the server and is never exposed to browser sessions. Enter a new key above only if you need to replace it.
                  </p>
                </div>
              </div>

              <div className="glass-card-stage p-8 space-y-6">
                <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-wider text-[#D946EF] flex items-center gap-2">
                  <Power size={13} />
                  Quick Access
                </h3>
                <div className="space-y-3 font-dm text-xs text-white/60 leading-relaxed">
                  <button onClick={() => setActiveTab('idlePlaylist')} className="w-full p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition-all text-left group">
                    <p className="font-bold text-white group-hover:text-[#D946EF] transition-colors flex items-center justify-between">
                      🎬 Idle Playlist
                      <span className="text-[9px] font-mono text-[#8B5CF6]">{idlePlaylist.length} videos →</span>
                    </p>
                    <p className="text-white/40 text-[10px] mt-0.5">YouTube music videos that play when the stage has no singers queued.</p>
                  </button>
                  <button onClick={() => setActiveTab('promos')} className="w-full p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#D946EF]/40 hover:bg-[#D946EF]/5 transition-all text-left group">
                    <p className="font-bold text-white group-hover:text-[#D946EF] transition-colors flex items-center justify-between">
                      🍽️ Promo Cards
                      <span className="text-[9px] font-mono text-[#8B5CF6]">{promos.length} cards →</span>
                    </p>
                    <p className="text-white/40 text-[10px] mt-0.5">Dish / drink cards that appear on stage during songs — position, timing, and animation configurable.</p>
                  </button>
                  <button onClick={() => setActiveTab('signage')} className="w-full p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition-all text-left group">
                    <p className="font-bold text-white group-hover:text-[#D946EF] transition-colors flex items-center justify-between">
                      📜 Rolling Ticker
                      <span className="text-[9px] font-mono text-[#8B5CF6]">{settings.promoText ? 'Active →' : 'Empty →'}</span>
                    </p>
                    <p className="text-white/40 text-[10px] mt-0.5">Scrolling text announcement banner shown at the bottom of the stage display.</p>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: DISPLAY CONTROLS */}
          {activeTab === 'display' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="glass-card-stage p-8 md:col-span-2 space-y-6">
                <h2 className="flex items-center gap-3 LuxeFont text-xl">
                  <Sliders className="text-[#8B5CF6]" /> 
                  Ambient Display Controls
                </h2>
                <p className="text-white/40 font-dm text-xs leading-relaxed">
                  Adjust color grades, vignettes, and overlay filters to make lyrics easily visible or dim the background for a relaxed pub atmosphere.
                </p>

                {/* Ambient Mode Presets */}
                <div className="space-y-2 pt-2">
                  <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-white/50">Ambient Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'dark', label: '🌙 Night Mode', desc: 'Warm / High Contrast' },
                      { id: 'balanced', label: '🎬 Cinema', desc: 'Perfectly Balanced' },
                      { id: 'bar', label: '🍺 Bar Mode', desc: 'Bright Pub Lighting' },
                      { id: 'bright', label: '☀️ Daylight', desc: 'Boosted Brightness' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={`p-3 rounded-xl border text-left font-dm text-xs transition-all ${
                          settings.ambientMode === p.id 
                            ? 'bg-gradient-to-r from-[#8b5cf6]/20 to-[#d946ef]/20 border-[#D946EF] text-white shadow-lg' 
                            : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <p className="font-bold">{p.label}</p>
                        <p className="text-[9px] text-white/35 mt-0.5">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-white/30 italic">Selecting a preset applies and saves immediately to stage displays.</p>
                </div>

                <div className="space-y-6 pt-4 border-t border-white/5">
                  {/* BRIGHTNESS */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-dm">
                      <span className="font-bold text-white/70">Stage Player Brightness</span>
                      <span className="font-mono text-[#D946EF] font-bold">{settings.brightness}%</span>
                    </div>
                    <input 
                      type="range" min="30" max="180" step="5"
                      className="w-full accent-[#D946EF] bg-white/10 h-1.5 rounded-lg cursor-pointer"
                      value={settings.brightness}
                      onChange={(e) => setSettings(s => ({ ...s, brightness: parseInt(e.target.value), ambientMode: 'custom' }))}
                    />
                  </div>

                  {/* CONTRAST */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-dm">
                      <span className="font-bold text-white/70">Contrast Filter Boost</span>
                      <span className="font-mono text-[#D946EF] font-bold">{settings.contrast}%</span>
                    </div>
                    <input 
                      type="range" min="50" max="160" step="5"
                      className="w-full accent-[#D946EF] bg-white/10 h-1.5 rounded-lg cursor-pointer"
                      value={settings.contrast}
                      onChange={(e) => setSettings(s => ({ ...s, contrast: parseInt(e.target.value), ambientMode: 'custom' }))}
                    />
                  </div>

                  {/* VIGNETTE */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-dm">
                      <span className="font-bold text-white/70">Radial Edge Vignette (Darkness)</span>
                      <span className="font-mono text-[#D946EF] font-bold">{settings.vignette}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100"
                      className="w-full accent-[#D946EF] bg-white/10 h-1.5 rounded-lg cursor-pointer"
                      value={settings.vignette}
                      onChange={(e) => setSettings(s => ({ ...s, vignette: parseInt(e.target.value), ambientMode: 'custom' }))}
                    />
                  </div>

                  {/* OVERLAY OPACITY */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-dm">
                      <span className="font-bold text-white/70">Player Video Dark Overlay (Opacity)</span>
                      <span className="font-mono text-[#D946EF] font-bold">{settings.overlayOpacity}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="90" step="5"
                      className="w-full accent-[#D946EF] bg-white/10 h-1.5 rounded-lg cursor-pointer"
                      value={settings.overlayOpacity}
                      onChange={(e) => setSettings(s => ({ ...s, overlayOpacity: parseInt(e.target.value), ambientMode: 'custom' }))}
                    />
                  </div>
                </div>
              </div>

              {/* SIDE PREVIEW METADATA */}
              <div className="glass-card-stage p-8 space-y-6">
                <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-wider text-[#8B5CF6] flex items-center gap-2">
                  <Eye size={13} />
                  Live Preview Helper
                </h3>
                <p className="text-white/40 font-dm text-xs leading-relaxed">
                  Below is a visual simulation of how the video brightness and contrast filter values look together.
                </p>

                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow-inner bg-black">
                  <div 
                    className="absolute inset-0 bg-cover bg-center filter transition-all duration-300"
                    style={{ 
                      backgroundImage: 'url("https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=60")',
                      filter: `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`
                    }}
                  />
                  {/* Overlay Opacity simulator */}
                  <div 
                    className="absolute inset-0 bg-black transition-all duration-300" 
                    style={{ opacity: settings.overlayOpacity / 100 }}
                  />
                  {/* Vignette Simulator */}
                  <div 
                    className="absolute inset-0 transition-all duration-300 pointer-events-none" 
                    style={{ 
                      background: `radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(4,2,10,${settings.vignette / 100}) 100%)`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-syne font-black text-[9px] uppercase tracking-widest text-white/50 px-3 py-1 bg-black/40 border border-white/5 rounded-md backdrop-blur-md">
                      Stage Visual Simulator
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1 font-dm text-xs text-white/40">
                  <p className="font-bold text-white/70">Current Output Config:</p>
                  <p>Ambient Mode: <span className="font-mono text-[#D946EF] font-bold">{settings.ambientMode.toUpperCase()}</span></p>
                  <p>Filter Style: <span className="font-mono text-white/70">brightness({settings.brightness}%) contrast({settings.contrast}%)</span></p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: PROMOTIONAL CARDS */}
          {activeTab === 'promos' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* PROMOS LIST COLUMN */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-widest text-white/50">Rotation Promos</h3>
                  <button
                    onClick={() => selectOrCreatePromo(null)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 hover:border-[#D946EF]/50 hover:bg-[#8B5CF6]/20 transition-all rounded-lg font-syne text-[9px] font-bold uppercase tracking-wider"
                  >
                    <Plus size={10} />
                    New Promo
                  </button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {promos.length === 0 ? (
                    <div className="p-8 text-center glass-card-stage border-dashed border-[#8B5CF6]/20 text-white/30 font-dm text-xs italic">
                      No promotional stinger cards saved. Click "New Promo" to start advertising dishes or drinks!
                    </div>
                  ) : (
                    promos.map((p) => {
                      const isSelected = selectedPromo?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => selectOrCreatePromo(p)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:bg-white/5 ${
                            isSelected 
                              ? 'bg-[#8B5CF6]/12 border-[#D946EF]/50 shadow-[0_0_15px_rgba(217,70,239,0.1)]' 
                              : 'bg-white/5 border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                              <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-syne font-bold text-xs text-white truncate leading-tight">{p.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`text-[8px] font-syne uppercase font-bold tracking-wider px-1 rounded-sm ${
                                  p.type === 'beer' ? 'text-amber-400 bg-amber-500/10' :
                                  p.type === 'dish' ? 'text-red-400 bg-red-500/10' :
                                  'text-pink-400 bg-pink-500/10'
                                }`}>
                                  {p.type}
                                </span>
                                <span className="font-mono text-[9px] text-[#D946EF] font-bold">{p.price}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePromoState(p); }}
                              className={`p-1.5 rounded-lg transition-colors border ${
                                p.enabled 
                                  ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' 
                                  : 'text-white/20 bg-white/5 border-white/5 hover:text-white/40 hover:bg-white/10'
                              }`}
                              title={p.enabled ? 'Enabled' : 'Disabled'}
                            >
                              <Power size={11} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePromo(p.id); }}
                              className="p-1.5 rounded-lg text-white/30 border border-transparent hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ── PROMO DISPLAY ENGINE SETTINGS ─────────────────────── */}
                <div className="glass-card-stage p-5 space-y-5 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-syne text-[10px] font-extrabold uppercase tracking-widest text-[#D946EF] flex items-center gap-1.5">
                      <Sliders size={11} /> Display Engine
                    </h3>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleSaveSettings}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] rounded-lg font-syne font-bold text-[9px] uppercase tracking-wider"
                    >
                      <Save size={9} /> Save
                    </motion.button>
                  </div>

                  {/* Position Picker */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-white/50">Card Position on Screen</label>
                    {/* Mini TV diagram with 4 quadrant buttons */}
                    <div className="relative w-full aspect-[16/9] max-h-28 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                      <div className="absolute inset-0 perspective-grid opacity-20" />
                      {[
                        { id: 'top-left',     label: '↖', cls: 'top-2 left-2' },
                        { id: 'top-right',    label: '↗', cls: 'top-2 right-2' },
                        { id: 'bottom-left',  label: '↙', cls: 'bottom-2 left-2' },
                        { id: 'bottom-right', label: '↘', cls: 'bottom-2 right-2' },
                      ].map(pos => (
                        <button
                          key={pos.id}
                          onClick={() => setSettings(s => ({ ...s, promoPosition: pos.id }))}
                          className={`absolute w-9 h-9 rounded-lg font-mono text-base flex items-center justify-center transition-all ${
                            settings.promoPosition === pos.id
                              ? 'bg-[#D946EF] text-white shadow-[0_0_12px_rgba(217,70,239,0.6)]'
                              : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                          } ${pos.cls}`}
                        >
                          {pos.label}
                        </button>
                      ))}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="font-syne text-[8px] text-white/20 uppercase tracking-widest">Stage Screen</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/30 italic">Selected: <span className="text-[#D946EF] font-bold">{settings.promoPosition}</span></p>
                  </div>

                  {/* Animation Style */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-white/50">Card Entrance Animation</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'slide', label: '⟶ Slide In', desc: 'Sweeps from side' },
                        { id: 'flip',  label: '⟳ Card Flip', desc: '3D perspective flip' },
                        { id: 'fade',  label: '◉ Fade In',   desc: 'Soft dissolve' },
                      ].map(anim => (
                        <button
                          key={anim.id}
                          onClick={() => setSettings(s => ({ ...s, promoAnimation: anim.id }))}
                          className={`p-2.5 rounded-xl border text-left text-[9px] font-syne font-bold transition-all ${
                            settings.promoAnimation === anim.id
                              ? 'bg-[#8B5CF6]/20 border-[#D946EF]/60 text-white'
                              : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white/70'
                          }`}
                        >
                          <div className="font-extrabold mb-0.5">{anim.label}</div>
                          <div className="text-[8px] font-normal opacity-60">{anim.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration + Gap sliders */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-dm">
                        <span className="text-white/60 font-bold">Visible Duration</span>
                        <span className="font-mono text-[#D946EF] font-bold">{settings.promoDuration}s</span>
                      </div>
                      <input type="range" min="10" max="30" step="5"
                        className="w-full accent-[#D946EF] h-1 rounded-lg cursor-pointer"
                        value={settings.promoDuration}
                        onChange={(e) => setSettings(s => ({ ...s, promoDuration: parseInt(e.target.value) }))}
                      />
                      <p className="text-[9px] text-white/25">How long each promo card stays on screen</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-dm">
                        <span className="text-white/60 font-bold">Gap Between Appearances</span>
                        <span className="font-mono text-[#D946EF] font-bold">{settings.promoGap}s</span>
                      </div>
                      <input type="range" min="30" max="120" step="15"
                        className="w-full accent-[#D946EF] h-1 rounded-lg cursor-pointer"
                        value={settings.promoGap}
                        onChange={(e) => setSettings(s => ({ ...s, promoGap: parseInt(e.target.value) }))}
                      />
                      <p className="text-[9px] text-white/25">Time between promo card appearances (keeps it non-distracting)</p>
                    </div>
                  </div>

                  {/* Ticker mode */}
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-white/50">Rolling Ticker Timing</label>
                    <select
                      value={settings.tickerMode}
                      onChange={(e) => setSettings(s => ({ ...s, tickerMode: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-dm text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all cursor-pointer"
                    >
                      <option value="intro">Show only at song start ({settings.tickerDuration}s)</option>
                      <option value="both">Intro + Outro (first & last {settings.tickerDuration}s)</option>
                      <option value="always">Always visible during song</option>
                      <option value="off">Off — never show ticker</option>
                    </select>

                    {settings.tickerMode !== 'off' && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] font-dm">
                          <span className="text-white/50">Ticker Duration</span>
                          <span className="font-mono text-[#D946EF] font-bold">{settings.tickerDuration}s</span>
                        </div>
                        <input type="range" min="15" max="60" step="5"
                          className="w-full accent-[#D946EF] h-1 rounded-lg cursor-pointer"
                          value={settings.tickerDuration}
                          onChange={(e) => setSettings(s => ({ ...s, tickerDuration: parseInt(e.target.value) }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* EDITOR AND LIVE PREVIEW COLUMN */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {selectedPromo ? (
                  <div className="glass-card-stage p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-widest text-[#D946EF] flex items-center gap-1.5">
                        <Edit2 size={12} />
                        Card Constructor
                      </h3>
                      <button
                        onClick={handleSavePromo}
                        className="flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] rounded-lg font-syne font-bold text-[9px] uppercase tracking-wider shadow-[0_0_12px_rgba(217,70,239,0.2)]"
                      >
                        <Save size={10} />
                        Save Card
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-white/50">Stinger Type</label>
                          <select
                            value={selectedPromo.type}
                            onChange={(e) => setSelectedPromo(s => ({ ...s, type: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-dm text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all cursor-pointer"
                          >
                            <option value="beer">🍺 Beer Special</option>
                            <option value="dish">🍽️ Signature Dish</option>
                            <option value="happyhour">🎉 Happy Hour</option>
                            <option value="custom">🔮 Custom / Event</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-syne font-bold uppercase tracking-wider text-white/50">Active Hours (Start - End)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={selectedPromo.schedule?.startHour !== undefined ? selectedPromo.schedule.startHour : 0}
                              onChange={(e) => setSelectedPromo(s => ({ ...s, schedule: { ...s.schedule, startHour: parseInt(e.target.value) } }))}
                              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all"
                            >
                              {Array.from({ length: 24 }).map((_, i) => (
                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                              ))}
                            </select>
                            <select
                              value={selectedPromo.schedule?.endHour !== undefined ? selectedPromo.schedule.endHour : 24}
                              onChange={(e) => setSelectedPromo(s => ({ ...s, schedule: { ...s.schedule, endHour: parseInt(e.target.value) } }))}
                              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all"
                            >
                              {Array.from({ length: 25 }).map((_, i) => (
                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <InputField
                        label="Product / Promo Title"
                        placeholder="e.g. Corona Beer Bucket"
                        value={selectedPromo.title}
                        onChange={(val) => setSelectedPromo(s => ({ ...s, title: val }))}
                      />

                      <InputField
                        label="Subtitle / Offer details"
                        placeholder="e.g. 5 Ice-cold bottles"
                        value={selectedPromo.subtitle}
                        onChange={(val) => setSelectedPromo(s => ({ ...s, subtitle: val }))}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <InputField
                          label="Promo Price"
                          placeholder="e.g. $22.00"
                          value={selectedPromo.price}
                          onChange={(val) => setSelectedPromo(s => ({ ...s, price: val }))}
                        />
                        <InputField
                          label="Original Price"
                          placeholder="e.g. $30.00"
                          value={selectedPromo.originalPrice || ''}
                          onChange={(val) => setSelectedPromo(s => ({ ...s, originalPrice: val }))}
                        />
                      </div>

                      <InputField
                        label="Stinger Image URL"
                        placeholder="Paste image link..."
                        value={selectedPromo.imageUrl}
                        onChange={(val) => setSelectedPromo(s => ({ ...s, imageUrl: val }))}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <InputField
                          label="Badge Tag (e.g. HOT DEALS)"
                          placeholder="Leave blank for none"
                          value={selectedPromo.badgeText || ''}
                          onChange={(val) => setSelectedPromo(s => ({ ...s, badgeText: val }))}
                        />
                        <div className="space-y-2">
                          <label className="block text-[11px] font-syne font-bold uppercase tracking-widest text-white/50">Badge Color Hex</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              className="w-10 h-10 bg-transparent rounded-lg cursor-pointer border border-white/10"
                              value={selectedPromo.badgeColor || '#ec4899'}
                              onChange={(e) => setSelectedPromo(s => ({ ...s, badgeColor: e.target.value }))}
                            />
                            <input
                              type="text"
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all"
                              value={selectedPromo.badgeColor || '#ec4899'}
                              onChange={(e) => setSelectedPromo(s => ({ ...s, badgeColor: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 glass-card-stage flex items-center justify-center text-center text-white/30 font-dm text-xs italic">
                    Select a card on the left or click "New Promo" to configure its prices, details, active serving hours, and customize badge aesthetics.
                  </div>
                )}

                {/* DYNAMIC CARD STAGE STINGER PREVIEW */}
                <div className="space-y-4">
                  <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-widest text-white/50 flex items-center gap-1">
                    <Eye size={12} className="text-[#D946EF]" />
                    Broadcast Live View Preview
                  </h3>

                  {selectedPromo ? (
                    <div className="relative w-full h-[360px] rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center bg-black/60 shadow-inner">
                      {/* Fake Stage background grid */}
                      <div className="absolute inset-0 perspective-grid opacity-30" />
                      <div className="absolute inset-0 bg-[#0c061e] opacity-40 z-0" />
                      
                      {/* Interactive preview card using real styling */}
                      {(() => {
                        const theme = getPromoTheme(selectedPromo.type);
                        return (
                          <div
                            className={`w-72 p-4 rounded-2xl flex flex-col gap-3 border shadow-2xl z-10 transition-all duration-300 ${theme.border} bg-gradient-to-br ${theme.bg} ${theme.glow}`}
                          >
                            {selectedPromo.imageUrl && (
                              <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-inner bg-black/40">
                                <img 
                                  src={selectedPromo.imageUrl} 
                                  alt={selectedPromo.title} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60';
                                  }}
                                />
                                {selectedPromo.badgeText && (
                                  <span 
                                    className="absolute top-2 left-2 text-[9px] font-syne font-extrabold uppercase px-2.5 py-1 rounded-full text-white shadow-lg"
                                    style={{ backgroundColor: selectedPromo.badgeColor || '#ec4899' }}
                                  >
                                    {selectedPromo.badgeText}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="space-y-1">
                              <span className={`text-[9px] font-syne uppercase tracking-wider font-bold ${theme.text}`}>
                                {selectedPromo.subtitle || 'SPECIAL OFFER'}
                              </span>
                              <h3 className="font-syne font-bold text-white text-base leading-tight truncate">
                                {selectedPromo.title || 'Product Title'}
                              </h3>
                            </div>
                            <div className="flex items-baseline justify-between mt-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-syne font-extrabold text-xl text-white">
                                  {selectedPromo.price || '$0.00'}
                                </span>
                                {selectedPromo.originalPrice && (
                                  <span className="font-dm text-xs text-white/40 line-through">
                                    {selectedPromo.originalPrice}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-syne tracking-widest text-white/50 uppercase">ORDER NOW</span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-syne uppercase text-white/30 tracking-widest pointer-events-none">
                        Active hours: {String(selectedPromo.schedule?.startHour || 0).padStart(2, '0')}:00 - {String(selectedPromo.schedule?.endHour || 24).padStart(2, '0')}:00
                      </div>
                    </div>
                  ) : (
                    <div className="h-[360px] glass-card-stage border-dashed border-[#8B5CF6]/10 flex items-center justify-center text-white/20 italic text-xs">
                      Live Preview is waiting for a selection
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: IDLE PLAYLIST */}
          {activeTab === 'idlePlaylist' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="glass-card-stage p-8 space-y-6">
                <h2 className="flex items-center gap-3 LuxeFont text-xl">
                  <Layout className="text-[#8B5CF6]" /> 
                  Stage Idle Video Playlist
                </h2>
                <p className="text-white/40 font-dm text-xs leading-relaxed">
                  Provide custom YouTube URLs or IDs of top trending 4K music videos (K-Pop, BINI, Pop Hits) to preload when the Stage screen is idle. Playlist features real-time synchronization, auto-skip on failure, and smart shuffle.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Paste YouTube URL or Video ID (e.g. https://youtu.be/Jm53M7d4B6Q)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white font-dm text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all placeholder-white/30"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleAddVideo}
                      className="px-6 py-3 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/40 hover:border-[#D946EF]/60 rounded-xl font-syne font-bold text-[10px] uppercase tracking-wider text-white transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Plus size={12} /> Add Video
                    </button>
                    <button
                      onClick={handleCurateTrending}
                      className="px-5 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] rounded-xl font-syne font-bold text-[10px] uppercase tracking-wider text-white shadow-[0_0_15px_rgba(217,70,239,0.2)] transition-all flex items-center gap-1.5 shrink-0"
                      title="Loads 12 trending K-Pop & OPM MVs"
                    >
                      <Sparkles size={11} /> Curate Hits
                    </button>
                    <button
                      onClick={handleVerifyPlaylist}
                      disabled={verifying || idlePlaylist.length === 0}
                      className="px-5 py-3 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 rounded-xl font-syne font-bold text-[10px] uppercase tracking-wider text-white/70 hover:text-emerald-400 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                      title="Verify all videos can be embedded in your player"
                    >
                      {verifying ? (
                        <><div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Checking...</>
                      ) : (
                        <><CheckCircle2 size={11} /> Verify All</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* PLAYLIST ITEMS */}
              <div className="space-y-3">
                <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-widest text-white/50">
                  Preloaded Playlist Loop ({idlePlaylist.length} Videos)
                </h3>

                {idlePlaylist.length === 0 ? (
                  <div className="p-12 text-center glass-card-stage border-dashed border-[#8B5CF6]/15 text-white/30 font-dm text-xs italic">
                    <div className="text-3xl mb-3">🎬</div>
                    <p className="font-bold text-white/40 mb-1">No videos in the bucket list yet</p>
                    <p>Click <strong className="text-[#D946EF]">"Curate Hits"</strong> to instantly load 12 trending K-Pop &amp; OPM MVs, or paste a YouTube URL above to add individual videos.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {idlePlaylist.map((item, index) => (
                      <div
                        key={item.videoId}
                        className="p-3.5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-3 group hover:border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/5 transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Thumbnail */}
                          <div className="relative w-20 aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0 shadow-md">
                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                            {/* Verify badge overlay */}
                            {verifyResults[item.videoId] !== undefined && (
                              <div className={`absolute top-1 right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                verifyResults[item.videoId] 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {verifyResults[item.videoId] ? '✓' : '✗'}
                              </div>
                            )}
                          </div>
                          {/* Details */}
                          <div className="min-w-0 font-dm">
                            <h4 className="font-bold text-white text-xs leading-snug truncate" title={item.title}>
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-white/40 mt-0.5 truncate">{item.channel || 'Unknown Channel'}</p>
                            <p className="font-mono text-[9px] text-[#8b5cf6]/70 mt-1 uppercase select-all">{item.videoId}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 pl-1">
                          <button
                            onClick={() => window.open(`https://www.youtube.com/watch?v=${item.videoId}`, '_blank')}
                            className="p-1.5 rounded-lg text-white/30 border border-transparent hover:text-[#D946EF] hover:bg-[#D946EF]/5 transition-all"
                            title="Test Playback in YouTube"
                          >
                            <ExternalLink size={11} />
                          </button>
                          <button
                            onClick={() => handleOrderVideo(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-white/35 border border-transparent hover:text-[#D946EF] disabled:opacity-20 transition-all hover:bg-white/5"
                            title="Move Up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => handleOrderVideo(index, 1)}
                            disabled={index === idlePlaylist.length - 1}
                            className="p-1.5 rounded-lg text-white/35 border border-transparent hover:text-[#D946EF] disabled:opacity-20 transition-all hover:bg-white/5"
                            title="Move Down"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(item.videoId)}
                            className="p-1.5 rounded-lg text-white/20 border border-transparent hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: DIGITAL SIGNAGE */}
          {activeTab === 'signage' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="glass-card-stage p-8 md:col-span-2 space-y-6">
                <h2 className="flex items-center gap-3 LuxeFont text-xl">
                  <Megaphone className="text-[#D946EF]" /> 
                  Stage Signage Ticker
                </h2>
                <p className="text-white/40 font-dm text-xs leading-relaxed">
                  Enter custom text, announcements, or happy hour messages to roll as a scrolling ticker across the bottom of the Stage display. Keep it simple or use emojis to excite singers!
                </p>

                <div className="space-y-6 pt-2">
                  <InputField
                    label="Promotional Marquee Text"
                    placeholder="e.g. GET 20% OFF SIGNATURE COCKTAILS AT THE BAR! 🍹🎤 RE-FILL BEER BUCKET FOR $18!"
                    textarea
                    value={settings.promoText}
                    onChange={(val) => setSettings(s => ({ ...s, promoText: val }))}
                  />

                  {/* LIVE SCROLLING Ticker PREVIEW */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[9px] font-syne text-white/40 uppercase tracking-widest mb-3">Live Scrolling Simulation</p>
                    <div className="relative w-full h-9 bg-black/80 rounded-lg overflow-hidden border border-white/5 flex items-center">
                      <div className="absolute whitespace-nowrap animate-marquee flex items-center gap-4 text-xs font-syne font-bold uppercase tracking-wider text-[#D946EF] pl-[100%]">
                        <span>{settings.promoText || 'PREVIEWING MARQUEE ANNOUNCEMENTS ON STAGE PLAYBACK... 🎤🎉'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card-stage p-8 space-y-6 font-dm text-xs text-white/60 leading-relaxed">
                <h3 className="font-syne text-[11px] font-extrabold uppercase tracking-wider text-[#8B5CF6] flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Announcements Tip
                </h3>
                <div className="space-y-3">
                  <p>
                    Marquee texts only render when the Stage screen is either preparing a singer or active on idle state. It will automatically hide during a song to allow maximum video immersion.
                  </p>
                  <p className="p-3 bg-white/5 border border-white/5 rounded-xl text-white/40 italic">
                    "Use emojis like 🎤, 🍻, or 🍕. They render with high-definition colors on TV monitors!"
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Embedded CSS for custom Ticker preview animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-marquee {
          animation: marquee 16s linear infinite;
        }
      `}} />
    </div>
  );
}
