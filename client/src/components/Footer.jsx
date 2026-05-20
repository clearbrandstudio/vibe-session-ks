import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black pt-48 pb-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-32">
          {/* Column 1 - Brand */}
          <div className="flex flex-col gap-10">
            <div className="flex flex-col">
              <span className="LuxeFont text-3xl tracking-tighter text-white mb-2">VIBE SESSIONS</span>
              <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.4em]">Phnom Penh · SEA</span>
            </div>
            <p className="text-white/30 text-[15px] font-medium leading-relaxed max-w-xs">
              Southeast Asia's premium cinematic stage. High-end recording and cloud-powered karaoke.
            </p>
            <div className="flex items-center gap-8 text-white/30">
               {['Instagram', 'YouTube', 'Facebook'].map(social => (
                 <span key={social} className="text-[10px] font-bold uppercase tracking-widest hover:text-white cursor-pointer transition-colors border-b border-transparent hover:border-white/20 pb-1">
                   {social}
                 </span>
               ))}
            </div>
          </div>

          {/* Column 2 - Studio */}
          <div className="flex flex-col gap-10">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">The Studio</h4>
            <ul className="flex flex-col gap-5">
               {["Book a Session", "Package Pricing", "How It Works", "Gallery"].map(link => (
                 <li key={link}><a href="#" className="text-white/30 text-sm font-semibold hover:text-white transition-colors tracking-tight">{link}</a></li>
               ))}
            </ul>
          </div>

          {/* Column 3 - Cloud */}
          <div className="flex flex-col gap-10">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Venues & SaaS</h4>
            <ul className="flex flex-col gap-5">
               {["Platform Overview", "SaaS Pricing", "Request Demo", "Reseller Program"].map(link => (
                 <li key={link}><a href="#" className="text-white/30 text-sm font-semibold hover:text-white transition-colors tracking-tight">{link}</a></li>
               ))}
            </ul>
          </div>

          {/* Column 4 - Company */}
          <div className="flex flex-col gap-10">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Company</h4>
            <ul className="flex flex-col gap-5">
               {["About Us", "Legal & Privacy", "Contact", "Join the Team"].map(link => (
                 <li key={link}><a href="#" className="text-white/30 text-sm font-semibold hover:text-white transition-colors tracking-tight">{link}</a></li>
               ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-10 border-t border-white/5 pt-16">
           <div className="flex items-center gap-4">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">All Systems Nominal · Live in SEA</span>
           </div>
           <span className="text-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">
             © {currentYear} Vibe Sessions Karaoke. Precision Engineered.
           </span>
        </div>
      </div>
    </footer>
  );
}
