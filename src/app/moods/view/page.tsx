'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { MOOD_CONFIG, type MoodCategory } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import { ChevronLeft, Dices, Shuffle, Play, CheckSquare, Square, ListPlus, List, LayoutGrid } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

function MoodDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { 
    songs, isSelectionMode, setSelectionMode, clearSelection, selectedIds, selectAll, 
    getCoverArtUrl, viewMode, setViewMode
  } = useLibrary();
  const { state: playerState, playRandomByMood, shuffleByMood, playQueue, setAccentColor } = usePlayer();
  const [mounted, setMounted] = useState(false);

  const moodParam = decodeURIComponent(searchParams.get('mood') || '') as MoodCategory;
  const config = MOOD_CONFIG[moodParam];
  const moodSongs = songs.filter((s) => s.mood === moodParam);

  // Dynamic Theme Suggestion (from first song in this mood)
  useEffect(() => {
    if (mounted && config && moodSongs.length > 0 && !playerState.currentSong) {
      const firstSong = moodSongs[0];
      getCoverArtUrl(firstSong.id).then(url => {
        if (!url) {
          const fallback = config.color || '#8b5cf6';
          setAccentColor(fallback);
          return;
        }
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = 50; canvas.height = 50;
          ctx.drawImage(img, 0, 0, 50, 50);
          
          const regions = [
            { x: 0, y: 0, w: 25, h: 25 }, { x: 25, y: 0, w: 25, h: 25 },
            { x: 0, y: 25, w: 25, h: 25 }, { x: 25, y: 25, w: 25, h: 25 },
            { x: 12, y: 12, w: 25, h: 25 }
          ];

          const colors = regions.map(reg => {
            const data = ctx.getImageData(reg.x, reg.y, reg.w, reg.h).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
              r += data[i]; g += data[i+1]; b += data[i+2]; count++;
            }
            return `#${Math.floor(r/count).toString(16).padStart(2, '0')}${Math.floor(g/count).toString(16).padStart(2, '0')}${Math.floor(b/count).toString(16).padStart(2, '0')}`;
          });

          setAccentColor({
            c1: colors[0], c2: colors[1], c3: colors[2], c4: colors[3], c5: colors[4]
          });
        };
      });
    }
  }, [mounted, moodSongs, playerState.currentSong, getCoverArtUrl, setAccentColor, config]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!config) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-text-muted">Mood not found</p>
        <button onClick={() => router.back()} className="mt-4 text-accent hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (moodSongs.length > 0) {
      playQueue(moodSongs, 0);
    }
  };

  const handleShuffleAll = () => {
    if (moodSongs.length > 0) {
      shuffleByMood(moodParam, songs);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Dynamic Background Mesh Gradient */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ease-in-out"
        style={{
          opacity: playerState.dynamicBackgroundEnabled ? 0.2 : 0,
          background: `
            radial-gradient(circle at var(--accent-pos-1-x) var(--accent-pos-1-y), var(--accent) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-2-x) var(--accent-pos-2-y), var(--accent-2) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-3-x) var(--accent-pos-3-y), var(--accent-3) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-4-x) var(--accent-pos-4-y), var(--accent-4) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-5-x) var(--accent-pos-5-y), var(--accent-5) 0%, transparent 50%)
          `
        }}
      />

      <div className="px-8 pt-8 pb-4 flex-shrink-0 relative z-10 border-b border-border/50">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Moods
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-4xl shadow-xl shadow-accent/20`}>
              {config.emoji}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">
                {config.label}
              </h1>
              <p className="text-text-secondary">
                {moodSongs.length} song{moodSongs.length !== 1 ? 's' : ''} in your library.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              disabled={moodSongs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-accent-foreground rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
            >
              <Play className="w-5 h-5 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleAll}
              disabled={moodSongs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-surface border border-border hover:bg-surface-hover disabled:opacity-50 disabled:hover:bg-surface text-text-primary rounded-full font-bold transition-all hover:scale-105 active:scale-95"
            >
              <Shuffle className="w-5 h-5" />
              Shuffle
            </button>
            <button
              onClick={() => playRandomByMood(moodParam, songs)}
              disabled={moodSongs.length === 0}
              className="p-3 bg-surface border border-border hover:bg-surface-hover disabled:opacity-50 text-text-primary rounded-full transition-all hover:scale-105 active:scale-95"
              title="Surprise me!"
            >
              <Dices className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Selection Mode Toggle */}
            {isSelectionMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectAll(moodSongs.map(s => s.id))}
                  className="p-2 text-text-muted hover:text-accent transition-colors"
                  title="Select All"
                >
                  <CheckSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={clearSelection}
                  className="p-2 text-accent transition-colors"
                  title="Clear Selection"
                >
                  <Square className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectionMode(false)}
                  className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium hover:bg-accent/20 transition-colors"
                >
                  Done
                </button>
                <span className="text-xs text-text-muted font-medium bg-surface px-3 py-1.5 rounded-full border border-border">
                  {selectedIds.size} selected
                </span>
              </div>
            ) : (
              <button
                onClick={() => setSelectionMode(true)}
                className="p-2 text-text-muted hover:text-accent transition-colors"
                title="Selection Mode"
              >
                <ListPlus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-full p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-background text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-background text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {moodSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <p className="text-lg">No songs in this mood yet.</p>
              <p className="text-sm">Songs will appear here after analysis.</p>
            </div>
          ) : viewMode === 'list' ? (
            <SongList songs={moodSongs} showMoodBadge={false} />
          ) : (
            <SongGrid songs={moodSongs} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoodDetailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>}>
      <MoodDetailContent />
    </Suspense>
  );
}
