import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PillButton from './ui/PillButton';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = ["Studio", "Cloud SaaS", "Gallery", "Pricing", "About"];

  return (
    <motion.nav 
      className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'py-3' : 'py-6'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-500 rounded-full mx-4 ${scrolled ? 'glass-card-premium py-3 px-8' : ''}`}>
        <div className="flex items-center gap-3">
          <span className="LuxeFont text-2xl tracking-tighter text-white">VIBE SESSIONS</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
            PRO STUDIO
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
             <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-[13px] font-bold text-white/60 hover:text-white transition-all duration-300 relative group tracking-tight">
               {link}
               <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-white rounded-full transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100"></span>
             </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <PillButton variant="ghost" className="hidden md:flex text-xs py-2 px-5">Book Studio</PillButton>
          <PillButton variant="primary" className="text-xs py-2 px-5">SaaS Demo</PillButton>
        </div>
      </div>
    </motion.nav>
  );
}
