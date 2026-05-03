'use client';
import React, { useState } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { ListMusic, X } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const { createPlaylist } = useLibrary();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createPlaylist(name.trim());
      setName('');
      onClose();
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-sm bg-surface border border-border rounded-3xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <ListMusic className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">New Playlist</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="playlist-name" className="block text-sm font-medium text-text-secondary mb-2 ml-1">
              Playlist Name
            </label>
            <input
              id="playlist-name"
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your playlist a name"
              className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-lg font-medium"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-xl font-bold transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-[2] px-6 py-3.5 bg-accent hover:bg-accent-hover text-accent-foreground rounded-xl font-bold transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
