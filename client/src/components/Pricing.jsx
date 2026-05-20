import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import PillButton from './ui/PillButton';

const PricingCard = ({ title, price, items, cta, featured = false, variant = "primary" }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`glass-card-premium p-12 flex flex-col h-full border-white/5 group transition-all duration-700 relative ${featured ? 'border-white/20' : ''}`}
  >
    {featured && (
      <span className="absolute top-0 right-12 -translate-y-1/2 bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">
        Top Choice
      </span>
    )}
    <h3 className="text-white/40 font-bold text-xs tracking-[0.2em] uppercase mb-8">{title}</h3>
    <div className="flex items-baseline gap-2 mb-12">
      <span className="LuxeFont text-6xl text-white tracking-tighter">{price}</span>
      {price !== 'Free' && <span className="text-white/20 font-bold text-sm">/ track</span>}
    </div>
    <ul className="space-y-6 mb-16 flex-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-4">
          <Check size={18} className="text-white/60 mt-0.5" />
          <span className="text-white/40 text-[15px] font-medium leading-tight">{item}</span>
        </li>
      ))}
    </ul>
    <PillButton variant={variant} className="w-full h-14">
      {cta}
    </PillButton>
  </motion.div>
);

export default function Pricing() {
  return (
    <section className="bg-black py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-32">
          <span className="text-white/20 font-bold tracking-[0.3em] uppercase text-[11px]">Studio Pricing</span>
          <h2 className="LuxeFont text-5xl md:text-8xl text-white mt-10 tracking-tighter">
            Sing tonight. <br/>
            <span className="text-white/40">Own the moment.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-48">
           <PricingCard 
              title="Individual"
              price="$25"
              items={[
                "Single Track in 4K",
                "Professional Audio Mix",
                "24h Digital Delivery",
                "Performance Card"
              ]}
              cta="Book Session"
              variant="ghost"
           />
           <PricingCard 
              title="Studio Bundle"
              price="$60"
              featured={true}
              items={[
                "3 Tracks in 4K",
                "Pro Master on all tracks",
                "Priority 12h delivery",
                "Highlight Reel (Vertical)",
                "Featured Gallery Spot"
              ]}
              cta="Claim Bundle"
              variant="primary"
           />
           <PricingCard 
              title="Group Pack"
              price="$199"
              items={[
                "Up to 6 Performances",
                "Full 4K Cinematic Sync",
                "Same-day Delivery",
                "Group Teaser Edit",
                "Exclusive Session Host"
              ]}
              cta="Book Group"
              variant="ghost"
           />
        </div>

        {/* SaaS Split */}
        <div className="relative group overflow-hidden glass-card-premium p-16 md:p-24 rounded-[48px] border-white/5 hover:border-white/10 transition-all duration-1000">
           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="max-w-xl">
                 <span className="text-white/20 font-bold text-[10px] tracking-[0.4em] uppercase mb-8 inline-block">FOR VENUE OPERATORS</span>
                 <h2 className="LuxeFont text-5xl md:text-7xl text-white mb-10 tracking-tighter leading-[0.95]">The Cloud OS <br/> for Bars.</h2>
                 <p className="text-white/30 text-lg font-medium leading-relaxed mb-12">
                   Power your venue with the most advanced karaoke SaaS in Southeast Asia. Zero hardware required. Infinite scalability.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-10">
                    <div className="flex flex-col">
                       <span className="LuxeFont text-5xl text-white tracking-tighter">$99</span>
                       <span className="text-[10px] text-white/10 font-bold uppercase tracking-[0.3em] mt-2">Starter / MO</span>
                    </div>
                    <div className="w-[1px] h-14 bg-white/10 hidden sm:block" />
                    <div className="flex flex-col">
                       <span className="LuxeFont text-5xl text-white/40 tracking-tighter">$199</span>
                       <span className="text-[10px] text-white/10 font-bold uppercase tracking-[0.3em] mt-2">Pro / MO</span>
                    </div>
                 </div>
              </div>
              <div className="w-full lg:w-auto flex flex-col items-center gap-6">
                 <PillButton variant="primary" className="h-16 px-16 text-lg">Request SaaS Demo</PillButton>
                 <span className="text-[11px] text-white/20 font-bold tracking-widest uppercase italic">Used by 48 venues across SEA</span>
              </div>
           </div>
           {/* Ambient Polish */}
           <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
           <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
