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
      <div className="px-8 pt-8 pb-4 flex-shrink-0 relative z-10 border-b border-border/50">
        <h1 className="text-3xl font-bold text-text-primary mb-6 flex items-center gap-3">
          <ListOrdered className="w-8 h-8 text-accent" />
          Play Queue
        </h1>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayFromStart}
              disabled={filteredQueue.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-accent-foreground rounded-full font-medium transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleQueue}
              disabled={filteredQueue.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover disabled:opacity-50 disabled:hover:bg-surface text-text-primary rounded-full font-medium transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle All
            </button>
            <button
              onClick={clearQueue}
              disabled={queue.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Queue
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search in queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-surface border border-border rounded-full text-sm focus:outline-none focus:border-accent w-64"
              />
            </div>
            
            {/* Selection Mode Toggle */}
            <div className="flex items-center gap-2 border-l border-border pl-3">
              {isSelectionMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectAll(filteredQueue.map(s => s.id))}
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
          {filteredQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <ListOrdered className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Your queue is empty.</p>
              <p className="text-sm">Add some songs to start listening!</p>
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
  );
}
