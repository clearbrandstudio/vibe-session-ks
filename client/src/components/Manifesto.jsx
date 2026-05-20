import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Manifesto() {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from(textRef.current, {
        opacity: 0,
        y: 60,
        duration: 1.5,
        ease: "expo.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "top 30%",
          scrub: 1,
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-[80vh] flex items-center justify-center bg-black overflow-hidden py-40">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2670&auto=format&fit=crop" className="w-full h-full object-cover scale-110 grayscale" alt="Manifesto" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center" ref={textRef}>
        <span className="text-white/20 font-bold text-[12px] uppercase tracking-[0.4em] mb-12 inline-block">Our Belief</span>
        
        <p className="text-white/40 text-xl md:text-2xl mb-8 leading-relaxed font-medium">
          Most systems are built for the machine.
        </p>

        <h2 className="LuxeFont text-6xl md:text-8xl lg:text-[120px] text-white leading-[0.95] mb-12 tracking-tighter">
          We build for the <br/>
          <span className="text-gradient-apple py-2">soul.</span>
        </h2>

        <p className="text-white/30 text-[18px] md:text-[20px] max-w-2xl mx-auto leading-relaxed mt-12 font-medium tracking-tight">
          In Phnom Penh and beyond, we believe every voice deserves a stage that feels like a star. Not just a microphone — a moment captured for eternity.
        </p>
      </div>
    </section>
  );
}
