'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import { Heart, Play, Shuffle, LayoutGrid, List, CheckSquare, Square, ListPlus, Search, X } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { MOOD_CONFIG } from '@/lib/types';

export default function FavoritesPage() {
  const { 
    filteredSongs, loading, isSelectionMode, setSelectionMode, clearSelection, 
    selectedIds, selectAll, getCoverArtUrl, viewMode, setViewMode, reorderFavoriteSongs
  } = useLibrary();
  const { playQueue, setAccentColor, state: playerState } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');

  const favoriteSongs = useMemo(() => filteredSongs.filter((s) => s.favorite), [filteredSongs]);

  const filteredFavoriteSongs = useMemo(() => {
    if (!searchQuery.trim()) return favoriteSongs;
    const query = searchQuery.toLowerCase();
    return favoriteSongs.filter(song => 
      song.title.toLowerCase().includes(query) || 
      song.artist.toLowerCase().includes(query) ||
      song.album?.toLowerCase().includes(query)
    );
  }, [favoriteSongs, searchQuery]);

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

  // Auto-exit selection mode if filtered favorites become empty
  useEffect(() => {
    if (isSelectionMode && filteredFavoriteSongs.length === 0) {
      setSelectionMode(false);
      clearSelection();
    }
  }, [filteredFavoriteSongs.length, isSelectionMode, setSelectionMode, clearSelection]);

  const handlePlayAll = () => {
    if (filteredFavoriteSongs.length > 0) {
      playQueue(filteredFavoriteSongs, 0);
    }
  };

  const handleShuffleAll = () => {
    if (filteredFavoriteSongs.length > 0) {
      const { shuffleArray } = require('@/lib/utils');
      playQueue(shuffleArray([...filteredFavoriteSongs]), 0);
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

      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex-shrink-0 relative z-10">
        {/* Hero Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-1 md:mb-2 leading-tight flex items-center gap-3">
            <Heart className="w-7 h-7 md:w-8 md:h-8 text-red-500 fill-current" />
            Favorites
          </h1>
          <p className="text-sm md:text-base text-text-secondary">
            {filteredFavoriteSongs.length} song{filteredFavoriteSongs.length !== 1 ? 's' : ''} you love
          </p>

          {/* Primary Actions */}
          <div className="flex items-center gap-2.5 mt-4">
            <button
              onClick={handlePlayAll}
              disabled={filteredFavoriteSongs.length === 0}
              className="flex items-center gap-2 px-5 md:px-7 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-accent-foreground rounded-full font-bold transition-all disabled:opacity-50 active:scale-95 text-sm md:text-base"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleAll}
              disabled={filteredFavoriteSongs.length === 0}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors disabled:opacity-50 text-sm md:text-base"
            >
              <Shuffle className="w-4 h-4 md:w-5 md:h-5" />
              Shuffle
            </button>
          </div>
        </div>

        {/* Secondary Toolbar */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 pt-3 border-t border-border/50">
          <div className="w-full md:w-64 order-first md:order-none">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-border rounded-full bg-surface/50 text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent text-sm transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <X className="h-4 w-4 text-text-muted hover:text-text-primary transition-colors" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (isSelectionMode) clearSelection();
              setSelectionMode(!isSelectionMode);
            }}
            disabled={filteredFavoriteSongs.length === 0}
            className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full font-medium transition-all text-xs md:text-sm ${
              isSelectionMode 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-surface border border-border hover:bg-surface-hover text-text-primary'
            }`}
          >
            {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Select
          </button>

          {isSelectionMode && (
            <div className="flex items-center gap-2 animate-fade-in">
              <button
                onClick={() => {
                  const allIds = filteredFavoriteSongs.map(s => s.id);
                  if (selectedIds.size === allIds.length) clearSelection();
                  else selectAll(allIds);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full text-xs font-medium transition-all"
              >
                <ListPlus className="w-3.5 h-3.5" />
                {selectedIds.size === filteredFavoriteSongs.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-text-muted font-medium bg-surface px-3 py-2 rounded-full border border-border">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-full p-1 ml-auto">
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

      <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
        <div className="bg-surface/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden min-h-[400px]">
          {filteredFavoriteSongs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-text-muted text-center animate-fade-in">
              <Heart className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-text-primary">No favorite songs yet.</p>
              <p className="text-sm mt-2 opacity-60">Click the heart icon on any song to add it here!</p>
            </div>
          ) : viewMode === 'list' ? (
            <SongList 
              songs={filteredFavoriteSongs} 
              onReorder={!searchQuery ? reorderFavoriteSongs : undefined}
            />
          ) : (
            <SongGrid 
              songs={filteredFavoriteSongs} 
              onReorder={!searchQuery ? reorderFavoriteSongs : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
