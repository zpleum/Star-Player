'use client';
// ============================================================
// Star Player — Bulk Actions Bar
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { ListPlus, Trash2, X, CheckSquare, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onSelectAll: () => void;
  totalCount: number;
}

export default function BulkActionsBar({ selectedIds, onClear, onSelectAll, totalCount }: BulkActionsBarProps) {
  const { playlists, addSongsToPlaylist, deleteSong, showToast } = useLibrary();
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAllSelected = selectedIds.size === totalCount && totalCount > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsPlaylistMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} songs?`)) {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteSong(id);
      }
      showToast('success', `Deleted ${ids.length} songs`);
      onClear();
    }
  };

  if (selectedIds.size === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
      <div className="glass-strong rounded-2xl px-6 py-4 flex items-center gap-6 border border-accent/20 ring-1 ring-black/5">
        <div className="flex items-center gap-3 pr-6 border-r border-border/50">
          <button 
            onClick={onSelectAll}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-accent transition-colors"
            title={isAllSelected ? "Deselect All" : "Select All"}
          >
            {isAllSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary">{selectedIds.size} selected</span>
            <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Bulk Actions</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              <ListPlus className="w-4 h-4" />
              Add to Playlist
            </button>

            {isPlaylistMenuOpen && (
              <div className="absolute bottom-full mb-3 left-0 w-56 py-2 glass-strong rounded-xl border border-border animate-fade-in">
                <p className="px-4 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">Select Playlist</p>
                {playlists.length > 0 ? (
                  playlists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        addSongsToPlaylist(pl.id, Array.from(selectedIds));
                        setIsPlaylistMenuOpen(false);
                        onClear();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded bg-surface flex items-center justify-center">
                        <ListPlus className="w-4 h-4 text-accent" />
                      </div>
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-xs text-text-muted italic">No playlists found</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
            title="Delete Selected"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-8 bg-border/50 mx-1" />

          <button
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-xl text-sm font-medium transition-all"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
