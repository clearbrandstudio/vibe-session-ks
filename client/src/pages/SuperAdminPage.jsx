import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Power, Edit2, CheckCircle2, AlertCircle, Shield, Users, RefreshCw } from 'lucide-react';

const MASTER_KEY_STORAGE = 'vibe_superadmin_key';

export default function SuperAdminPage() {
  const [masterKey, setMasterKey] = useState(localStorage.getItem(MASTER_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [form, setForm] = useState({ roomID: '', businessName: '', password: '', plan: 'basic', expiresAt: '', active: true });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTenants = async (key = masterKey) => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenants', { headers: { 'x-super-admin-key': key } });
      if (res.status === 403) {
        setAuthenticated(false);
        showToast('Invalid master key', 'error');
        return;
      }
      const data = await res.json();
      setTenants(data.tenants || []);
      setAuthenticated(true);
      localStorage.setItem(MASTER_KEY_STORAGE, key);
    } catch (err) {
      showToast('Connection error', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (masterKey) fetchTenants(masterKey);
  }, []);

  const handleAuth = (e) => {
    e.preventDefault();
    fetchTenants(keyInput);
    setMasterKey(keyInput);
  };

  const handleSaveTenant = async () => {
    if (!form.roomID || !form.businessName) { showToast('Room ID and business name required', 'error'); return; }
    if (!editingTenant && !form.password) { showToast('Password required for new tenant', 'error'); return; }
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-key': masterKey },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Tenant ${editingTenant ? 'updated' : 'created'} successfully!`);
        setShowForm(false);
        setEditingTenant(null);
        setForm({ roomID: '', businessName: '', password: '', plan: 'basic', expiresAt: '', active: true });
        fetchTenants();
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  };

  const handleToggleActive = async (tenant) => {
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.roomID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-key': masterKey },
        body: JSON.stringify({ active: !tenant.active })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${tenant.businessName} ${!tenant.active ? 'activated' : 'suspended'}`);
        fetchTenants();
      }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  const handleDelete = async (tenant) => {
    if (!confirm(`Delete ${tenant.businessName}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.roomID}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-key': masterKey }
      });
      const data = await res.json();
      if (data.success) { showToast('Tenant deleted'); fetchTenants(); }
    } catch (err) {
      showToast('Error', 'error');
    }
  };

  const openEdit = (tenant) => {
    setEditingTenant(tenant);
    setForm({ roomID: tenant.roomID, businessName: tenant.businessName, password: '', plan: tenant.plan || 'basic', expiresAt: tenant.expiresAt ? tenant.expiresAt.slice(0, 10) : '', active: tenant.active });
    setShowForm(true);
  };

  if (!authenticated) {
    return (
      <div className="fixed inset-0 bg-[#04020a] flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-[#8B5CF6]/10 blur-[150px]" />
          <div className="absolute bottom-0 right-0 w-[50%] h-[50%] rounded-full bg-[#D946EF]/10 blur-[150px]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm mx-4">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[28px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#D946EF] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(217,70,239,0.4)]">
                <Shield size={26} className="text-white" />
              </div>
              <h1 className="font-syne text-xl font-extrabold text-white">Super Admin</h1>
              <p className="font-dm text-white/30 text-xs mt-1">Vibe Sessions Platform Management</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="Master Admin Key"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 transition-all placeholder:text-white/20"
                autoFocus
              />
              <button type="submit" className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white font-syne font-bold uppercase tracking-widest text-sm">
                Enter Dashboard
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04020a] text-white">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-[#8B5CF6]/30 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-[#D946EF]/30 blur-[130px] rounded-full" />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3.5 rounded-2xl border shadow-xl flex items-center gap-3 font-dm text-sm backdrop-blur-2xl ${
              toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' : 'bg-red-950/80 border-red-500/30 text-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#D946EF] flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <h1 className="font-syne text-2xl font-extrabold bg-gradient-to-r from-[#8B5CF6] via-[#D946EF] to-[#EC4899] bg-clip-text text-transparent">Super Admin Dashboard</h1>
            </div>
            <p className="font-dm text-white/30 text-xs ml-11">Vibe Sessions Platform — {tenants.length} active tenants</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchTenants()} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <RefreshCw size={16} className={loading ? 'animate-spin text-[#D946EF]' : 'text-white/50'} />
            </button>
            <button
              onClick={() => { setEditingTenant(null); setForm({ roomID: '', businessName: '', password: '', plan: 'basic', expiresAt: '', active: true }); setShowForm(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] rounded-xl font-syne font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(217,70,239,0.2)]"
            >
              <Plus size={14} /> New Tenant
            </button>
          </div>
        </header>

        {/* Tenant List */}
        <div className="space-y-3">
          {tenants.length === 0 ? (
            <div className="text-center py-20 text-white/20 font-dm text-sm">
              <Users size={40} className="mx-auto mb-4 opacity-30" />
              No tenants yet. Create your first bar/KTV account.
            </div>
          ) : tenants.map((tenant) => (
            <motion.div
              key={tenant.roomID}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/8 rounded-2xl p-5 flex items-center gap-4"
            >
              <div className={`w-3 h-3 rounded-full shrink-0 ${tenant.active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400/60'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-syne font-bold text-white">{tenant.businessName}</p>
                  <span className="text-[8px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded">{tenant.roomID}</span>
                  <span className={`text-[8px] font-syne font-bold uppercase px-2 py-0.5 rounded-full ${
                    tenant.plan === 'pro' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30'
                  }`}>{tenant.plan}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="font-dm text-[10px] text-white/30">
                    {tenant.active ? 'Active' : '⛔ Suspended'}
                    {tenant.expiresAt && ` • Expires ${new Date(tenant.expiresAt).toLocaleDateString()}`}
                  </p>
                  {tenant.lastLoginAt && (
                    <p className="font-dm text-[10px] text-white/20">Last login: {new Date(tenant.lastLoginAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/admin?room=${tenant.roomID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-syne text-[9px] uppercase tracking-wider text-white/50 hover:text-white hover:border-white/30 transition-colors"
                >
                  Open Admin
                </a>
                <button onClick={() => openEdit(tenant)} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#8B5CF6]/40 transition-colors">
                  <Edit2 size={13} className="text-white/50" />
                </button>
                <button
                  onClick={() => handleToggleActive(tenant)}
                  className={`p-2 rounded-lg border transition-colors ${
                    tenant.active
                      ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 text-red-400'
                      : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400'
                  }`}
                  title={tenant.active ? 'Suspend' : 'Activate'}
                >
                  <Power size={13} />
                </button>
                <button onClick={() => handleDelete(tenant)} className="p-2 rounded-lg bg-white/5 border border-transparent hover:border-red-500/30 hover:bg-red-500/5 transition-colors">
                  <Trash2 size={13} className="text-white/30 hover:text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tenant Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0c0618] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_30px_80px_rgba(0,0,0,0.8)]"
            >
              <h2 className="font-syne text-lg font-extrabold text-white mb-6">
                {editingTenant ? `Edit: ${editingTenant.businessName}` : 'New Tenant'}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40 mb-1.5">Room ID / Slug</label>
                    <input
                      value={form.roomID}
                      onChange={e => setForm(f => ({ ...f, roomID: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                      disabled={!!editingTenant}
                      placeholder="skybar-makati"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40 mb-1.5">Plan</label>
                    <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-dm text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all">
                      <option value="basic">Basic — $100/mo</option>
                      <option value="pro">Pro — $200/mo</option>
                      <option value="owner">Owner (You)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40 mb-1.5">Business Name</label>
                  <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Sky Bar Makati" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40 mb-1.5">{editingTenant ? 'New Password (leave blank to keep)' : 'Admin Password'}</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-dm text-sm focus:outline-none focus:border-[#D946EF]/50 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-widest text-white/40 mb-1.5">Expires At</label>
                    <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-dm text-xs focus:outline-none focus:border-[#D946EF]/50 transition-all" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-[#D946EF]" />
                      <span className="font-syne text-xs text-white/60">Active</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-syne font-bold text-xs uppercase tracking-wider text-white/50">Cancel</button>
                <button onClick={handleSaveTenant} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] font-syne font-bold text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(217,70,239,0.2)]">Save Tenant</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
