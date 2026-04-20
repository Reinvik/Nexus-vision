import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, Mechanic, TicketStatus } from '@/types';
import { Clock, Play, CheckCircle2, User, Car, Bell } from 'lucide-react';
import { SpartanLogo } from './SpartanLogo';

interface ActiveKanbanViewProps {
  tickets: Ticket[];
  activeTicketId: string;
  mechanics: Mechanic[];
  settings?: any;
}

export function ActiveKanbanView({ tickets, activeTicketId, mechanics, settings }: ActiveKanbanViewProps) {
  const columns = useMemo(() => {
    return [
      {
        title: 'RECEPCIÓN',
        icon: <Clock className="w-10 h-10 text-white" />,
        statuses: ['Ingreso', 'En espera'] as TicketStatus[],
        color: 'bg-zinc-800 border-zinc-700 text-white',
        highlight: 'border-zinc-500'
      },
      {
        title: 'EN SERVICIO',
        icon: <Play className="w-10 h-10 text-black" />,
        statuses: ['En Mantención', 'Elevador 1', 'Elevador 2', 'Elevador 3', 'Elevador 4', 'Elevador 5', 'En Reparación'] as TicketStatus[],
        color: 'bg-[#FFB800] border-[#FFB800] text-black',
        highlight: 'border-white'
      },
      {
        title: 'LISTO ENTREGA',
        icon: <CheckCircle2 className="w-10 h-10 text-[#FFB800]" />,
        statuses: ['Listo para entrega'] as TicketStatus[],
        color: 'bg-zinc-900 border-[#FFB800]/50 text-[#FFB800]',
        highlight: 'border-[#FFB800]'
      },
    ];
  }, []);

  const getMechanicInfo = (ticket: Ticket) => {
    // 1. Resolve ID from various possible fields
    const rawId = ticket.mechanic_id || (ticket.mechanic_ids && ticket.mechanic_ids.length > 0 ? ticket.mechanic_ids[0] : null);
    
    // 2. Default fallback if no ID or name
    if (!rawId && !ticket.mechanic) return { name: 'Por asignar', photo: null };
    
    // 3. Resolve the best name
    // If ticket.mechanic is already a resolved name (from store), use it.
    // Otherwise, try to find in the mechanics list using full ID or partial ID.
    const mechanicObj = mechanics.find(m => 
      m.id === rawId || 
      (rawId && m.id && (m.id.toLowerCase().includes(rawId.toLowerCase()) || rawId.toLowerCase().includes(m.id.toLowerCase())))
    );

    const resolvedName = (ticket.mechanic && ticket.mechanic !== 'Sin asignar' && ticket.mechanic !== 'Mecánico') 
      ? ticket.mechanic 
      : (mechanicObj?.name || 'Mecánico');
    
    // 4. Look for featured info in settings (landing_config) for the photo
    // We match by ID first (full or partial), then by name (fuzzy)
    const featuredMechanic = settings?.landing_config?.dashboard?.featured_mechanics?.find(
      (fm: any) => {
        const idMatch = rawId && fm.id && (
          fm.id.toLowerCase().includes(rawId.toLowerCase()) || 
          rawId.toLowerCase().includes(fm.id.toLowerCase())
        );
        const nameMatch = resolvedName && fm.name && (
          fm.name.toLowerCase().includes(resolvedName.toLowerCase()) || 
          resolvedName.toLowerCase().includes(fm.name.toLowerCase())
        );
        return idMatch || nameMatch;
      }
    );

    return { 
      name: resolvedName, 
      photo: featuredMechanic?.photo || null 
    };
  };

  return (
    <div className="w-full h-full bg-[#0A0A0A] p-10 flex flex-col font-sans">
      <div className="flex justify-between items-center mb-8 px-4">
        <div className="flex items-center gap-10">
          <SpartanLogo className="w-20 h-20" />
          <div>
            <h1 className="text-white text-6xl font-black uppercase tracking-tighter leading-none">
              ROMA <span className="text-[#FFB800]">CENTER</span>
            </h1>
            <p className="text-zinc-500 text-lg font-bold uppercase tracking-[0.5em] mt-2">Elite Service Control</p>
          </div>
        </div>
        <div className="flex gap-16 items-center">
           <div className="bg-zinc-900/50 p-4 rounded-[45px] border border-zinc-800/50 backdrop-blur-xl">
            <div className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1 text-center">Actualizado</div>
            <div className="text-white text-4xl font-black font-mono">
               {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 flex-1 min-h-0">
        {columns.map((col) => {
          // Mostrar todos los tickets activos con ese estado (no filtrar por fecha)
          const colTickets = tickets.filter(t => col.statuses.includes(t.status));
          
          return (
            <div key={col.title} className="flex flex-col h-full group">
              <div className={`
                p-6 rounded-[45px] border-b-0 flex items-center gap-8 mb-8 shadow-2xl transition-transform group-hover:scale-[1.02] duration-500
                ${col.color}
              `}>
                <div className="bg-black/10 p-4 rounded-3xl">
                  {col.icon}
                </div>
                <span className="text-3xl font-black uppercase tracking-tighter">{col.title}</span>
                <span className="ml-auto text-3xl font-black bg-black/20 px-6 py-2 rounded-3xl">
                  {colTickets.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pb-10 px-2">
                <AnimatePresence mode="popLayout">
                  {colTickets.map((ticket) => {
                    const isActive = ticket.id === activeTicketId;
                    const mechInfo = getMechanicInfo(ticket);
                    
                    return (
                      <motion.div
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ 
                          opacity: 1, 
                          scale: isActive ? 1.08 : 1,
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.8, x: -50 }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 400, 
                          damping: 30 
                        }}
                        className={`
                          relative rounded-[40px] border-4 backdrop-blur-3xl shadow-2xl overflow-hidden flex
                          ${isActive 
                            ? 'bg-[#FFB800]/10 border-[#FFB800] z-20 ring-8 ring-[#FFB800]/20' 
                            : 'bg-zinc-900/40 border-zinc-800/50'
                          }
                        `}
                      >
                        {/* LEFT: INFORMATION */}
                        <div className="flex-1 p-5 flex flex-col justify-between min-h-[160px]">
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div className="space-y-1">
                                <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest block">Cliente / Dueño</span>
                                <h4 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                                  {ticket.owner_name || ticket.customer_name || 'Cliente Particular'}
                                </h4>
                              </div>
                              {isActive && (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="bg-[#FFB800] text-black px-4 py-1 rounded-full flex items-center gap-2"
                                >
                                  <Bell className="w-4 h-4" fill="black" />
                                  <span className="text-xs font-black uppercase tracking-tighter italic">En Marcha</span>
                                </motion.div>
                              )}
                            </div>

                            <div className="space-y-1 mb-6">
                              <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest block">Vehículo</span>
                              <h3 className={`text-2xl font-black uppercase leading-none ${isActive ? 'text-[#FFB800]' : 'text-white'}`}>
                                {ticket.brand} {ticket.model}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-end justify-between">
                            <div className={`
                              px-4 py-1.5 rounded-2xl border-2 shadow-xl flex flex-col items-center justify-center
                              ${isActive ? 'bg-black border-[#FFB800]' : 'bg-zinc-800 border-zinc-700'}
                            `}>
                              <span className="text-white/30 text-[8px] uppercase font-black tracking-tighter mb-1">Patente</span>
                              <span className="text-2xl font-mono font-black text-white tracking-[0.1em] italic leading-none">
                                {ticket.patente?.toUpperCase() || 'S/P'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-zinc-600 text-[10px] uppercase font-black tracking-widest block mb-1">Mecánico Asignado</span>
                              <span className="text-xl font-black uppercase tracking-tighter italic text-white leading-none">
                                <span className="text-[#FFB800] mr-2">●</span>
                                {/* Filter out long UUID strings if they somehow leak as names */}
                                {mechInfo.name?.length > 25 ? 'Mecánico' : mechInfo.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: MECHANIC PORTRAIT */}
                        <div className="w-[340px] relative bg-zinc-900 overflow-hidden flex-shrink-0 border-l border-white/5">
                          {mechInfo.photo ? (
                            <>
                              <img 
                                src={mechInfo.photo} 
                                alt={mechInfo.name} 
                                className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700 scale-110"
                              />
                              {/* Integrated gradients to avoid vertical lines and create depth */}
                              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/60 via-black/20 to-transparent z-10" />
                              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/10 z-10" />
                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-10" />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                              <User className="w-12 h-12 text-zinc-900" />
                            </div>
                          )}
                        </div>

                        {isActive && (
                          <>
                            <motion.div 
                              className="absolute inset-0 rounded-[40px] border-4 border-[#FFB800] z-30 pointer-events-none"
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div 
                              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFB800] to-transparent z-40 opacity-50"
                              animate={{ top: ['0%', '100%'] }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            />
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {colTickets.length === 0 && (
                   <div className="h-40 flex items-center justify-center rounded-[40px] border-2 border-dashed border-zinc-800/50 text-zinc-700">
                      <span className="text-2xl font-bold uppercase tracking-widest">Sin vehículos</span>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-between items-center bg-zinc-900/30 p-5 rounded-[45px] border border-zinc-800/50">
        <div className="flex gap-16">
          <div className="flex items-center gap-4 group">
            <div className="w-5 h-5 rounded-full bg-zinc-600 ring-4 ring-zinc-600/20" />
            <span className="text-lg font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">Espera</span>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="w-5 h-5 rounded-full bg-[#FFB800] ring-4 ring-[#FFB800]/20" />
            <span className="text-lg font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">En Box</span>
          </div>
          <div className="flex items-center gap-4 group">
            <div className="w-5 h-5 rounded-full bg-white ring-4 ring-white/20" />
            <span className="text-lg font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">Retirar</span>
          </div>
        </div>
        <div className="bg-white/5 px-8 py-3 rounded-full border border-white/10 text-zinc-400 text-base font-bold italic">
          Nexus Vision • Roma Center Elite Dashboard
        </div>
      </div>
    </div>
  );
}
