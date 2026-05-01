'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import { Heart, Play, Shuffle } from 'lucide-react';

export default function FavoritesPage() {
  const { songs } = useLibrary();
  const { playQueue } = usePlayer();

  const favoriteSongs = songs.filter((s) => s.favorite);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-pink-500/10 to-transparent opacity-50 pointer-events-none" />

      <div className="px-8 pt-12 pb-4 flex-shrink-0 relative z-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2 flex items-center gap-4">
              <Heart className="w-10 h-10 text-pink-500 fill-pink-500" />
              Favorites
            </h1>
            <p className="text-text-secondary">
              {favoriteSongs.length} song{favoriteSongs.length !== 1 ? 's' : ''} you love
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (favoriteSongs.length > 0) playQueue(favoriteSongs, 0);
              }}
              disabled={favoriteSongs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-full font-bold transition-all disabled:opacity-50 active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              Play All
            </button>
            <button
              onClick={() => {
                if (favoriteSongs.length > 0) {
                  const { shuffleArray } = require('@/lib/utils');
                  playQueue(shuffleArray([...favoriteSongs]), 0);
                }
              }}
              disabled={favoriteSongs.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors disabled:opacity-50"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-8 pb-4 relative z-10">
        <div className="flex-1 overflow-hidden bg-surface/30 rounded-2xl border border-border/50 flex flex-col">
          <SongList
            songs={favoriteSongs}
            emptyMessage="No favorites yet. Click the heart icon on any song to add it here."
          />
        </div>
      </div>
    </div>
  );
}
