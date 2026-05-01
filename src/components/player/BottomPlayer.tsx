'use client';
// ============================================================
// Star Player — Bottom Player Bar
// ============================================================
import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { formatTime } from '@/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  ChevronUp,
  Music2,
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

import Equalizer from './Equalizer';

export default function BottomPlayer() {
  const { state, togglePlay, next, prev, seek, setVolume, toggleMute, cycleRepeat, toggleShuffle, setFullPlayer } =
    usePlayer();
  const { getCoverArtUrl } = useLibrary();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  const { currentSong, isPlaying, currentTime, duration, volume, isMuted, repeatMode, isShuffled } = state;

  useEffect(() => {
    if (currentSong) {
      getCoverArtUrl(currentSong.id).then(setCoverUrl);
    } else {
      setCoverUrl(null);
    }
  }, [currentSong, getCoverArtUrl]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  // Seek bar drag handlers
  const seekFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!seekBarRef.current || !duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  }, [duration, seek]);

  const handleSeekMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSeeking(true);
    seekFromEvent(e);

    const handleMouseMove = (ev: MouseEvent) => seekFromEvent(ev);
    const handleMouseUp = (ev: MouseEvent) => {
      seekFromEvent(ev);
      setIsSeeking(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [seekFromEvent]);

  return (
    <div className="relative glass-strong border-t border-border/50">
      {/* Equalizer Popover */}
      <div 
        className={`absolute bottom-full right-4 mb-4 z-50 origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isEqOpen 
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
            : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
        }`}
      >
        <Equalizer onClose={() => setIsEqOpen(false)} />
      </div>

      {/* Progress bar (top of bottom player) — supports click & drag */}
      <div
        ref={seekBarRef}
        className="relative h-1.5 bg-border/30 cursor-pointer group hover:h-2.5 transition-all"
        onMouseDown={handleSeekMouseDown}
      >
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r from-accent via-purple-400 to-pink-500 ${isSeeking ? '' : 'transition-[width] duration-100'}`}
          style={{ width: `${progress}%` }}
        />
        {/* Glow at the tip */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent shadow-[0_0_12px_rgba(139,92,246,0.8)] transition-opacity ${isSeeking ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>

      <div className="flex items-center h-[72px] px-4 gap-4">
        {/* Song info */}
        <div className="flex items-center gap-3 w-[280px] min-w-0">
          <div
            className="w-12 h-12 rounded-lg bg-surface flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer group/cover relative shadow-lg"
            onClick={() => setFullPlayer(true)}
          >
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover/cover:scale-110 transition-transform duration-300" />
            ) : (
              <Music2 className="w-5 h-5 text-text-muted" />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
              <ChevronUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {currentSong?.title || 'No song playing'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {currentSong?.artist || '—'}
            </p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isShuffled ? 'text-accent drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]' : 'text-text-muted hover:text-text-primary'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={prev}
              className="p-2 text-text-secondary hover:text-text-primary hover:scale-110 transition-all duration-150"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-gradient-to-br from-accent to-purple-600 hover:from-accent-hover hover:to-purple-500 text-white shadow-[0_0_24px_rgba(139,92,246,0.5)] hover:shadow-[0_0_36px_rgba(139,92,246,0.7)] transition-all duration-200 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="p-2 text-text-secondary hover:text-text-primary hover:scale-110 transition-all duration-150"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              onClick={cycleRepeat}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                repeatMode !== 'off' ? 'text-accent drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]' : 'text-text-muted hover:text-text-primary'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <RepeatIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-muted font-medium tabular-nums">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <span className="text-text-muted/40">/</span>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume + eq + expand */}
        <div className="flex items-center gap-3 w-[240px] justify-end">
          <button
            onClick={() => setIsEqOpen(!isEqOpen)}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              isEqOpen ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface'
            }`}
            title="Equalizer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/></svg>
          </button>
          
          <button onClick={toggleMute} className="text-text-muted hover:text-text-primary transition-colors">
            <VolumeIcon className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20"
          />
          <button
            onClick={() => setFullPlayer(true)}
            className="p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all duration-200"
            title="Expand player"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
