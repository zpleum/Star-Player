'use client';
// ============================================================
// Star Player — Bottom Player Bar (Desktop + Mobile Responsive)
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
  Heart,
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

import Equalizer from './Equalizer';

// Helper component for scrolling long text
function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      setTimeout(() => {
        if (containerRef.current && textRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          const textWidth = textRef.current.scrollWidth;
          if (textWidth > containerWidth) {
            setShouldAnimate(true);
            setScrollX(containerWidth - textWidth - 40); // 40px buffer
          } else {
            setShouldAnimate(false);
          }
        }
      }, 100);
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className={`marquee-container w-full overflow-hidden ${className?.includes('text-center') ? 'text-center' : ''}`}
    >
      <span
        ref={textRef}
        className={`${className} ${shouldAnimate ? 'animate-marquee' : ''}`}
        style={{
          display: 'inline-block',
          width: 'max-content',
          ...(shouldAnimate ? {
            '--marquee-end-x': `${scrollX}px`, 
            '--marquee-duration': `${Math.max(8, Math.abs(scrollX) / 30)}s`,
          } : {})
        } as React.CSSProperties}
      >
        {text}
      </span>
    </div>
  );
}

export default function BottomPlayer() {
  const { state, togglePlay, next, prev, seek, setVolume, toggleMute, cycleRepeat, toggleShuffle, setFullPlayer } =
    usePlayer();
  const { songs, toggleFavorite, getCoverArtUrl } = useLibrary();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const desktopSeekBarRef = useRef<HTMLDivElement>(null);
  const mobileSeekBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  const { currentSong, isPlaying, currentTime, duration, volume, isMuted, repeatMode, isShuffled } = state;

  const currentSongFromLibrary = songs.find(s => s.id === currentSong?.id);
  const isFavorite = currentSongFromLibrary?.favorite || false;

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

  // Helper to get clientX for both mouse and touch events
  const getEventClientX = useCallback((e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) return e.touches[0].clientX;
    if ('changedTouches' in e && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
    return (e as MouseEvent).clientX;
  }, []);

  // Seek bar drag handlers
  const seekFromEvent = useCallback((e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent, element: HTMLDivElement | null) => {
    if (!element || !duration) return;
    const rect = element.getBoundingClientRect();
    const clientX = getEventClientX(e);
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seek(pct * duration);
  }, [duration, seek, getEventClientX]);

  const handleSeekMouseDown = useCallback((e: React.MouseEvent, type: 'desktop' | 'mobile') => {
    const element = type === 'desktop' ? desktopSeekBarRef.current : mobileSeekBarRef.current;
    setIsSeeking(true);
    seekFromEvent(e, element);

    const handleMouseMove = (ev: MouseEvent) => seekFromEvent(ev, element);
    const handleMouseUp = (ev: MouseEvent) => {
      seekFromEvent(ev, element);
      setIsSeeking(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [seekFromEvent]);

  // Touch seek for mobile
  const handleSeekTouchStart = useCallback((e: React.TouchEvent, type: 'desktop' | 'mobile') => {
    const element = type === 'desktop' ? desktopSeekBarRef.current : mobileSeekBarRef.current;
    setIsSeeking(true);
    seekFromEvent(e, element);

    const handleTouchMove = (ev: TouchEvent) => { 
      // Prevent scrolling while seeking
      if (ev.cancelable) ev.preventDefault(); 
      seekFromEvent(ev, element); 
    };
    const handleTouchEnd = (ev: TouchEvent) => {
      seekFromEvent(ev, element);
      setIsSeeking(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [seekFromEvent]);

  return (
    // For mobile: The wrapper itself needs a transparent bottom margin to sit above the tab bar
    // but the actual player will be a floating pill inside it.
    <div className="relative z-50 glass-strong border-t border-border/50 md:border-t bg-transparent md:bg-surface/80 border-none md:border-solid">
      {/* Equalizer Popover (desktop only) */}
      <div 
        className={`absolute bottom-full right-4 mb-4 z-50 origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hidden md:block ${
          isEqOpen 
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
            : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
        }`}
      >
        <Equalizer onClose={() => setIsEqOpen(false)} />
      </div>

      {/* Progress bar — supports click, drag, and touch */}
      <div
        ref={desktopSeekBarRef}
        className="relative h-1.5 bg-border/30 cursor-pointer group hover:h-2.5 transition-all hidden md:block"
        onMouseDown={(e) => handleSeekMouseDown(e, 'desktop')}
        onTouchStart={(e) => handleSeekTouchStart(e, 'desktop')}
      >
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/60 ${isSeeking ? '' : 'transition-[width] duration-100'}`}
          style={{ width: `${progress}%` }}
        />
        {/* Glow at the tip */}
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full bg-accent opacity-100 shadow-md pointer-events-none"
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>

      {/* ═══════ Desktop Layout ═══════ */}
      <div className="hidden md:flex items-center h-[72px] px-4 gap-4">
        {/* Song info */}
        <div className="flex items-center gap-3 w-[280px] min-w-0">
          <div
            className="w-12 h-12 rounded-lg bg-surface flex-shrink-0 overflow-hidden flex items-center justify-center cursor-pointer group/cover relative"
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
          <div className="min-w-0 flex-1">
            <MarqueeText 
              text={currentSong?.title || 'No song playing'} 
              className="text-sm font-semibold text-text-primary block" 
            />
            <MarqueeText 
              text={currentSong?.artist || '—'} 
              className="text-xs text-text-muted block" 
            />
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isShuffled ? 'text-accent' : 'text-text-muted hover:text-text-primary'
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
              className="p-3 rounded-full bg-accent hover:bg-accent-hover text-white transition-all duration-200 active:scale-95"
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
                repeatMode !== 'off' ? 'text-accent' : 'text-text-muted hover:text-text-primary'
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
        <div className="flex items-center gap-3 w-[280px] justify-end">
          {currentSong && (
            <button
              onClick={() => toggleFavorite(currentSong.id)}
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                isFavorite 
                  ? 'text-pink-500' 
                  : 'text-text-muted hover:text-text-primary hover:bg-surface'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}

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

      {/* ═══════ Mobile Layout (Apple Music Style) ═══════ */}
      <div className="md:hidden fixed bottom-[calc(50px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[70] border-t border-white/[0.05] bg-[#1c1c1e]/90 backdrop-blur-[40px] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {/* Mobile Seek Bar — Top of the pill with larger touch target */}
        <div
          ref={mobileSeekBarRef}
          className="relative h-4 -mt-2 flex items-end cursor-pointer group z-20"
          onMouseDown={(e) => handleSeekMouseDown(e, 'mobile')}
          onTouchStart={(e) => handleSeekTouchStart(e, 'mobile')}
        >
          <div className="w-full h-1 bg-white/10 relative">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/60 ${isSeeking ? '' : 'transition-[width] duration-100'}`}
              style={{ width: `${progress}%` }}
            />
            {/* Thumb for mobile seek */}
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full bg-accent opacity-100 shadow-md pointer-events-none"
              style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
            />
          </div>
        </div>

        <div 
          className="flex items-center h-[60px] px-4 gap-3 cursor-pointer overflow-hidden relative active:bg-white/5 transition-colors"
          onClick={() => setFullPlayer(true)}
        >
          {/* Cover Art - Larger and more rounded */}
          <div className="w-11 h-11 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-[0_4px_12px_rgb(0,0,0,0.4)] z-10 relative">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music2 className="w-6 h-6 text-[#8e8e93]" />
            )}
          </div>

          {/* Song Info - Aligned left */}
          <div className="min-w-0 flex-1 z-10 flex flex-col justify-center">
            <MarqueeText 
              text={currentSong?.title || 'Not Playing'} 
              className="text-[15px] font-medium text-white leading-tight block" 
            />
            {currentSong?.artist && (
              <MarqueeText 
                text={currentSong.artist} 
                className="text-[12px] text-[#8e8e93] leading-tight mt-0.5 block" 
              />
            )}
          </div>

          {/* Minimal Controls - Simple white icons */}
          <div className="flex items-center gap-1 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="p-2.5 text-white active:opacity-50 active:scale-95 transition-all"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="p-2.5 text-white active:opacity-50 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="p-2.5 pr-0 text-white active:opacity-50 active:scale-95 transition-all"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
