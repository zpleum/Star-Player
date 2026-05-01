'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import Link from 'next/link';
import { ListMusic, Plus, Music2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PlaylistsPage() {
  const { playlists, createPlaylist, songs, getCoverArtUrl } = useLibrary();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [coverArts, setCoverArts] = useState<Map<string, string>>(new Map());

  // Load cover art for first song of each playlist
  useEffect(() => {
    const loadCovers = async () => {
      const newCovers = new Map<string, string>();
      for (const pl of playlists) {
        if (pl.songIds.length > 0) {
          const firstSong = songs.find(s => s.id === pl.songIds[0]);
          if (firstSong?.hasCoverArt) {
            const url = await getCoverArtUrl(firstSong.id);
            if (url) newCovers.set(pl.id, url);
          }
        }
      }
      setCoverArts(newCovers);
    };
    loadCovers();
  }, [playlists, songs, getCoverArtUrl]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
              <ListMusic className="w-8 h-8 text-accent" />
              Playlists
            </h1>
            <p className="text-text-secondary">Your custom collections.</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-full font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            <Plus className="w-5 h-5" />
            New Playlist
          </button>
        </div>

        {isCreating && (
          <div className="mb-8 p-6 glass-strong rounded-2xl border border-border animate-fade-in">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-5 py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </form>
          </div>
        )}

        {playlists.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted border-2 border-dashed border-border rounded-3xl">
            <ListMusic className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">No playlists yet</p>
            <p className="text-sm mt-1">Create one to start organizing your music.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map((pl) => {
              const coverUrl = coverArts.get(pl.id);
              return (
                <Link
                  key={pl.id}
                  href={`/playlists/${pl.id}`}
                  className="group flex flex-col gap-3"
                >
                  <div className="aspect-square rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-1 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Music2 className="w-12 h-12 text-text-muted/50 group-hover:scale-110 transition-transform duration-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {pl.songIds.length} song{pl.songIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
