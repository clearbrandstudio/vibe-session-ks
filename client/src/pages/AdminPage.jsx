import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Layout, Tv, Megaphone, CheckCircle2, AlertCircle } from 'lucide-react';

const InputField = ({ label, value, onChange, placeholder, icon: Icon, type = 'text', textarea = false }) => (
  <div className="space-y-2">
    <label className="flex items-center gap-2 text-[11px] font-syne font-bold uppercase tracking-widest text-white/50">
      <Icon size={14} className="text-[#8B5CF6]" />
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
  const [settings, setSettings] = useState({
    businessName: '',
    youtubeApiKey: '',
    promoText: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';
    
    fetch(`/api/settings?room=${roomID}`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          businessName: data.businessName || '',
          youtubeApiKey: data.youtubeApiKey || '',
          promoText: data.promoText || ''
        });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const params = new URLSearchParams(window.location.search);
    const roomID = params.get('room') || 'default';
    
    try {
      const res = await fetch(`/api/settings?room=${roomID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'Settings updated successfully!' });
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Network error occurred' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04020a] flex items-center justify-center text-white font-syne">
        <div className="animate-pulse">Loading Admin Portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04020a] text-white selection:bg-[#D946EF]/30 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8B5CF6]/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D946EF]/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <header className="flex items-center justify-between mb-12">
          <div className="space-y-1">
            <h1 className="LuxeFont text-4xl text-gradient-broadcast">Admin Portal</h1>
            <p className="font-dm text-white/40 uppercase tracking-widest text-[10px]">Vibe Sessions Studio CMS</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] rounded-xl font-syne font-bold text-[12px] uppercase tracking-wider shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50"
          >
            {saving ? 'Syncing...' : (
              <>
                <Save size={16} />
                Save & Sync
              </>
            )}
          </motion.button>
        </header>

        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-4 rounded-xl border flex items-center gap-3 font-dm text-sm ${
              msg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {msg.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card-stage p-8 space-y-8">
            <h2 className="flex items-center gap-3 LuxeFont text-xl">
              <Settings className="text-[#8B5CF6]" /> 
              General Settings
            </h2>
            <div className="space-y-6">
              <InputField
                label="Business Name"
                placeholder="e.g. Vibe Sessions Phnom Penh"
                icon={Layout}
                value={settings.businessName}
                onChange={(val) => setSettings(s => ({ ...s, businessName: val }))}
              />
              <InputField
                label="YouTube API Key"
                placeholder="Paste your API key here..."
                icon={Tv}
                type="password"
                value={settings.youtubeApiKey}
                onChange={(val) => setSettings(s => ({ ...s, youtubeApiKey: val }))}
              />
            </div>
          </div>

          <div className="glass-card-stage p-8 space-y-8">
            <h2 className="flex items-center gap-3 LuxeFont text-xl">
              <Megaphone className="text-[#D946EF]" /> 
              Digital Signage
            </h2>
            <div className="space-y-6">
              <InputField
                label="Promotional Ticker"
                placeholder="Message that rotates on Stage display idle..."
                icon={Megaphone}
                textarea
                value={settings.promoText}
                onChange={(val) => setSettings(s => ({ ...s, promoText: val }))}
              />
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[10px] font-syne text-white/40 uppercase tracking-widest mb-2">Live Preview</p>
                <div className="text-sm font-dm text-white/80 italic">
                  "{settings.promoText || 'Your promo text here...'}"
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
