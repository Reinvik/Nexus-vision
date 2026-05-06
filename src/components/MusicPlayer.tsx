import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, ListMusic } from 'lucide-react';

const TRACKS = [
  { name: 'Apex Shift', file: '/Apex_Shift.mp3' },
  { name: 'Calculated Calm', file: '/Calculated_Calm.mp3' },
  { name: 'Glass Alignment', file: '/Glass_Alignment.mp3' },
  { name: 'Precision Interval', file: '/Precision_Interval.mp3' },
];

export function MusicPlayer({ isMutedBySystem = false }: { isMutedBySystem?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [wasPlayingBeforeMute, setWasPlayingBeforeMute] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isMutedBySystem) {
        if (isPlaying) {
          setWasPlayingBeforeMute(true);
          audioRef.current.pause();
          setIsPlaying(false);
        }
      } else {
        if (wasPlayingBeforeMute) {
          audioRef.current.play().catch(e => console.error("Resume failed", e));
          setIsPlaying(true);
          setWasPlayingBeforeMute(false);
        }
      }
    }
  }, [isMutedBySystem]);

  useEffect(() => {
    if (isPlaying && audioRef.current && !isMutedBySystem) {
      audioRef.current.play().catch(e => console.error("Auto-play failed", e));
    }
  }, [currentTrackIndex]);

  return (
    <div className="relative flex items-center gap-3 pointer-events-auto">
      <audio
        ref={audioRef}
        src={currentTrack.file}
        onEnded={nextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Main Control Button */}
      <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className={`p-2 rounded-xl transition-colors ${showPlaylist ? 'bg-[#FFB800] text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
          <ListMusic size={18} />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <button onClick={prevTrack} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <SkipBack size={18} />
        </button>

        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center bg-[#FFB800] text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,184,0,0.3)]"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        <button onClick={nextTrack} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <SkipForward size={18} />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <div className="flex items-center gap-2 px-2 group">
          <Volume2 size={16} className="text-zinc-500 group-hover:text-[#FFB800] transition-colors" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FFB800]"
          />
        </div>
      </div>

      {/* Mini Status Display */}
      <div className="hidden lg:flex flex-col">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] leading-none mb-1">
          {isPlaying ? 'Reproduciendo' : 'En Pausa'}
        </p>
        <p className="text-xs text-white font-bold tracking-tight truncate max-w-[120px]">
          {currentTrack.name}
        </p>
      </div>

      {/* Playlist Dropdown */}
      <AnimatePresence>
        {showPlaylist && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-6 w-72 bg-zinc-900/98 backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] z-[200]"
          >
            <div className="p-4 border-b border-white/5 bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Playlist Roma Center</p>
            </div>
            <div className="p-2 space-y-1">
              {TRACKS.map((track, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentTrackIndex(i);
                    setIsPlaying(true);
                    setShowPlaylist(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    i === currentTrackIndex ? 'bg-[#FFB800]/10 text-[#FFB800]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Music size={14} className={i === currentTrackIndex ? 'text-[#FFB800]' : 'text-zinc-600'} />
                  <span className="text-sm font-bold tracking-tight">{track.name}</span>
                  {i === currentTrackIndex && isPlaying && (
                    <div className="ml-auto flex gap-0.5 items-end h-3">
                      <motion.div animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-[#FFB800]" />
                      <motion.div animate={{ height: [8, 4, 10] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-[#FFB800]" />
                      <motion.div animate={{ height: [6, 10, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-[#FFB800]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
