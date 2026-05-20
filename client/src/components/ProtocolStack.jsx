import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

const protocols = [
  {
    step: '01',
    title: 'Choose your moment.',
    desc: 'Book online or walk in. Browse our 50,000+ song catalogue on your phone. Pick your package — single track or full pro session.',
  },
  {
    step: '02',
    title: 'Perform with heart.',
    desc: 'Step into the studio. Our setup captures your voice through a professional condenser mic and 4K camera. We engineer the mix as you sing.',
  },
  {
    step: '03',
    title: 'Own your video.',
    desc: 'Within 24 hours, your performance arrives. Full 4K resolution. Pro-grade audio. Branded performance card. Yours forever. No compromises.',
  }
];

export default function ProtocolStack() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      protocols.forEach((_, i) => {
        gsap.to(`.protocol-card-${i}`, {
          scrollTrigger: {
            trigger: `.protocol-card-${i}`,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "expo.out"
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="bg-black py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-32">
           <span className="text-white/20 font-bold tracking-[0.3em] uppercase text-[11px]">The Vibe Protocol</span>
           <h2 className="LuxeFont text-5xl md:text-7xl text-white mt-10 tracking-tighter leading-[0.95]">
              From coffee to 4K <br/>
              <span className="text-white/40">in under 24 hours.</span>
           </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {protocols.map((p, i) => (
            <div 
              key={i} 
              className={`protocol-card-${i} opacity-0 translate-y-20 flex flex-col group`}
            >
              <div className="flex items-center gap-6 mb-10">
                <span className="LuxeFont text-5xl font-black text-white/10 group-hover:text-white/30 transition-colors duration-700">
                  {p.step}
                </span>
                <div className="h-[1px] flex-1 bg-white/10 origin-left transition-transform duration-1000 group-hover:scale-x-110 group-hover:bg-white/30" />
              </div>
              
              <h3 className="LuxeFont text-2xl text-white mb-6 tracking-tight group-hover:translate-x-2 transition-transform duration-500">
                {p.title}
              </h3>
              
              <p className="text-white/40 text-[16px] font-medium leading-relaxed mb-12">
                {p.desc}
              </p>

              <div className="mt-auto h-16 flex items-end gap-1.5 opacity-20">
                 {Array.from({ length: 15 }).map((_, j) => (
                    <motion.div
                      key={j}
                      animate={{ height: ['15%', '80%', '15%'] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5 + Math.random(), 
                        delay: j * 0.1,
                        ease: "easeInOut"
                      }}
                      className="w-1.5 rounded-full bg-white"
                    />
                 ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
