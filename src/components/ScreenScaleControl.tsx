import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Laptop, 
  Tv, 
  Minus, 
  Plus, 
  RotateCcw, 
  SlidersHorizontal,
  X
} from 'lucide-react';
import { useUiScale } from '../hooks/useUiScale';
import { cn } from '../lib/utils';

interface ScreenScaleControlProps {
  variant?: 'popover' | 'compact' | 'inline';
  className?: string;
  buttonClassName?: string;
}

const PRESETS = [
  { label: 'Móvil', sub: 'Estándar 1:1', value: 1.0, icon: Smartphone, tag: '100%' },
  { label: 'Laptop', sub: '13" - 15"', value: 0.95, icon: Laptop, tag: '95%' },
  { label: 'Monitor', sub: 'Tablero amplio', value: 0.85, icon: Monitor, tag: '85%' },
  { label: 'Modo TV', sub: 'Sala / Distancia', value: 1.30, icon: Tv, tag: '130%' },
];

export function ScreenScaleControl({
  variant = 'popover',
  className,
  buttonClassName
}: ScreenScaleControlProps) {
  const { 
    scale, 
    percentage, 
    applyScale, 
    setScalePreset, 
    stepScale, 
    resetScale, 
    isDefault,
    minScale,
    maxScale
  } = useUiScale();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const renderControls = (isModal: boolean = false) => (
    <div className={cn("space-y-4 text-white", isModal ? "p-5" : "p-0")}>
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FFB800]/10 text-[#FFB800]">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Regulador de Pantalla TV / Monitor
            </h4>
            <p className="text-[10px] text-zinc-400">
              Calibra el tamaño de tarjetas y textos según la distancia
            </p>
          </div>
        </div>
        {isModal && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selector de Presets */}
      <div>
        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-2">
          Resolución / Dispositivo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const isSelected = Math.abs(scale - p.value) < 0.02;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setScalePreset(p.value)}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all",
                  isSelected
                    ? "bg-[#FFB800]/20 border-[#FFB800] text-white shadow-lg"
                    : "bg-white/5 border-white/10 hover:border-white/20 text-zinc-300 hover:bg-white/10"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  isSelected ? "bg-[#FFB800] text-black font-bold" : "bg-white/10 text-zinc-400"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{p.label}</span>
                    <span className="text-[10px] font-mono font-black text-[#FFB800] ml-1">
                      {p.tag}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-400 truncate block">{p.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ajuste Fino */}
      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            Escala Manual
          </span>
          <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[#FFB800]">
            {percentage}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => stepScale(-0.05)}
            disabled={scale <= minScale}
            className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 text-white transition-all active:scale-95 shadow-sm"
            title="Reducir 5%"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={0.05}
            value={scale}
            onChange={(e) => applyScale(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFB800]"
          />

          <button
            type="button"
            onClick={() => stepScale(0.05)}
            disabled={scale >= maxScale}
            className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 text-white transition-all active:scale-95 shadow-sm"
            title="Aumentar 5%"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Restablecer */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={resetScale}
          disabled={isDefault}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all",
            isDefault
              ? "text-zinc-500 cursor-not-allowed opacity-50"
              : "text-[#FFB800] hover:bg-[#FFB800]/10"
          )}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restablecer (100%)</span>
        </button>

        <span className="text-[9px] text-zinc-500 italic">
          Guardado automático
        </span>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1.5 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-1 text-white shadow-lg", className)}>
        <button
          type="button"
          onClick={() => stepScale(-0.05)}
          disabled={scale <= minScale}
          className="p-1.5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-40"
          title="Reducir tamaño"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={resetScale}
          className="px-2 py-0.5 text-[11px] font-mono font-black text-[#FFB800] hover:text-amber-300"
          title="Restablecer 100%"
        >
          {percentage}%
        </button>
        <button
          type="button"
          onClick={() => stepScale(0.05)}
          disabled={scale >= maxScale}
          className="p-1.5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-40"
          title="Aumentar tamaño (Modo TV)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("bg-zinc-900/80 rounded-3xl border border-white/10 p-6 shadow-sm", className)}>
        {renderControls(false)}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 bg-zinc-900/50 hover:bg-zinc-800 text-[#FFB800] rounded-xl border border-zinc-800 backdrop-blur-md transition-colors",
          isOpen && "border-[#FFB800] bg-zinc-800",
          buttonClassName
        )}
        title="Regulador de Pantalla (TV / Monitores)"
      >
        <SlidersHorizontal className="w-3 h-3 mr-1" />
        <span className="text-[10px] font-mono font-bold uppercase">{percentage}%</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-zinc-950 rounded-3xl shadow-2xl border border-white/15 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {renderControls(true)}
        </div>
      )}
    </div>
  );
}
