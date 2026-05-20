import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import PillButton from './ui/PillButton';

const FeatureList = ({ items }) => (
  <ul className="space-y-4 mb-10">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-4">
        <div className="mt-1 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
        <span className="text-white/60 text-[15px] font-medium leading-snug">{item}</span>
      </li>
    ))}
  </ul>
);

export default function DualProductSplit() {
  const [hoveredSide, setHoveredSide] = useState(null);

  const sides = [
    {
      id: 'studio',
      tag: 'For Performers',
      heading: 'Your Voice. 4K Pro Video.',
      body: 'Phnom Penh\'s elite 4K recording studio. High-end audio engineering. Perfect lighting. Walk out with a cinematic video that\'s ready for the world.',
      features: [
        'Cinematic 4K Video Recording',
        'Studio-Grade Multi-Track Audio',
        'Permanent Digital Performance Card'
      ],
      cta: 'Book Your Session',
      variant: 'primary',
      bgImage: 'https://images.unsplash.com/photo-1516280440614-37939bb9218f?q=80&w=2670&auto=format&fit=crop',
    },
    {
      id: 'cloud',
      tag: 'For Venues',
      heading: 'The Cloud Karaoke OS.',
      body: 'Transform your bar with the SaaS platform built for SEA hospitality. Mobile selection, real-time queue, and digital signage. No extra hardware needed.',
      features: [
        'Netflix-Style Patron Kiosk',
        'Intelligent Queue Management',
        'Dynamic Promo Signage & Stingers'
      ],
      cta: 'Get SaaS Demo',
      variant: 'ghost',
      bgImage: 'https://images.unsplash.com/photo-1514525287737-fb4299ec5124?q=80&w=2574&auto=format&fit=crop',
    }
  ];

  return (
    <section className="relative w-full h-auto lg:h-[90vh] flex flex-col lg:flex-row overflow-hidden bg-black">
      {sides.map((side, idx) => {
        const isHovered = hoveredSide === side.id;
        const isOtherHovered = hoveredSide && hoveredSide !== side.id;

        return (
          <motion.div
            key={side.id}
            className={`relative min-h-[60vh] lg:h-full flex flex-col justify-end p-8 md:p-12 lg:p-24 overflow-hidden transition-all duration-1000 ease-[0.16, 1, 0.3, 1] cursor-default flex-1
              ${isHovered ? 'lg:flex-[1.2] z-30' : isOtherHovered ? 'lg:flex-[0.8] z-10' : 'z-20'}
              ${idx === 0 ? 'lg:border-r border-white/5' : ''}
            `}
            onMouseEnter={() => setHoveredSide(side.id)}
            onMouseLeave={() => setHoveredSide(null)}
          >
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src={side.bgImage} 
                alt={side.id} 
                className={`w-full h-full object-cover transition-all duration-1500 ${isHovered ? 'scale-110 saturate-100 opacity-40' : 'scale-100 saturate-0 opacity-20'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-lg">
              <motion.span 
                className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold tracking-[0.2em] uppercase mb-8 text-white/50"
              >
                {side.tag}
              </motion.span>
              
              <h2 className="LuxeFont text-4xl md:text-6xl text-white mb-6 leading-[1.1] tracking-tighter">
                {side.heading}
              </h2>

              <p className="text-white/40 text-[16px] font-medium leading-relaxed mb-10 max-w-sm">
                {side.body}
              </p>

              <FeatureList items={side.features} />

              <PillButton variant={side.variant} className="w-full md:w-auto h-14 px-10">
                {side.cta}
              </PillButton>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}
