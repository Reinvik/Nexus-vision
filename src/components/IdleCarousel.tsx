import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpartanLogo } from './SpartanLogo';
import { GarageSettings, Mechanic } from '@/types';

interface IdleCarouselProps {
  mechanics: Mechanic[];
  settings: GarageSettings | null;
  onVideoStateChange?: (isActive: boolean) => void;
  videoVolume?: number; // 0 to 1
}

type DisplayItem = 
  | { type: 'tip'; data: { title: string; subtitle: string; description: string; image: string } }
  | { type: 'mechanic'; data: { name: string; role: string; specialty: string; photo: string; description: string } }
  | { type: 'video'; data: { title: string; subtitle: string; description: string; video_url: string } };

function getVideoEmbedUrl(url: string) {
  if (!url) return '';
  
  // YouTube Detection
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
    else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
    else if (url.includes('shorts/')) videoId = url.split('shorts/')[1].split('?')[0];
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1`;
    }
  }

  // Instagram Detection
  if (url.includes('instagram.com')) {
    const parts = url.split('/');
    const pIndex = parts.findIndex(p => p === 'p' || p === 'reels' || p === 'reel');
    if (pIndex !== -1 && parts[pIndex + 1]) {
      const code = parts[pIndex + 1];
      // Use /p/ format for better compatibility even for reels
      return `https://www.instagram.com/p/${code}/embed`;
    }
  }
  
  return url;
}

function getVideoId(url: string) {
  if (!url) return '';
  if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
  if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
  if (url.includes('shorts/')) return url.split('shorts/')[1].split('?')[0];
  return '';
}

