'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Music2, RefreshCw } from 'lucide-react';
import type { LyricSegment } from '@/lib/types';

interface LyricsViewProps {
  songId?: string;
  songTitle?: string;
  songArtist?: string;
  lyrics?: LyricSegment[];
  currentTime: number;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function LyricsView({
  songId,
  songTitle,
  songArtist,
  lyrics,
  currentTime,
  onGenerate,
  isGenerating,
}: LyricsViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);
  const [hasLyrics, setHasLyrics] = useState(!!lyrics?.length);

  useEffect(() => {
    setHasLyrics(!!lyrics?.length);
  }, [lyrics]);

  // Find active line index
  const activeIndex = lyrics
    ? lyrics.findIndex((line, i) => {
        const nextLine = lyrics[i + 1];
        if (nextLine) return currentTime >= line.start && currentTime < nextLine.start;
        return currentTime >= line.start;
      })
    : -1;

  // Auto-scroll active line smoothly via CSS translate
  useEffect(() => {
    if (activeLineRef.current && scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      const lineOffsetTop = activeLineRef.current.offsetTop;
      const lineHeight = activeLineRef.current.clientHeight;
      
      const targetY = (containerHeight / 2) - lineOffsetTop - (lineHeight / 2);
      setTranslateY(targetY);
    } else if (activeIndex === -1 && scrollRef.current) {
      const containerHeight = scrollRef.current.clientHeight;
      setTranslateY(containerHeight / 3); // Start slightly down before first line
    }
  }, [activeIndex]);

  if (!songId) return null;

  // Empty state — no lyrics yet
  if (!hasLyrics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        {/* Icon pulse ring */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <Music2 className="w-10 h-10 text-accent/60" />
          </div>
          {isGenerating && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping" />
              <div className="absolute inset-[-8px] rounded-full border border-accent/10 animate-ping [animation-delay:0.4s]" />
            </>
          )}
        </div>

        {isGenerating ? (
          <>
            <div className="space-y-2">
              <p className="text-lg font-bold text-text-primary">Searching for lyrics…</p>
              <p className="text-sm text-text-muted">
                Looking up&nbsp;
                <span className="text-accent font-medium">{songTitle}</span>
                {songArtist && (
                  <> by <span className="text-accent font-medium">{songArtist}</span></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 text-text-muted text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Powered by LRCLIB
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xl font-bold">No Lyrics Yet</p>
              <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
                Fetch synchronized lyrics from the lyrics database — free and instant.
              </p>
            </div>

            <button
              onClick={onGenerate}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                boxShadow: '0 0 40px rgba(139,92,246,0.4)',
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="text-lg">✨</span>
              <span>Get Lyrics</span>
            </button>

            <p className="text-xs text-text-muted/50">
              Works best with English song titles
            </p>
          </>
        )}
      </div>
    );
  }

  // Lyrics display
  return (
    <div className="flex-1 flex flex-col w-full relative overflow-hidden">
      {/* Refresh button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="absolute top-3 right-4 z-20 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all disabled:opacity-30 pointer-events-auto"
        title="Refresh lyrics"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
      </button>

      <div
        ref={scrollRef}
        className="flex-1 overflow-hidden pointer-events-none select-none relative"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
        }}
      >
        <div 
          className="relative flex flex-col items-center text-center gap-8 px-6 transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `translateY(${translateY}px)` }}
        >
          {lyrics!.map((line, i) => {
            const isActive = i === activeIndex;

            return (
              <div
                key={i}
                ref={isActive ? activeLineRef : null}
                className="transition-all duration-700 ease-out will-change-transform"
                style={{
                  fontSize: '2.25rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.2)',
                  lineHeight: 1.4,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
