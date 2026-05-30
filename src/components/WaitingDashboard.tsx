import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, supabaseGarage } from '@/lib/supabase';
import { Ticket, Mechanic } from '@/types';
import { IdleCarousel } from './IdleCarousel';
import { ActiveKanbanView } from './ActiveKanbanView';
import { useGarageStore } from '@/hooks/useGarageStore';
import { X, Maximize, Volume2, Play, Sliders, Bell, VolumeX, Music, Video, Mic } from 'lucide-react';
import { SpartanLogo } from './SpartanLogo';
import { MusicPlayer } from './MusicPlayer';

interface WaitingDashboardProps {
  companyId: string;
  mechanics: Mechanic[];
  onExit?: () => void;
}

export function WaitingDashboard({ companyId, mechanics, onExit }: WaitingDashboardProps) {
  const [mode, setMode] = useState<'idle' | 'active'>('idle');
  const [lastUpdatedTicket, setLastUpdatedTicket] = useState<Ticket | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { tickets, refreshData } = useGarageStore(companyId);
  const audioContextRef = useRef<boolean>(false);

  // Volúmenes independientes con persistencia en localStorage
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('nexus_vision_volume_music');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [videoVolume, setVideoVolume] = useState(() => {
    const saved = localStorage.getItem('nexus_vision_volume_video');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [voiceVolume, setVoiceVolume] = useState(() => {
    const saved = localStorage.getItem('nexus_vision_volume_voice');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [notificationVolume, setNotificationVolume] = useState(() => {
    const saved = localStorage.getItem('nexus_vision_volume_notification');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);

  // Sincronizar volúmenes con localStorage
  useEffect(() => {
    localStorage.setItem('nexus_vision_volume_music', musicVolume.toString());
  }, [musicVolume]);
  useEffect(() => {
    localStorage.setItem('nexus_vision_volume_video', videoVolume.toString());
  }, [videoVolume]);
  useEffect(() => {
    localStorage.setItem('nexus_vision_volume_voice', voiceVolume.toString());
  }, [voiceVolume]);
  useEffect(() => {
    localStorage.setItem('nexus_vision_volume_notification', notificationVolume.toString());
  }, [notificationVolume]);

  // Síntesis de sonido de campana digital (Web Audio API)
  const playChimeSound = useCallback((volumeValue: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      // Acorde armónico de campana: A5 y C#6
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1109.73, now);
      osc2.frequency.exponentialRampToValueAtTime(2219.46, now + 0.15);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volumeValue * 0.4, now + 0.08); // Ataque
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85); // Decaimiento suave
      
      osc.start(now);
      osc2.start(now);
      
      osc.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch (error) {
      console.error('[Web Audio API Chime Error]', error);
    }
  }, []);

  // Configuration (Could be moved to a settings file/db later)
  const voiceSettings = {
    enabled: true,
    statusWhitelist: ['Listo para entrega'], // Matches TicketStatus exactly
    pitch: 1.1, // Slightly higher pitch for female voice preference
    rate: 0.9, 
  };

  const announceTicket = useCallback((ticket: Ticket) => {
    if (!isAudioEnabled || !voiceSettings.enabled) {
      console.log('[Audio] Salto de anuncio (audio deshabilitado o settings en false)');
      return;
    }

    // Detener la música de fondo de inmediato
    setIsAnnouncing(true);

    try {
      console.log('[Audio] Anunciando ticket:', ticket.patente);
      const message = new SpeechSynthesisUtterance();
      
      const clientName = ticket.owner_name ? ticket.owner_name.trim() : 'Estimado Cliente';
      const vehicleBrand = ticket.brand && ticket.brand.trim() !== '' && ticket.brand !== 'Sin asignar'
        ? `marca ${ticket.brand.trim()}`
        : '';
      
      // Frase solicitada por el usuario
      message.text = `Atención. Cliente ${clientName}, su vehículo ${vehicleBrand} está listo para entrega.`;
      message.lang = 'es-CL';
      message.pitch = voiceSettings.pitch;
      message.rate = voiceSettings.rate;
      message.volume = voiceVolume; // Usar volumen configurado de voz

      message.onstart = () => {
        setIsAnnouncing(true);
      };
      message.onend = () => {
        setIsAnnouncing(false);
      };
      message.onerror = () => {
        setIsAnnouncing(false);
      };

      // Use a female voice if available
      const voices = window.speechSynthesis.getVoices();
      
      // Female voices commonly found in OS: Helena, Sabina (Windows), Monica, Paulina (Mac), Lucia (Google)
      const femaleKeywords = ['helena', 'sabina', 'monica', 'paulina', 'lucia', 'elena', 'laura', 'female', 'mujer'];
      
      const preferredVoice = voices.find(v => 
        v.lang.includes('es') && 
        femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
      ) || 
      voices.find(v => v.lang.includes('es') && v.name.includes('Google')) || 
      voices.find(v => v.lang.includes('es-CL')) ||
      voices.find(v => v.lang.includes('es'));
      
      if (preferredVoice) {
        console.log('[Audio] Usando voz:', preferredVoice.name);
        message.voice = preferredVoice;
      }

      window.speechSynthesis.speak(message);
    } catch (error) {
      console.error('[Audio Error]', error);
      setIsAnnouncing(false);
    }
  }, [isAudioEnabled, voiceVolume]);

  const testAudio = () => {
    const testTicket: Ticket = {
      id: 'test',
      patente: 'ABCD 12',
      status: 'Listo para entrega',
      owner_name: 'Juan Carlos',
      brand: 'Chevrolet'
    } as Ticket;
    announceTicket(testTicket);
  };

  const testChime = () => {
    playChimeSound(notificationVolume);
  };

  // Return to idle after 30 seconds of being active
  useEffect(() => {
    if (mode === 'active') {
      const timer = setTimeout(() => {
        setMode('idle');
        setLastUpdatedTicket(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Failsafe: Refresh data every 60 seconds in case Realtime fails
  useEffect(() => {
    if (!companyId) return;
    
    const interval = setInterval(() => {
      console.log('[WaitingDashboard] Sincronización de respaldo ejecutada...');
      refreshData();
    }, 60000);

    return () => clearInterval(interval);
  }, [companyId, refreshData]);

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    console.log('[WaitingDashboard] Suscribiendo a cambios en garage_tickets (Realtime Core)...');
    
    const channel = supabase
      .channel('waiting-room-dashboard-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, and DELETE
          schema: 'garage',
          table: 'garage_tickets',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          console.log(`[Realtime] Evento: ${eventType}`);

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const newStatus = (newRecord as any)?.status;
            const oldStatus = (oldRecord as any)?.status;

            // Trigger activation for new tickets or status changes (moved cards)
            const isNewTicket = eventType === 'INSERT';
            const statusChanged = oldStatus !== newStatus;

            if (isNewTicket || statusChanged) {
              console.log(`[Realtime] Activando Dashboard por: ${isNewTicket ? 'Nuevo Ticket' : 'Cambio de Estado'}`);
              
              // Sonar campana en cambios de tarjetas
              playChimeSound(notificationVolume);

              await refreshData();
              const updatedTicket = newRecord as Ticket;
              
              setLastUpdatedTicket(updatedTicket);
              setMode('active');

              // Trigger Voice Announcement if status is in whitelist
              if (newStatus && voiceSettings.statusWhitelist.includes(newStatus)) {
                // Small delay to let the UI transition first
                setTimeout(() => announceTicket(updatedTicket), 1500);
              }
            } else {
              // Other updates (e.g. notes) refresh data silently
              refreshData();
            }
          } else if (eventType === 'DELETE') {
            refreshData();
          }
        }
      )
      .subscribe((status) => {
        console.log('[WaitingDashboard] Estado de suscripción:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, refreshData, announceTicket, playChimeSound, notificationVolume]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleStart = () => {
    setIsAudioEnabled(true);
    // Dummy utterance to "unlock" audio in some browsers
    const unlock = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlock);
  };

  const { settings } = useGarageStore(companyId);

  if (!isAudioEnabled) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-[10000] gap-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <SpartanLogo className="w-48 h-48" />
          <h1 className="text-white text-6xl font-black uppercase tracking-tighter">
            ROMA <span className="text-[#FFB800]">CENTER</span>
          </h1>
          <p className="text-zinc-500 text-xl font-bold uppercase tracking-[0.3em]">Nexus Vision System</p>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="group relative flex items-center gap-6 px-12 py-6 bg-[#FFB800] text-black font-black text-3xl rounded-full transition-all"
        >
          <Play size={40} fill="currentColor" />
          INICIAR DASHBOARD
        </motion.button>

        <p className="text-zinc-600 text-sm animate-pulse">Haga clic para activar el sistema de voz y sincronización</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[9999] select-none">
      {/* Subtle Controls ... */}
      <div className="absolute top-4 right-4 z-[10000] flex gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={() => {
            setMode('active');
            refreshData();
          }}
          className="flex items-center px-3 py-1 bg-[#FFB800] text-black rounded-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Play className="w-3 h-3 mr-1.5" fill="currentColor" />
          <span className="text-[10px] font-black uppercase">Ver Estados</span>
        </button>
        <button 
          onClick={() => setShowAudioSettings(true)}
          className="flex items-center px-3 py-1 bg-zinc-900/50 hover:bg-zinc-800 text-[#FFB800] rounded-xl border border-zinc-800 backdrop-blur-md transition-colors"
          title="Ajustes de Sonido"
        >
          <Sliders className="w-3 h-3 mr-1.5" />
          <span className="text-[10px] font-bold uppercase">Sonidos</span>
        </button>
        <button 
          onClick={testAudio}
          className="flex items-center px-3 py-1 bg-zinc-900/50 hover:bg-zinc-800 text-[#FFB800] rounded-xl border border-zinc-800 backdrop-blur-md transition-colors"
        >
          <Volume2 className="w-3 h-3 mr-1.5" />
          <span className="text-[10px] font-bold uppercase">Probar Audio</span>
        </button>
        <button 
          onClick={toggleFullScreen}
          className="p-2 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 rounded-xl border border-zinc-800 backdrop-blur-md transition-colors"
          title="Pantalla Completa"
        >
          <Maximize className="w-4 h-4" />
        </button>
        {onExit && (
          <button 
            onClick={onExit}
            className="p-2 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 rounded-xl border border-zinc-800 backdrop-blur-md transition-colors"
            title="Cerrar Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'idle' ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <IdleCarousel 
              mechanics={mechanics} 
              settings={settings} 
              onVideoStateChange={setIsVideoPlaying}
              videoVolume={videoVolume}
            />
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full"
          >
            <ActiveKanbanView 
              tickets={tickets} 
              activeTicketId={lastUpdatedTicket?.id || ''} 
              mechanics={mechanics}
              settings={settings}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Music Player - BOTTOM RIGHT */}
      <div className="absolute bottom-8 right-8 z-[10000]">
        <MusicPlayer 
          isMutedBySystem={isVideoPlaying || isAnnouncing} 
          syncedVolume={musicVolume}
          onVolumeChange={setMusicVolume}
        />
      </div>

      {/* Audio Settings Panel (Glassmorphic Slide-over) */}
      <AnimatePresence>
        {showAudioSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAudioSettings(false)}
              className="fixed inset-0 bg-black z-[10001] pointer-events-auto"
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[450px] bg-zinc-950/90 backdrop-blur-3xl border-l border-white/10 p-8 flex flex-col z-[10002] pointer-events-auto text-white shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Sliders className="w-6 h-6 text-[#FFB800]" />
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Control de Audio</h3>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Ajustes de Sonido Ecosistema</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAudioSettings(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sliders Container */}
              <div className="flex-1 overflow-y-auto py-8 space-y-8 pr-1">
                {/* 1. Música */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-[#FFB800]" />
                      <span className="font-bold text-sm uppercase tracking-wider">Música de Fondo</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FFB800] bg-[#FFB800]/10 px-2.5 py-0.5 rounded-full">
                      {Math.round(musicVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setMusicVolume(musicVolume > 0 ? 0 : 0.5)}
                      className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"
                    >
                      {musicVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>
                </div>

                {/* 2. Video */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-[#FFB800]" />
                      <span className="font-bold text-sm uppercase tracking-wider">Videos del Carrusel</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FFB800] bg-[#FFB800]/10 px-2.5 py-0.5 rounded-full">
                      {Math.round(videoVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setVideoVolume(videoVolume > 0 ? 0 : 0.5)}
                      className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"
                    >
                      {videoVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={videoVolume}
                      onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>
                </div>

                {/* 3. Llamado */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-[#FFB800]" />
                      <span className="font-bold text-sm uppercase tracking-wider">Llamado Listo para Entrega</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FFB800] bg-[#FFB800]/10 px-2.5 py-0.5 rounded-full">
                      {Math.round(voiceVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setVoiceVolume(voiceVolume > 0 ? 0 : 1.0)}
                      className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"
                    >
                      {voiceVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>
                  <button
                    onClick={testAudio}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFB800]/10 hover:bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <Volume2 className="w-4 h-4" />
                    Probar Llamado por Voz
                  </button>
                </div>

                {/* 4. Notificaciones */}
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-[#FFB800]" />
                      <span className="font-bold text-sm uppercase tracking-wider">Notificaciones del Tablero</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#FFB800] bg-[#FFB800]/10 px-2.5 py-0.5 rounded-full">
                      {Math.round(notificationVolume * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setNotificationVolume(notificationVolume > 0 ? 0 : 0.5)}
                      className="p-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"
                    >
                      {notificationVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={notificationVolume}
                      onChange={(e) => setNotificationVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>
                  <button
                    onClick={testChime}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFB800]/10 hover:bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <Bell className="w-4 h-4" />
                    Probar Campana de Tablero
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-white/10 text-center">
                <p className="text-zinc-600 font-mono text-[10px] tracking-widest uppercase">
                  Roma Center // Ecosistema Integrado
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
