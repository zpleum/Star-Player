'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import { 
  Play, Shuffle, ListOrdered, Trash2, List, LayoutGrid, Search, 
  CheckSquare, Square, ListPlus 
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export default function QueuePage() {
  const { 
    isSelectionMode, setSelectionMode, clearSelection, selectedIds, selectAll,
    getCoverArtUrl, viewMode, setViewMode
  } = useLibrary();
  
  const { state: playerState, clearQueue, reorderQueue, playQueue, toggleShuffle } = usePlayer();
  const { queue, dynamicBackgroundEnabled } = playerState;
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const query = searchQuery.toLowerCase();
    return queue.filter(song => 
      song.title.toLowerCase().includes(query) || 
      song.artist.toLowerCase().includes(query) ||
      song.album?.toLowerCase().includes(query)
    );
  }, [queue, searchQuery]);

  // Auto-exit selection mode if filtered queue becomes empty
  useEffect(() => {
    if (isSelectionMode && filteredQueue.length === 0) {
      setSelectionMode(false);
      clearSelection();
    }
  }, [filteredQueue.length, isSelectionMode, setSelectionMode, clearSelection]);

  const handlePlayFromStart = () => {
    if (filteredQueue.length > 0) {
      playQueue(filteredQueue, 0);
    }
  };

  const handleShuffleQueue = () => {
    if (filteredQueue.length > 0) {
      const { shuffleArray } = require('@/lib/utils');
      playQueue(shuffleArray([...filteredQueue]), 0);
      if (!playerState.isShuffled) toggleShuffle();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex-shrink-0 relative z-10">
        {/* Hero Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-1 md:mb-2 leading-tight flex items-center gap-3">
            <ListOrdered className="w-7 h-7 md:w-8 md:h-8 text-accent" />
            Play Queue
          </h1>
          <p className="text-sm md:text-base text-text-secondary">
            {queue.length} song{queue.length !== 1 ? 's' : ''} queued up
          </p>

          {/* Primary Actions */}
          <div className="flex items-center gap-2.5 mt-4">
            <button
              onClick={handlePlayFromStart}
              disabled={filteredQueue.length === 0}
              className="flex items-center gap-2 px-5 md:px-7 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-accent-foreground rounded-full font-bold transition-all disabled:opacity-50 active:scale-95 text-sm md:text-base"
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleQueue}
              disabled={filteredQueue.length === 0}
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search in queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-full text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            onClick={() => {
              if (isSelectionMode) clearSelection();
              setSelectionMode(!isSelectionMode);
            }}
            disabled={filteredQueue.length === 0}
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
                  const allIds = filteredQueue.map(s => s.id);
                  if (selectedIds.size === allIds.length) clearSelection();
                  else selectAll(allIds);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full text-xs font-medium transition-all"
              >
                <ListPlus className="w-3.5 h-3.5" />
                {selectedIds.size === filteredQueue.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-text-muted font-medium bg-surface px-3 py-2 rounded-full border border-border">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          <button
            onClick={clearQueue}
            disabled={queue.length === 0}
            className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full font-medium transition-colors disabled:opacity-50 text-xs md:text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>

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

      <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 custom-scrollbar">
        <div className="mx-auto">
          <div className="bg-surface/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden min-h-[400px]">
            {filteredQueue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-text-muted text-center animate-fade-in">
                <ListOrdered className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium text-text-primary">Your queue is empty.</p>
                <p className="text-sm mt-2 opacity-60">Add some songs to start listening!</p>
              </div>
            ) : viewMode === 'list' ? (
              <SongList 
                songs={filteredQueue} 
                isQueuePage 
                onReorder={reorderQueue}
              />
            ) : (
              <SongGrid 
                songs={filteredQueue} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
