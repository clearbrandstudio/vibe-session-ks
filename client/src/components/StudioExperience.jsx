import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    eyebrow: 'PHASE 01',
    title: 'Arrive.',
    text: 'A music-lover\'s café designed for calm.',
    subtext: 'Warm lighting. Curated sounds. The scent of artisanal brewing. This isn\'t a waiting room; it\'s where your transformation begins.',
    image: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=2574&auto=format&fit=crop'
  },
  {
    eyebrow: 'PHASE 02',
    title: 'Perform.',
    text: 'Record in 4K. Professional audio.',
    subtext: 'Pro acoustic treatment. The same signal chain used in elite recording studios. No karaoke machines — just you, a mic, and a camera.',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2670&auto=format&fit=crop'
  },
  {
    eyebrow: 'PHASE 03',
    title: 'Review.',
    text: 'Your performance. Mixed & Mastered.',
    subtext: 'Within 24 hours, your cinematic video is delivered. Professionally mixed audio. Branded metadata. A permanent digital record of your talent.',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bb9218f?q=80&w=2670&auto=format&fit=crop'
  },
  {
    eyebrow: 'PHASE 04',
    title: 'Ascend.',
    text: 'Go viral. Share your voice.',
    subtext: 'Join Phnom Penh\'s music elite. Your performance becomes part of our featured gallery, reaching thousands of music lovers globally.',
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2670&auto=format&fit=crop'
  }
];

export default function StudioExperience() {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: '.visual-panel',
        pinSpacing: false,
      });

      steps.forEach((_, i) => {
        if (i === 0) return;
        gsap.fromTo(`.step-image-${i}`, 
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { 
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: {
              trigger: `.step-trigger-${i}`,
              start: 'top center',
              end: 'bottom center',
              scrub: true,
            }
          }
        );
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative w-full bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-40 pb-20">
        <span className="text-white/30 font-bold tracking-[0.3em] uppercase text-[11px]">The Vibe Experience</span>
        <h2 className="LuxeFont text-5xl md:text-8xl text-white mt-8 mb-32 max-w-4xl tracking-tighter leading-[0.95]">
           A recording session <br/>
           <span className="text-white/40">without compromise.</span>
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen relative">
        <div className="w-full lg:w-1/2 flex flex-col">
          {steps.map((step, i) => (
            <div key={i} className={`step-trigger-${i} min-h-screen flex flex-col justify-center px-6 md:px-24 py-40`}>
              <span className="text-white/20 font-bold text-xs tracking-[0.2em] mb-6">{step.eyebrow}</span>
              <h3 className="LuxeFont text-4xl md:text-6xl text-white mb-8 tracking-tighter">{step.title}</h3>
              <p className="text-white/40 font-bold text-xl md:text-2xl mb-8 leading-tight tracking-tight">{step.text}</p>
              <p className="text-white/30 text-[16px] font-medium leading-relaxed max-w-sm">
                {step.subtext}
              </p>
            </div>
          ))}
        </div>

        <div className="visual-panel hidden lg:block absolute top-0 right-0 w-1/2 h-screen overflow-hidden border-l border-white/5">
          {steps.map((step, i) => (
            <div 
              key={i} 
              className={`step-image-${i} absolute inset-0 w-full h-full z-[${10 + i}]`}
              style={i === 0 ? {} : { clipPath: 'inset(100% 0% 0% 0%)' }}
            >
              <img src={step.image} alt={step.title} className="w-full h-full object-cover saturate-50 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-black"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
