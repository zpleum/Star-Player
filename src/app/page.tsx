'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import ImportSongs from '@/components/library/ImportSongs';
import SearchBar from '@/components/ui/SearchBar';
import { Play, Shuffle, LayoutGrid, List } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Home() {
  const { filteredSongs, songs, loading, reorderLibrarySongs, searchQuery, moodFilter } = useLibrary();
  const { playQueue, toggleShuffle } = usePlayer();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Load viewMode from settings
  useEffect(() => {
    import('@/lib/db').then(db => {
      db.getSettings().then(settings => {
        if (settings.viewMode) {
          setViewMode(settings.viewMode);
        }
      });
    });
  }, []);

  const handleSetViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    import('@/lib/db').then(db => {
      db.getSettings().then(settings => {
        db.saveSettings({ ...settings, viewMode: mode });
      });
    });
  };

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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Library</h1>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              disabled={filteredSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent text-white rounded-full font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)]"
            >
              <Play className="w-4 h-4 fill-current" />
              Play All
            </button>
            <button
              onClick={handleShuffleAll}
              disabled={filteredSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover disabled:opacity-50 disabled:hover:bg-surface text-text-primary rounded-full font-medium transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>
            
            {/* View Toggle */}
            <div className="flex items-center ml-2 bg-surface border border-border rounded-full p-1">
              <button
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="w-72">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-8 pb-4">
        {songs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
            <ImportSongs />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-surface/30 rounded-2xl border border-border/50 flex flex-col">
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
        )}
      </div>
    </div>
  );
}
