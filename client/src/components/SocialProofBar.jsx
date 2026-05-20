import React from 'react';

const reviews = [
  "★★★★★ \"Professional 4K recording in minutes.\" — Sarah K., Expat",
  "·  48 venues running Vibe Sessions Cloud  ·",
  "★★★★★ \"Our bar's ROI doubled with the SaaS.\" — Manager, The Howl",
  "·  Real audio. Cinematic video. Yours forever.  ·",
  "★★★★★ \"Best karaoke experience in SEA.\" — Dara M., Artist",
  "·  Available tonight. Phnom Penh's finest.  ·"
];

export default function SocialProofBar() {
  return (
    <div className="w-full bg-black border-y border-white/5 overflow-hidden py-4 flex items-center relative z-20">
      <div className="flex animate-[marquee_45s_linear_infinite] whitespace-nowrap">
        {[...reviews, ...reviews, ...reviews].map((item, i) => {
          const isReview = item.includes('★★★★★');
          return (
            <span 
              key={i} 
              className={`mx-10 flex items-center gap-3 ${isReview ? 'text-white/80 font-bold text-[14px]' : 'text-white/20 tracking-[0.3em] uppercase text-[11px] font-bold'}`}
            >
              {isReview ? (
                 <>
                   <span className="text-white/40">★★★★★</span>
                   {item.replace('★★★★★', '').trim()}
                 </>
              ) : (
                item
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
