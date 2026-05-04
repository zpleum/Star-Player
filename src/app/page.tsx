'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import ImportSongs from '@/components/library/ImportSongs';
import SearchBar from '@/components/ui/SearchBar';
import { Play, Shuffle, LayoutGrid, List, CheckSquare, Square, ListPlus } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const { 
    filteredSongs, songs, loading, reorderLibrarySongs, searchQuery, moodFilter,
    isSelectionMode, setSelectionMode, clearSelection, selectedIds, selectAll,
    getCoverArtUrl, viewMode, setViewMode
  } = useLibrary();
  const { playQueue, toggleShuffle, setAccentColor, state: playerState } = usePlayer();

  // Dynamic Theme Suggestion
  useEffect(() => {
    if (filteredSongs.length > 0 && !playerState.currentSong) {
      const firstSong = filteredSongs[0];
      getCoverArtUrl(firstSong.id).then(url => {
        if (!url) {
          const { MOOD_CONFIG } = require('@/lib/types');
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
  }, [filteredSongs, playerState.currentSong, getCoverArtUrl, setAccentColor]);


  // Auto-exit selection mode if filtered songs become empty
  useEffect(() => {
    if (isSelectionMode && filteredSongs.length === 0) {
      setSelectionMode(false);
      clearSelection();
    }
  }, [filteredSongs.length, isSelectionMode, setSelectionMode, clearSelection]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (filteredSongs.length > 0) {
      playQueue(filteredSongs, 0);
    }
  };

  const handleShuffleAll = () => {
    if (filteredSongs.length > 0) {
      toggleShuffle();
      const { shuffleArray } = require('@/lib/utils');
      playQueue(shuffleArray([...filteredSongs]), 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex-shrink-0 relative z-10">
        {/* Hero Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-1 md:mb-2 leading-tight">Library</h1>
          <p className="text-sm md:text-base text-text-secondary">
            {songs.length} song{songs.length !== 1 ? 's' : ''} in your collection
          </p>

          {/* Primary Actions */}
          <div className="flex items-center gap-2.5 mt-4">
            <button
              onClick={handlePlayAll}
              disabled={filteredSongs.length === 0}
              className="flex items-center gap-2 px-5 md:px-7 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-accent-foreground rounded-full font-bold transition-all disabled:opacity-50 active:scale-95 text-sm md:text-base"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleAll}
              disabled={filteredSongs.length === 0}
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
            <SearchBar />
          </div>

          <button
            onClick={() => {
              if (isSelectionMode) clearSelection();
              setSelectionMode(!isSelectionMode);
            }}
            disabled={filteredSongs.length === 0 && !isSelectionMode}
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
                  const allIds = filteredSongs.map(s => s.id);
                  if (selectedIds.size === allIds.length) clearSelection();
                  else selectAll(allIds);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full text-xs font-medium transition-all"
              >
                <ListPlus className="w-3.5 h-3.5" />
                {selectedIds.size === filteredSongs.length ? 'Deselect All' : 'Select All'}
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar">
        {songs.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center max-w-lg mx-auto w-full">
            <ImportSongs />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="bg-surface/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden">
              {viewMode === 'list' ? (
                <SongList 
                  songs={filteredSongs} 
                  onReorder={(!searchQuery && !moodFilter) ? reorderLibrarySongs : undefined} 
                />
              ) : (
                <SongGrid 
                  songs={filteredSongs} 
                  onReorder={(!searchQuery && !moodFilter) ? reorderLibrarySongs : undefined} 
                />
              )}
            </div>
            
            {/* Persistent Upload Zone at bottom */}
            <div className="max-w-4xl mx-auto w-full pt-4 pb-20">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-text-primary mb-1">Add more music</h3>
                <p className="text-sm text-text-muted">Drop files here to expand your library</p>
              </div>
              <ImportSongs />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
