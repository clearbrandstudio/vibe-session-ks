import React from 'react';
import { useForm } from 'react-hook-form';
import PillButton from './ui/PillButton';

export default function LeadCapture() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  const onSubmit = (data) => {
    console.log('Lead submitted:', data);
    alert('Demo request received! Our team will contact you shortly.');
  };

  return (
    <section className="bg-black py-40 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card-premium p-16 md:p-24 border-white/5 relative overflow-hidden rounded-[64px]">
          {/* Background Ambient */}
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full" />
          
          <div className="relative z-10 text-center mb-20">
             <span className="text-white/20 font-bold text-[10px] tracking-[0.4em] uppercase mb-10 inline-block">FOR VENUES</span>
             <h2 className="LuxeFont text-5xl md:text-7xl text-white mb-8 tracking-tighter leading-[0.95]">
                Ready to upgrade <br/>
                <span className="text-white/40">your venue?</span>
             </h2>
             <p className="text-white/30 text-lg max-w-md mx-auto leading-relaxed font-medium">
                Tell us about your bar. Live in under 10 minutes.
             </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 max-w-lg mx-auto space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <input 
                {...register("name", { required: true })}
                placeholder="Name" 
                className={`bg-white/5 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-2xl p-5 font-bold text-white outline-none focus:border-white/40 transition-all placeholder:text-white/10`}
              />
              <input 
                {...register("whatsapp", { required: true })}
                placeholder="WhatsApp" 
                className={`bg-white/5 border ${errors.whatsapp ? 'border-red-500' : 'border-white/10'} rounded-2xl p-5 font-bold text-white outline-none focus:border-white/40 transition-all placeholder:text-white/10`}
              />
            </div>

            <div className="relative">
              <select 
                {...register("type", { required: true })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 font-bold text-white outline-none focus:border-white/40 transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled selected className="bg-black text-white/40">Venue Type</option>
                <option value="bar" className="bg-black">Bar / Pub</option>
                <option value="ktv" className="bg-black">KTV / Private Club</option>
                <option value="hotel" className="bg-black">Hotel / Lounge</option>
                <option value="other" className="bg-black">Other</option>
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <PillButton type="submit" variant="primary" className="w-full h-16 text-lg mt-4 shadow-2xl">
               Request Free Demo Call
            </PillButton>

            <p className="text-[10px] text-white/20 text-center font-bold uppercase tracking-[0.3em] mt-10">
               No contracts · No hardware · All SaaS
            </p>
          </form>

          <div className="mt-24 flex flex-wrap justify-center items-center gap-12 opacity-20">
             <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-white rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Global Support</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-white rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Multi-Room Ready</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-white rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Zero Latency</span>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
