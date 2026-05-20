import React from 'react';
import { motion } from 'framer-motion';

export default function PillButton({ children, variant = "primary", className = "", ...props }) {
  const baseStyles = "px-6 py-3 rounded-pill text-[15px] font-bold transition-all duration-300 flex items-center justify-center gap-2 tracking-tight";
  
  const variants = {
    primary: "bg-white text-black hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]",
    gold: "bg-accent-gold text-black hover:bg-white hover:shadow-[0_0_30px_rgba(232,168,56,0.3)]",
    ghost: "bg-transparent text-white border border-white/20 hover:border-white/40 hover:bg-white/5",
    glass: "glass-morphism text-white hover:bg-white/10"
  };

  return (
    <motion.button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
