import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Zap, MonitorCheck } from 'lucide-react';

const TypewriterTelemetry = () => {
  const [messages, setMessages] = useState([
    "> System Vibe Booting...",
    "> Protocol 4K Active...",
    "> Stream Buffer Nominal."
  ]);
  
  const telemetryLines = [
    "> Performer 'Dara' active...",
    "> Queue updated: 5 min wait...",
    "> Signage: Happy Hour Sync...",
    "> YT API Fallback: Resolved.",
    "> Audio Signal Chain: Verified."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => {
        const next = [...prev, telemetryLines[Math.floor(Math.random() * telemetryLines.length)]];
        if (next.length > 5) next.shift();
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white/5 p-5 rounded-2xl font-mono text-[11px] text-white/40 h-36 flex flex-col justify-end overflow-hidden border border-white/5">
       {messages.map((m, i) => (
         <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis mb-1">{m}</div>
       ))}
       <div className="w-1.5 h-3.5 bg-white/20 animate-pulse mt-1" />
    </div>
  );
};

const FeatureCard = ({ icon: Icon, tag, title, desc, children }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card-premium p-12 flex flex-col h-full group"
  >
    <div className="w-14 h-14 rounded-2xl glass-morphism flex items-center justify-center mb-10 text-white/80 group-hover:text-white transition-colors">
      <Icon size={28} strokeWidth={1.5} />
    </div>
    <span className="text-white/20 font-bold text-[10px] tracking-[0.3em] uppercase mb-5">{tag}</span>
    <h3 className="LuxeFont text-3xl text-white mb-6 tracking-tight">{title}</h3>
    <p className="text-white/40 text-[15px] font-medium leading-relaxed mb-auto">{desc}</p>
    <div className="mt-10">
      {children}
    </div>
  </motion.div>
);

export default function CloudFeatures() {
  return (
    <section className="bg-black py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-4xl mb-32">
          <span className="text-white/20 font-bold tracking-[0.3em] uppercase text-[11px]">Vibe Sessions Cloud</span>
          <h2 className="LuxeFont text-5xl md:text-[80px] text-white mt-10 mb-10 tracking-tighter leading-[0.95]">
            The OS for <br/>
            <span className="text-white/40">modern venues.</span>
          </h2>
          <p className="text-white/30 text-xl max-w-xl leading-relaxed font-medium">
            Zero hardware required. Full control from any device. Live in under 10 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <FeatureCard 
            icon={Smartphone}
            tag="PATRON KIOSK"
            title="Self-service DJ"
            desc="A Netflix-style interface on every guest's phone. No physical book. No waiting."
          >
            <div className="flex flex-wrap gap-2 mb-6">
              {['50K+ Songs', 'Self-service', 'Duet Sync'].map(label => (
                <span key={label} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-white/30 border border-white/5 tracking-wider">{label}</span>
              ))}
            </div>
            <div className="h-32 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
               <div className="absolute top-6 left-6 w-1/2 h-2 bg-white/10 rounded-full" />
               <div className="absolute top-10 left-6 w-1/3 h-2 bg-white/5 rounded-full" />
               <div className="absolute bottom-6 right-6 w-12 h-12 glass-morphism rounded-full" />
            </div>
          </FeatureCard>

          <FeatureCard 
            icon={MonitorCheck}
            tag="STAGE CONTROL"
            title="Intelligent Sync"
            desc="Sub-100ms real-time telemetry between every device and the stage display."
          >
            <TypewriterTelemetry />
          </FeatureCard>

          <FeatureCard 
            icon={Zap}
            tag="VENUE MARKETING"
            title="Passive ROl"
            desc="Between performances, the stage becomes a cinematic billboard for your promos."
          >
             <div className="bg-white/5 border border-white/5 rounded-2xl p-6 h-36 flex flex-col justify-between">
                <div className="flex justify-between text-[10px] font-bold text-white/20 tracking-widest">
                   <span>AD ENGINE 3.0</span>
                   <span className="text-white/10 uppercase italic">Active</span>
                </div>
                <div className="flex gap-2 h-12 items-end">
                   {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
                     <motion.div 
                       key={i} 
                       initial={{ height: 0 }}
                       animate={{ height: `${h}%` }}
                       transition={{ repeat: Infinity, duration: 1 + i*0.2, ease: "easeInOut", repeatType: "reverse" }}
                       className="flex-1 bg-white/10 rounded-t-sm"
                     />
                   ))}
                </div>
             </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