function YoutubePlayer({ videoId, onEnded, title, volume = 0.5 }: { videoId: string, onEnded: () => void, title: string, volume?: number }) {
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let player: any;
    
    // Safety timeout: if the video doesn't end in 3 minutes, force next
    const safetyTimer = setTimeout(() => {
      onEnded();
    }, 180000); 

    const initPlayer = () => {
      player = new (window as any).YT.Player(`youtube-player-${videoId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 0, // Enable audio
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          showinfo: 0,
          loop: 0 // Disable internal loop to catch ENDED event
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = player;
            event.target.setVolume(volume * 100);
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              clearTimeout(safetyTimer);
              onEnded();
            }
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      clearTimeout(safetyTimer);
      if (player && player.destroy) player.destroy();
      playerRef.current = null;
    };
  }, [videoId, onEnded]);

  // Sincronizar volumen dinámicamente cuando el prop cambie
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  return <div id={`youtube-player-${videoId}`} className="w-full h-full absolute inset-0" title={title} />;
}

export function IdleCarousel({ mechanics: _mechanics, settings, onVideoStateChange, videoVolume = 0.5 }: IdleCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMech, setSelectedMech] = useState<any>(null);

  // Extract dynamic data and memoize items to prevent unnecessary re-renders
  const { items, featuredMechanics } = React.useMemo(() => {
    const dashboard = (settings?.landing_config as any)?.dashboard || { tips: [], featured_mechanics: [], videos: [], rotation_speed: 15000 };
    const dynamicTips = dashboard.tips || [];
    const featuredMechanics = dashboard.featured_mechanics || [];
    const dynamicVideos = dashboard.videos || [];
    
    const displayItems: DisplayItem[] = [];
    const maxLen = Math.max(dynamicTips.length, featuredMechanics.length, dynamicVideos.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (dynamicTips[i]) displayItems.push({ type: 'tip', data: dynamicTips[i] });
      if (dynamicVideos[i]) displayItems.push({ type: 'video', data: dynamicVideos[i] });
      if (featuredMechanics[i]) displayItems.push({ type: 'mechanic', data: featuredMechanics[i] });
    }

    const finalItems = displayItems.length > 0 ? displayItems : [
      { type: 'tip', data: { 
        title: 'Bienvenido a Roma Center', 
        subtitle: 'Excelencia Automotriz', 
        description: 'Estamos trabajando para brindarte el mejor servicio.',
        image: '/assets/tips/oil.png' 
      }}
    ] as DisplayItem[];

    return { items: finalItems, featuredMechanics };
  }, [settings]);

  const rotationSpeed = (settings?.landing_config as any)?.dashboard?.rotation_speed || 15000;
  const currentItem = items[currentIndex];

  const handleNext = React.useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    onVideoStateChange?.(currentItem.type === 'video');
  }, [currentItem.type, onVideoStateChange]);

  useEffect(() => {
    // If it's not a video, use the standard timer
    if (currentItem.type !== 'video') {
      const timer = setTimeout(handleNext, rotationSpeed);
      return () => clearTimeout(timer);
    }
    
    // For Instagram videos (we can't detect end), we set a longer safety timer (e.g. 60s)
    if (currentItem.type === 'video' && currentItem.data.video_url.includes('instagram.com')) {
      const timer = setTimeout(handleNext, 60000); // 60 seconds for IG
      return () => clearTimeout(timer);
    }

    // For YouTube, we rely on the API
  }, [currentIndex, currentItem.type, handleNext, rotationSpeed]);

  // YouTube API Integration
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

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
            ) : currentItem.type === 'video' ? (
              <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-black">
                 {currentItem.data.video_url.includes('youtube.com') || currentItem.data.video_url.includes('youtu.be') ? (
                    <YoutubePlayer 
                      videoId={getVideoId(currentItem.data.video_url)} 
                      onEnded={handleNext}
                      title={currentItem.data.title}
                      volume={videoVolume}
                    />
                 ) : (
                   <iframe 
                      src={getVideoEmbedUrl(currentItem.data.video_url)}
                      className="w-full h-full absolute inset-0 border-0"
                      allow="autoplay; encrypted-media"
                      title={currentItem.data.title}
                   />
                 )}
                 {/* Invisible overlay to prevent interaction - set to none for IG manual play */}
                 <div className="absolute inset-0 z-10 pointer-events-none" />
                 
                 {/* Gradients - also set to none to allow clicks */}
                 <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-[#050505] z-20 pointer-events-none" />
              </div>
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-[#050505] translate-x-[1px] pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {/* Floating Team Badge (Persistent) - LARGER AND INTERACTIVE */}
        <div className="absolute bottom-12 left-12 flex items-center gap-8 bg-black/60 backdrop-blur-3xl border border-white/10 p-6 rounded-[32px] shadow-2xl z-[50]">
          <div className="flex -space-x-5">
             {featuredMechanics.slice(0, 3).map((m: any, i: number) => (
               <motion.button 
                 key={i} 
                 whileHover={{ scale: 1.15, zIndex: 10, y: -5 }}
                 onClick={() => setSelectedMech(m)}
                 className="w-20 h-20 rounded-full border-[3px] border-[#050505] bg-zinc-800 shadow-xl overflow-hidden cursor-pointer"
               >
                 <img src={m.photo} className="w-full h-full object-cover" alt={m.name} />
               </motion.button>
             ))}
            </div>
            <div className="space-y-1">
              <p className="text-white text-xl font-black uppercase tracking-tighter">Equipo de</p>
              <p className="text-[#FFB800] text-sm font-bold uppercase tracking-[0.3em]">Roma Center</p>
            </div>
          </div>
      </div>

      {/* MECHANIC LAMINA (OVERLAY) */}
      <AnimatePresence>
        {selectedMech && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-20 bg-black/95 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1.1, y: -20, opacity: 0 }}
              className="relative w-full max-w-6xl aspect-[16/9] bg-[#050505] rounded-[60px] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedMech(null)}
                className="absolute top-10 right-10 z-50 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>

              {/* Left: Huge Portrait */}
              <div className="w-1/2 h-full relative">
                <img src={selectedMech.photo} className="w-full h-full object-cover" alt={selectedMech.name} />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050505]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
              </div>

              {/* Right: Info */}
              <div className="w-1/2 h-full flex flex-col justify-center px-20 space-y-10">
                <div className="space-y-4">
                  <div className="inline-block bg-[#FFB800] text-black px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(255,184,0,0.3)]">
                    {selectedMech.specialty || 'ESPECIALISTA ELITE'}
                  </div>
                  <h2 className="text-8xl font-black text-white uppercase tracking-tighter leading-[0.85]">
                    <span className="text-[#FFB800]">{selectedMech.name.split(' ')[0]}</span>
                    <br />
                    {selectedMech.name.split(' ').slice(1).join(' ')}
                  </h2>
                  <p className="text-[#FFB800] text-2xl font-bold uppercase tracking-[0.4em] pt-2">{selectedMech.role}</p>
                </div>

                <div className="space-y-6">
                  <div className="h-[2px] w-24 bg-[#FFB800]" />
                  <p className="text-3xl text-zinc-400 font-light italic leading-relaxed max-w-xl">
                    "{selectedMech.description}"
                  </p>
                </div>

                <div className="pt-10 flex gap-4">
                   <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl">
                      <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Status</p>
                      <p className="text-white text-xl font-bold">Activo en Planta</p>
                   </div>
                   <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl">
                      <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">Experiencia</p>
                      <p className="text-white text-xl font-bold">Certificado Senior</p>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {currentItem.type === 'tip' ? currentItem.data.subtitle : currentItem.type === 'video' ? currentItem.data.subtitle : currentItem.data.role}
                </span>
                <h2 className="text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                  {currentItem.type === 'tip' ? (
                    currentItem.data.title.split(' ').map((word, i) => (
                      <React.Fragment key={i}>
                        {i === 0 ? <span className="text-[#FFB800]">{word}</span> : word}{' '}
                        {i === 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : currentItem.type === 'video' ? (
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
