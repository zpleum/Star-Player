'use client';
// ============================================================
// Star Player — Full Screen Player
// ============================================================
import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { formatTime } from '@/lib/utils';
import { MOOD_CONFIG } from '@/lib/types';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1,
  Repeat, Repeat1, Shuffle, ChevronDown, Music2, Heart, AlignLeft, Loader2
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

import Equalizer from './Equalizer';
import SongAnalysisDetail from '../mood/SongAnalysisDetail';
import Visualizer from './Visualizer';
import LyricsView from './LyricsView';

import * as db from '@/lib/db';
import type { LyricSegment } from '@/lib/types';

export default function FullPlayer() {
  const { state, togglePlay, next, prev, seek, setVolume, toggleMute, cycleRepeat, toggleShuffle, setFullPlayer } = usePlayer();
  const { getCoverArtUrl, toggleFavorite, songs, generateLyrics } = useLibrary();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [currentLyrics, setCurrentLyrics] = useState<LyricSegment[] | undefined>(undefined);
  const { analyserRef } = usePlayer();
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [dominantColors, setDominantColors] = useState<string[]>([]);

  const { currentSong, isPlaying, currentTime, duration, volume, isMuted, repeatMode, isShuffled, isFullPlayerOpen } = state;

  // Get current song from full list to check favorite status
  const currentSongFull = songs.find(s => s.id === currentSong?.id);

  // Load lyrics from DB whenever the song changes or lyrics are generated
  useEffect(() => {
    if (!currentSong?.id) {
      setCurrentLyrics(undefined);
      return;
    }
    db.getSong(currentSong.id).then(song => {
      setCurrentLyrics(song?.lyrics);
    });
  }, [currentSong?.id, currentSongFull?.hasLyrics]);

  useEffect(() => {
    if (currentSong) {
      getCoverArtUrl(currentSong.id).then(setCoverUrl);
    }
  }, [currentSong, getCoverArtUrl]);

  // Extract dominant colors from cover art
  useEffect(() => {
    if (!coverUrl) {
      setDominantColors([]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Sample at a small size for speed
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imageData = ctx.getImageData(0, 0, 64, 64).data;

        // Collect color buckets from different regions
        const regions = [
          { x: 0, y: 0, w: 32, h: 32 },   // top-left
          { x: 32, y: 0, w: 32, h: 32 },   // top-right
          { x: 0, y: 32, w: 32, h: 32 },   // bottom-left
          { x: 32, y: 32, w: 32, h: 32 },  // bottom-right
          { x: 16, y: 16, w: 32, h: 32 },  // center
        ];

        const colors = regions.map(region => {
          let r = 0, g = 0, b = 0, count = 0;
          for (let y = region.y; y < region.y + region.h; y++) {
            for (let x = region.x; x < region.x + region.w; x++) {
              const i = (y * 64 + x) * 4;
              const pr = imageData[i], pg = imageData[i + 1], pb = imageData[i + 2];
              // Skip very dark and very bright pixels
              const brightness = (pr + pg + pb) / 3;
              if (brightness > 30 && brightness < 220) {
                r += pr; g += pg; b += pb; count++;
              }
            }
          }
          if (count === 0) return 'rgba(139,92,246,0.6)';
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          return `rgba(${r},${g},${b},0.5)`;
        });

        setDominantColors(colors);
      } catch {
        setDominantColors([]);
      }
    };
    img.src = coverUrl;
  }, [coverUrl]);

  const handleGenerateLyrics = async () => {
    if (!currentSong) return;
    setIsGeneratingLyrics(true);
    try {
      await generateLyrics(currentSong.id);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  if (!isFullPlayerOpen) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const moodConfig = currentSongFull?.mood ? MOOD_CONFIG[currentSongFull.mood] : null;

  // Build dynamic gradient from dominant colors
  const bgGradient = dominantColors.length >= 3
    ? `radial-gradient(ellipse at 20% 0%, ${dominantColors[0]} 0%, transparent 70%), radial-gradient(ellipse at 80% 0%, ${dominantColors[1]} 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, ${dominantColors[2]} 0%, transparent 70%)`
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up overflow-hidden">
      {/* Dynamic gradient background from cover art colors */}
      {bgGradient && (
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{ background: bgGradient }}
        />
      )}
      
      {/* Blurred album art background */}
      {coverUrl && (
        <div className="absolute inset-0">
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: 'blur(60px)', opacity: 0.5 }} />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
        </div>
      )}
      {bgGradient && (
        <div className="absolute inset-0 transition-all duration-1000" style={{ background: bgGradient, opacity: 0.4 }} />
      )}

      {/* Blurred cover fallback */}
      {coverUrl && !bgGradient && (
        <div className="absolute inset-0 overflow-hidden">
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-15 scale-150" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        </div>
      )}

      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      {/* Equalizer Sidebar */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-full md:w-[420px] bg-background/60 backdrop-blur-3xl border-l border-white/5 z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col p-6 ${
          isEqOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Equalizer variant="sidebar" onClose={() => setIsEqOpen(false)} />
      </div>

      {/* Analysis Detail Modal */}
      {isAnalysisOpen && currentSong && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <SongAnalysisDetail songId={currentSong.id} onClose={() => setIsAnalysisOpen(false)} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center justify-center px-6 py-4 z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => setFullPlayer(false)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface/50 rounded-lg transition-all" title="Close Full Player">
            <ChevronDown className="w-5 h-5" />
          </button>
          <p className="text-xs font-bold text-text-muted/60 uppercase tracking-[0.2em]">
            {isLyricsOpen ? 'Lyrics' : 'Now Playing'}
          </p>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className={`flex-1 flex flex-col w-full px-6 relative z-10 pb-8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isEqOpen ? 'md:-translate-x-[210px]' : ''}`}>
        
        {/* Top Split Area */}
        <div className={`flex-1 flex ${isLyricsOpen ? 'flex-col md:flex-row max-w-7xl items-center' : 'flex-col justify-center max-w-3xl items-center'} w-full mx-auto gap-8 md:gap-16 transition-all duration-500 min-h-0`}>
          
          {/* Left Side: Original Player UI */}
          <div className={`flex flex-col items-center justify-center gap-6 transition-all duration-500 ${isLyricsOpen ? 'w-full md:w-1/2 flex-shrink-0' : 'w-full'}`}>
            <div className="relative group">
              <div className={`transition-all duration-500 ${isLyricsOpen ? 'w-64 h-64 md:w-80 md:h-80' : 'w-72 h-72 md:w-80 md:h-80'} rounded-3xl overflow-hidden ring-1 ring-white/5`}>
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center">
                    <Music2 className="w-20 h-20 text-text-muted/30" />
                  </div>
                )}
              </div>
              {/* Glow under album art */}
              {coverUrl && (
                <div className="absolute -bottom-6 left-8 right-8 h-16 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
              )}
            </div>

            {/* Song info */}
            <div className="text-center max-w-md">
              <h2 className={`font-bold text-text-primary truncate transition-all duration-500 ${isLyricsOpen ? 'text-xl md:text-2xl' : 'text-2xl'}`}>{currentSong?.title || 'No song'}</h2>
              <p className={`text-text-secondary mt-1 transition-all duration-500 ${isLyricsOpen ? 'text-sm' : 'text-base'}`}>{currentSong?.artist || '—'}</p>
              <div className={`flex items-center justify-center gap-3 mt-3 transition-all duration-500 ${isLyricsOpen ? 'scale-90 opacity-80' : 'scale-100 opacity-100'}`}>
                {currentSongFull?.bpm && (
                  <button 
                    onClick={() => setIsAnalysisOpen(true)}
                    className="text-xs px-3 py-1 rounded-full bg-surface/80 border border-border/50 hover:bg-accent/20 text-text-muted hover:text-accent transition-all cursor-pointer"
                    title="View Audio Analysis"
                  >
                    {Math.round(currentSongFull.bpm)} BPM
                  </button>
                )}
                {moodConfig && (
                  <button 
                    onClick={() => setIsAnalysisOpen(true)}
                    className="text-xs px-3 py-1 rounded-full border hover:bg-accent/20 text-text-muted hover:text-accent transition-all cursor-pointer"
                    style={{ 
                      borderColor: `${moodConfig.color}30`,
                      background: `${moodConfig.color}10`
                    }}
                    title="View Audio Analysis"
                  >
                    {moodConfig.emoji} {currentSongFull?.mood}
                  </button>
                )}
              </div>
            </div>

            {/* Visualizer */}
            <div className={`w-full max-w-lg transition-all duration-500 ${isLyricsOpen ? 'h-10 opacity-40 scale-y-75' : 'h-20 opacity-70'}`}>
              <Visualizer analyser={analyserRef.current} isPlaying={isPlaying} className="w-full h-full" />
            </div>

            {/* Controls (Grouped with Song Info) */}
            <div className="w-full mx-auto flex flex-col items-center gap-6 mt-4 flex-shrink-0">
              {/* Progress bar — always visible */}
              <div className="w-full max-w-lg mt-auto">
                <div
                  ref={seekBarRef}
                  className="relative h-2 bg-white/10 rounded-full cursor-pointer group hover:h-3 transition-all"
                  onMouseDown={(e) => {
                    if (!duration) return;
                    setIsSeeking(true);
                    const doSeek = (ev: MouseEvent | React.MouseEvent) => {
                      if (!seekBarRef.current) return;
                      const rect = seekBarRef.current.getBoundingClientRect();
                      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                      seek(pct * duration);
                    };
                    doSeek(e);
                    const onMove = (ev: MouseEvent) => doSeek(ev);
                    const onUp = (ev: MouseEvent) => {
                      doSeek(ev);
                      setIsSeeking(false);
                      document.removeEventListener('mousemove', onMove);
                      document.removeEventListener('mouseup', onUp);
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                >
                  {/* Filled track */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r from-accent via-accent-2 to-accent-3 rounded-full ${isSeeking ? '' : 'transition-[width] duration-100'}`}
                    style={{ width: `${progress}%` }}
                  />
                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 w-4 h-4 rounded-full bg-white opacity-100"
                    style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-text-muted font-medium tabular-nums mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleShuffle}
                  className={`p-2 rounded-xl transition-all duration-200 ${isShuffled ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={prev} className="p-3 text-text-secondary hover:text-text-primary hover:scale-110 transition-all duration-150">
                  <SkipBack className="w-7 h-7" />
                </button>
                <button
                  onClick={togglePlay}
                  className="p-5 rounded-full bg-accent hover:bg-accent-hover text-white transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                </button>
                <button onClick={next} className="p-3 text-text-secondary hover:text-text-primary hover:scale-110 transition-all duration-150">
                  <SkipForward className="w-7 h-7" />
                </button>
                <button
                  onClick={cycleRepeat}
                  className={`p-2 rounded-xl transition-all duration-200 ${repeatMode !== 'off' ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <RepeatIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom controls */}
              <div className="flex items-center gap-4 pb-2">
                <button 
                  onClick={() => setIsLyricsOpen(!isLyricsOpen)} 
                  className={`p-2 rounded-xl transition-all duration-200 ${isLyricsOpen ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface/50'}`}
                  title="Toggle Lyrics"
                >
                  <AlignLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEqOpen(!isEqOpen)}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isEqOpen ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
                  }`}
                  title="Equalizer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/></svg>
                </button>
                <button
                  onClick={() => currentSong && toggleFavorite(currentSong.id)}
                  className={`p-2 rounded-xl transition-all duration-200 ${currentSongFull?.favorite ? 'text-pink-500 bg-pink-500/10' : 'text-text-muted hover:text-text-primary hover:bg-surface/50'}`}
                >
                  <Heart className={`w-5 h-5 ${currentSongFull?.favorite ? 'fill-current' : ''}`} />
                </button>
                <button onClick={toggleMute} className="text-text-muted hover:text-text-primary transition-colors">
                  <VolumeIcon className="w-5 h-5" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-28"
                />
              </div>
            </div>
          </div>

          {/* Right Side: Lyrics */}
          {isLyricsOpen && (
            <div className="w-full md:w-1/2 flex-1 flex flex-col h-[75vh] max-h-[800px] overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
              <LyricsView
                songId={currentSong?.id}
                songTitle={currentSong?.title}
                songArtist={currentSong?.artist}
                lyrics={currentLyrics}
                currentTime={currentTime}
                onGenerate={handleGenerateLyrics}
                isGenerating={isGeneratingLyrics}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

