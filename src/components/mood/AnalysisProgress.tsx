'use client';
// ============================================================
// Star Player — Analysis Progress Component
// ============================================================
import { Brain, Loader2, X } from 'lucide-react';
import type { AnalysisState } from '@/lib/types';

interface AnalysisProgressProps {
  state: AnalysisState;
  onCancel: () => void;
}

export default function AnalysisProgress({ state, onCancel }: AnalysisProgressProps) {
  if (state.status === 'idle' || state.status === 'done') return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="glass-strong border border-accent/30 rounded-2xl p-4 flex items-center gap-4 min-w-[320px]">
        
        <div className="relative flex items-center justify-center w-12 h-12">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="22"
              className="stroke-surface-hover fill-none"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              className="stroke-accent fill-none transition-all duration-300"
              strokeWidth="4"
              strokeDasharray={22 * 2 * Math.PI}
              strokeDashoffset={22 * 2 * Math.PI * (1 - state.progress / 100)}
              strokeLinecap="round"
            />
          </svg>
          <Brain className="w-5 h-5 text-accent animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary mb-0.5 flex items-center gap-2">
            Analyzing Audio... <span className="text-xs font-normal text-text-muted">({state.progress}%)</span>
          </p>
          <p className="text-xs text-text-secondary truncate">
            {state.currentSongTitle || 'Initializing...'}
          </p>
          {state.totalSongs > 0 && (
            <p className="text-[10px] text-text-muted mt-1">
              Song {state.analyzedCount + 1} of {state.totalSongs}
            </p>
          )}
        </div>

        <button
          onClick={onCancel}
          className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors"
          title="Cancel Analysis"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
