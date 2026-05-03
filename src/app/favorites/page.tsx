'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import SearchBar from '@/components/ui/SearchBar';
import { Heart, Play, Shuffle, LayoutGrid, List, CheckSquare, Square, ListPlus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { MOOD_CONFIG } from '@/lib/types';

export default function FavoritesPage() {
  const { 
    filteredSongs, loading, isSelectionMode, setSelectionMode, clearSelection, 
    selectedIds, selectAll, getCoverArtUrl, searchQuery, viewMode, setViewMode
  } = useLibrary();
  const { playQueue, toggleShuffle, setAccentColor, state: playerState } = usePlayer();

  const favoriteSongs = useMemo(() => filteredSongs.filter((s) => s.favorite), [filteredSongs]);

  // Dynamic Theme Suggestion
  useEffect(() => {
    if (favoriteSongs.length > 0 && !playerState.currentSong) {
      const firstSong = favoriteSongs[0];
      getCoverArtUrl(firstSong.id).then(url => {
        if (!url) {
          const fallback = firstSong.mood ? MOOD_CONFIG[firstSong.mood].color : '#8b5cf6';
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
  }, [favoriteSongs, playerState.currentSong, getCoverArtUrl, setAccentColor]);

  const handlePlayAll = () => {
    if (favoriteSongs.length > 0) {
      playQueue(favoriteSongs, 0);
    }
  };

  const handleShuffleAll = () => {
    if (favoriteSongs.length > 0) {
      toggleShuffle();
      const { shuffleArray } = require('@/lib/utils');
      playQueue(shuffleArray([...favoriteSongs]), 0);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-text-primary mb-6 flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-current" />
          Favorites
        </h1>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              disabled={favoriteSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-accent-foreground rounded-full font-medium transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleAll}
              disabled={favoriteSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover disabled:opacity-50 disabled:hover:bg-surface text-text-primary rounded-full font-medium transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle All
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <SearchBar />
            
            {/* Selection Mode Toggle */}
            <div className="flex items-center gap-2 border-l border-border pl-3">
              {isSelectionMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectAll(favoriteSongs.map(s => s.id))}
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
      </div>

      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {favoriteSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <Heart className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg">No favorite songs yet.</p>
              <p className="text-sm">Click the heart icon on any song to add it here!</p>
            </div>
          ) : viewMode === 'list' ? (
            <SongList songs={favoriteSongs} />
          ) : (
            <SongGrid songs={favoriteSongs} />
          )}
        </div>
      </div>
    </div>
  );
}
