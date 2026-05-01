'use client';
import { usePlayer } from '@/contexts/PlayerContext';
import SongList from '@/components/library/SongList';
import { ListOrdered, Trash2 } from 'lucide-react';

export default function QueuePage() {
  const { state, clearQueue, reorderQueue } = usePlayer();
  const { queue } = state;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="px-8 pt-12 pb-4 flex-shrink-0 relative z-10 border-b border-border">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2 flex items-center gap-4">
              <ListOrdered className="w-10 h-10 text-accent" />
              Play Queue
            </h1>
            <p className="text-text-secondary">
              {queue.length} song{queue.length !== 1 ? 's' : ''} in queue
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearQueue}
              disabled={queue.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-text-primary rounded-full font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear Queue
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative z-10">
        <SongList
          songs={queue}
          emptyMessage="Your queue is empty. Add some songs to start listening."
          onReorder={reorderQueue}
        />
      </div>
    </div>
  );
}
