import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpartanLogo } from './SpartanLogo';
import { GarageSettings, Mechanic } from '@/types';

interface IdleCarouselProps {
  mechanics: Mechanic[];
  settings: GarageSettings | null;
}

type DisplayItem = 
  | { type: 'tip'; data: { title: string; subtitle: string; description: string; image: string } }
  | { type: 'mechanic'; data: { name: string; role: string; specialty: string; photo: string; description: string } };

export function IdleCarousel({ mechanics: _mechanics, settings }: IdleCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract dynamic data
  const dashboard = (settings?.landing_config as any)?.dashboard || { tips: [], featured_mechanics: [], rotation_speed: 15000 };
  const dynamicTips = dashboard.tips || [];
  const featuredMechanics = dashboard.featured_mechanics || [];
  const rotationSpeed = dashboard.rotation_speed || 15000;

  // Interleave tips and mechanics
  const displayItems: DisplayItem[] = [];
  const maxLen = Math.max(dynamicTips.length, featuredMechanics.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (dynamicTips[i]) displayItems.push({ type: 'tip', data: dynamicTips[i] });
    if (featuredMechanics[i]) displayItems.push({ type: 'mechanic', data: featuredMechanics[i] });
  }

  // Fallback if empty
  const items = displayItems.length > 0 ? displayItems : [
    { type: 'tip', data: { 
      title: 'Bienvenido a Roma Center', 
      subtitle: 'Excelencia Automotriz', 
      description: 'Estamos trabajando para brindarte el mejor servicio.',
      image: '/assets/tips/oil.png' 
    }}
  ] as DisplayItem[];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, rotationSpeed);

    return () => clearInterval(timer);
  }, [items.length, rotationSpeed]);

  const currentItem = items[currentIndex];

  return (
    <div className="w-full h-full flex bg-[#050505] overflow-hidden">
      {/* LEFT SIDE: CINEMATIC VISUAL */}
      <div className="w-1/2 h-full relative overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentItem.type}-${currentIndex}`}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative flex items-center justify-center p-20"
          >
            {currentItem.type === 'tip' ? (
              <motion.img 
                src={currentItem.data.image} 
                alt={currentItem.data.title}
                animate={{
                  scale: [1, 1.05, 1],
                  x: [0, -5, 0],
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full h-full object-cover absolute inset-0"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                 <motion.img 
                    src={currentItem.data.photo} 
                    alt={currentItem.data.name}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      x: [0, 10, 0],
                    }}
                    transition={{
                      scale: { duration: 1.5, ease: "easeOut" },
                      opacity: { duration: 1 },
                      x: { duration: 10, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-full h-full object-cover absolute inset-0"
                 />
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505]" />
                 <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
                 
                 <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-32 left-24 z-20"
                 >
                    <div className="bg-[#FFB800] text-black px-8 py-3 rounded-full font-black text-2xl uppercase tracking-tighter shadow-[0_0_40px_rgba(255,184,0,0.4)]">
                       {currentItem.data.specialty}
                    </div>
                 </motion.div>
              </div>
            )}
            
            {/* Overlays: Smoother transition to the right panel */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-[#050505] translate-x-[1px]" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Floating Team Badge (Persistent) */}
        <div className="absolute bottom-12 left-12 flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl">
          <div className="flex -space-x-3">
             {featuredMechanics.slice(0, 3).map((m: any, i: number) => (
               <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-zinc-800 transition-transform hover:scale-110 overflow-hidden">
                 <img src={m.photo} className="w-full h-full object-cover" alt={m.name} />
               </div>
             ))}
          </div>
          <div className="text-xs">
            <p className="text-white font-bold">Equipo de Expertos</p>
            <p className="text-zinc-400">Roma Center</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: INFORMATION PANEL */}
      <div className="w-1/2 h-full flex flex-col justify-center px-24 relative">
        {/* Background branding */}
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
          <SpartanLogo isWatermark className="w-[120%] h-[120%] -rotate-12 translate-x-1/4" />
        </div>

        <div className="relative z-10 space-y-12">
          {/* Header */}
          <div className="flex items-center gap-6">
            <SpartanLogo className="w-16 h-16" />
            <div>
              <h1 className="text-white text-4xl font-black uppercase tracking-tighter leading-none">
                ROMA <span className="text-[#FFB800]">CENTER</span>
              </h1>
              <p className="text-[#FFB800] font-bold uppercase tracking-[0.4em] text-xs mt-1">Elite Performance Dashboard</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentItem.type}-${currentIndex}-text`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <span className="text-[#FFB800] font-bold uppercase tracking-widest text-sm flex items-center gap-3">
                  <span className="w-12 h-[2px] bg-[#FFB800]" />
                  {currentItem.type === 'tip' ? currentItem.data.subtitle : currentItem.data.role}
                </span>
                <h2 className="text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                  {currentItem.type === 'tip' ? (
                    currentItem.data.title.split(' ').map((word, i) => (
                      <React.Fragment key={i}>
                        {i === 0 ? <span className="text-[#FFB800]">{word}</span> : word}{' '}
                        {i === 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      <span className="text-[#FFB800]">{currentItem.data.name.split(' ')[0]}</span>
                      <br />
                      {currentItem.data.name.split(' ').slice(1).join(' ')}
                    </>
                  )}
                </h2>
              </div>

              <p className="text-3xl text-zinc-400 max-w-2xl leading-relaxed font-light italic">
                "{currentItem.data.description}"
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress Indicators */}
          <div className="flex items-center gap-4 pt-12">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="relative h-1.5 rounded-full overflow-hidden bg-zinc-900 flex-1 max-w-[100px]"
              >
                <motion.div 
                  className={`absolute inset-0 bg-[#FFB800] ${i === currentIndex ? 'w-full' : 'w-0'}`}
                  initial={false}
                  animate={{ width: i === currentIndex ? '100%' : '0%' }}
                  transition={{ 
                    duration: i === currentIndex ? rotationSpeed / 1000 : 0.5, 
                    ease: "linear" 
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Branding */}
        <div className="absolute bottom-16 right-24 text-right">
          <p className="text-zinc-600 font-mono text-sm tracking-widest">NV.SYSTEM.DYNAMIC // DASHBOARD.V2</p>
        </div>
      </div>
    </div>
  );
}
