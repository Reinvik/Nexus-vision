import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, supabaseGarage } from '@/lib/supabase';
import { Ticket, Mechanic } from '@/types';
import { IdleCarousel } from './IdleCarousel';
import { ActiveKanbanView } from './ActiveKanbanView';
import { useGarageStore } from '@/hooks/useGarageStore';
import { X, Maximize, Volume2, Play } from 'lucide-react';
import { SpartanLogo } from './SpartanLogo';

interface WaitingDashboardProps {
  companyId: string;
  mechanics: Mechanic[];
  onExit?: () => void;
}

export function WaitingDashboard({ companyId, mechanics, onExit }: WaitingDashboardProps) {
  const [mode, setMode] = useState<'idle' | 'active'>('idle');
  const [lastUpdatedTicket, setLastUpdatedTicket] = useState<Ticket | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const { tickets, refreshData } = useGarageStore(companyId);
  const audioContextRef = useRef<boolean>(false);

  // Configuration (Could be moved to a settings file/db later)
  const voiceSettings = {
    enabled: true,
    statusWhitelist: ['reparado', 'listo_entrega'], // Expanded whitelist
    pitch: 1.0,
    rate: 0.85, // Slightly slower for better clarity
  };

  const announceTicket = useCallback((ticket: Ticket) => {
    if (!isAudioEnabled || !voiceSettings.enabled) {
      console.log('[Audio] Salto de anuncio (audio deshabilitado o settings en false)');
      return;
    }

    try {
      console.log('[Audio] Anunciando ticket:', ticket.patente);
      const message = new SpeechSynthesisUtterance();
      
      // Spell out the plate letter by letter for clarity
      const cleanPlate = ticket.patente?.toUpperCase().split('').join(' ') || 'desconocida';
      
      // Custom announcement for Roma Center
      message.text = `Atención. El vehículo con patente ${cleanPlate}, está listo para entrega. Repito, patente ${cleanPlate}, listo para entrega.`;
      message.lang = 'es-CL';
      message.pitch = voiceSettings.pitch;
      message.rate = voiceSettings.rate;
      message.volume = 1;

      // Use a professional voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Google')) || 
                             voices.find(v => v.lang.includes('es-CL')) ||
                             voices.find(v => v.lang.includes('es'));
      
      if (preferredVoice) message.voice = preferredVoice;

      window.speechSynthesis.speak(message);
    } catch (error) {
      console.error('[Audio Error]', error);
    }
  }, [isAudioEnabled]);

  const testAudio = () => {
    const testTicket: Ticket = {
      id: 'test',
      patente: 'TEST 12',
      status: 'listo_entrega',
      customer_name: 'Usuario de Prueba'
    } as Ticket;
    announceTicket(testTicket);
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
  }, [companyId, refreshData, announceTicket]);

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
      {/* Subtle Controls */}
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
            <IdleCarousel mechanics={mechanics} settings={settings} />
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
    </div>
  );
}
