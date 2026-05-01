'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { MOOD_CONFIG, type MoodCategory } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SongList from '@/components/library/SongList';
import { ChevronLeft, Dices, Shuffle, Play } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

export default function MoodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { songs } = useLibrary();
  const { playRandomByMood, shuffleByMood, playQueue } = usePlayer();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const moodParam = decodeURIComponent(params.mood as string) as MoodCategory;
  const config = MOOD_CONFIG[moodParam];

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

  const moodSongs = songs.filter((s) => s.mood === moodParam);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Background Gradient */}
      <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-b ${config.gradient} opacity-5 pointer-events-none`} />

      <div className="px-8 pt-8 pb-4 flex-shrink-0 relative z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Moods
        </button>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl bg-gradient-to-br ${config.gradient} shadow-[0_10px_30px_rgba(0,0,0,0.3)]`}>
              {config.emoji}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-2">{moodParam}</h1>
              <p className="text-text-secondary">{moodSongs.length} song{moodSongs.length !== 1 ? 's' : ''} • {config.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (moodSongs.length > 0) playQueue(moodSongs, 0);
              }}
              disabled={moodSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              Play All
            </button>
            <button
              onClick={() => playRandomByMood(moodParam, songs)}
              disabled={moodSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors disabled:opacity-50"
            >
              <Dices className="w-4 h-4" />
              Random Song
            </button>
            <button
              onClick={() => shuffleByMood(moodParam, songs)}
              disabled={moodSongs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] rounded-full font-medium transition-colors disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-8 pb-4 relative z-10">
        <div className="flex-1 overflow-hidden bg-surface/30 rounded-2xl border border-border/50 flex flex-col">
          <SongList
            songs={moodSongs}
            emptyMessage={`No songs classified as "${moodParam}" yet.`}
          />
        </div>
      </div>
    </div>
  );
}
