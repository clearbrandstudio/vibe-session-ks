import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

const GalleryItem = ({ type, content, attribution, size, image }) => {
  if (type === 'video') {
    return (
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className={`relative rounded-[32px] overflow-hidden group cursor-pointer ${size === 'large' ? 'aspect-[4/5]' : 'aspect-square'}`}
      >
        <img src={image} alt="Gallery" className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 saturate-50 group-hover:saturate-100" />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
          <div className="w-20 h-20 rounded-full glass-card-premium flex items-center justify-center text-white">
            <Play fill="currentColor" size={28} className="translate-x-1" />
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8">
           <p className="text-white LuxeFont text-xl transition-all duration-700 translate-y-4 group-hover:translate-y-0">{content}</p>
           <span className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em]">{attribution}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`glass-card-premium p-10 flex flex-col justify-center border-white/5 hover:border-white/10 transition-colors ${size === 'large' ? 'aspect-[4/3]' : 'aspect-square'}`}>
      <span className="text-white/20 text-5xl LuxeFont mb-8">“</span>
      <p className="LuxeFont text-2xl text-white/80 leading-tight mb-10">
        {content}
      </p>
      <div className="mt-auto pt-8 border-t border-white/5">
        <span className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">{attribution}</span>
      </div>
    </div>
  );
};

export default function Gallery() {
  return (
    <section className="bg-black py-40 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-32">
          <div className="max-w-2xl">
             <span className="text-white/20 font-bold tracking-[0.3em] uppercase text-[11px]">Proof of Talent</span>
             <h2 className="LuxeFont text-5xl md:text-8xl text-white mt-10 tracking-tighter leading-[0.95]">
               Memories captured <br/>
               <span className="text-white/40">professionally.</span>
             </h2>
          </div>
          <div className="flex gap-16">
             <div className="flex flex-col">
                <span className="LuxeFont text-5xl text-white mb-2 tracking-tighter">48</span>
                <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Venues Live</span>
             </div>
             <div className="flex flex-col">
                <span className="LuxeFont text-5xl text-white mb-2 tracking-tighter">4K</span>
                <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Resolution</span>
             </div>
             <div className="flex flex-col">
                <span className="LuxeFont text-5xl text-white mb-2 tracking-tighter">24h</span>
                <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">Delivery</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
           <GalleryItem 
              type="video" 
              image="https://images.unsplash.com/photo-1516280440614-37939bb9218f?q=80&w=2670&auto=format&fit=crop"
              content="Solo: Adele Cover" 
              attribution="Sarah K., Phnom Penh" 
              size="large"
           />
           <div className="flex flex-col gap-10">
              <GalleryItem 
                type="quote" 
                content="Setup took 8 minutes. Our karaoke revenue went up 40% in week one." 
                attribution="Manager, The Howl Bar" 
              />
              <GalleryItem 
                type="video" 
                image="https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2670&auto=format&fit=crop"
                content="Duet: Golden Hour" 
                attribution="Studio Session" 
              />
           </div>
           <div className="flex flex-col gap-10 lg:mt-24">
              <GalleryItem 
                type="quote" 
                content="The video quality is better than my professional wedding shoot." 
                attribution="Dara M., Artist" 
              />
              <GalleryItem 
                type="video" 
                image="https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=2574&auto=format&fit=crop"
                content="Bachelorette Pack" 
                attribution="Group Session" 
              />
           </div>
        </div>
      </div>
    </section>
  );
}
