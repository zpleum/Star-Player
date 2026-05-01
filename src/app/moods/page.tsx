'use client';
// ============================================================
// Star Player — Smart Moods Overview Page
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { MOOD_CONFIG, ALL_MOODS } from '@/lib/types';
import Link from 'next/link';
import { Brain, Dices, Shuffle, Play } from 'lucide-react';
import AnalysisProgress from '@/components/mood/AnalysisProgress';

export default function MoodsPage() {
  const { songs } = useLibrary();
  const { playRandomByMood, shuffleByMood, playQueue } = usePlayer();
  const { state: analysisState, analyzeAll, cancelAnalysis } = useAudioAnalysis();

  const unanalyzedCount = songs.filter((s) => !s.analyzed).length;

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
              <Brain className="w-8 h-8 text-accent" />
              Smart Moods
            </h1>
            <p className="text-text-secondary">
              Your music, automatically categorized by our Audio Intelligence Engine.
            </p>
          </div>
          
          {unanalyzedCount > 0 && (
            <button
              onClick={analyzeAll}
              disabled={analysisState.status === 'analyzing'}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-accent/50 text-accent hover:bg-accent/10 rounded-full font-medium transition-all disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              Analyze {unanalyzedCount} Unanalyzed Song{unanalyzedCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ALL_MOODS.map((mood) => {
            const config = MOOD_CONFIG[mood];
            const moodSongs = songs.filter((s) => s.mood === mood);
            const count = moodSongs.length;

            return (
              <div
                key={mood}
                className="group relative overflow-hidden rounded-3xl glass border-0 shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1 flex flex-col min-h-[240px]"
              >
                {/* Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
                />
                
                {/* Content */}
                <div className="relative z-10 p-6 flex-1 flex flex-col">
                  <div className="flex items-start justify-between mb-auto">
                    <span className="text-5xl drop-shadow-md">{config.emoji}</span>
                    <div className="px-3 py-1 rounded-full bg-surface/50 border border-border/50 text-xs font-semibold text-text-secondary">
                      {count} song{count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-text-primary mb-1">{mood}</h2>
                    <p className="text-sm text-text-secondary mb-6">{config.label}</p>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/moods/${encodeURIComponent(mood)}`}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-surface/80 hover:bg-surface border border-border rounded-xl text-sm font-medium text-text-primary transition-colors backdrop-blur-md"
                      >
                        <Play className="w-4 h-4" />
                        View All
                      </Link>
                      
                      <button
                        onClick={() => playRandomByMood(mood, songs)}
                        disabled={count === 0}
                        className="p-2.5 bg-surface/80 hover:bg-surface border border-border rounded-xl text-text-primary transition-colors disabled:opacity-50 backdrop-blur-md"
                        title="Play Random Song"
                      >
                        <Dices className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => shuffleByMood(mood, songs)}
                        disabled={count === 0}
                        className="p-2.5 bg-surface/80 hover:bg-surface border border-border rounded-xl text-text-primary transition-colors disabled:opacity-50 backdrop-blur-md"
                        title="Shuffle All"
                      >
                        <Shuffle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnalysisProgress state={analysisState} onCancel={cancelAnalysis} />
    </div>
  );
}
