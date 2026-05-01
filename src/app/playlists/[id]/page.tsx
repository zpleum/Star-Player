'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SongList from '@/components/library/SongList';
import AddSongsModal from '@/components/library/AddSongsModal';
import { ChevronLeft, Play, Shuffle, Trash2, Plus, Music2 } from 'lucide-react';

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { playlists, songs, deletePlaylist, reorderPlaylistSongs, getCoverArtUrl } = useLibrary();
  const { playQueue, toggleShuffle } = usePlayer();
  const [mounted, setMounted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const playlistId = params.id as string;
  const playlist = playlists.find((p) => p.id === playlistId);

  // Get full song objects for this playlist, keeping the order of songIds
  const playlistSongs = (playlist?.songIds ?? [])
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const firstSongId = playlistSongs[0]?.id;
  const firstSongHasCover = playlistSongs[0]?.hasCoverArt ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load cover art from first song
  useEffect(() => {
    if (firstSongId && firstSongHasCover) {
      getCoverArtUrl(firstSongId).then(setCoverUrl);
    } else {
      setCoverUrl(null);
    }
  }, [firstSongId, firstSongHasCover, getCoverArtUrl]);

  if (!mounted) return null;

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-text-muted">Playlist not found</p>
        <button onClick={() => router.push('/playlists')} className="mt-4 text-accent hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(`Delete playlist "${playlist.name}"?`)) {
      deletePlaylist(playlist.id);
      router.push('/playlists');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-accent/20 to-transparent opacity-30 pointer-events-none" />

      <div className="px-8 pt-8 pb-4 flex-shrink-0 relative z-10">
        <button
          onClick={() => router.push('/playlists')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Playlists
        </button>

        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden shadow-2xl">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music2 className="w-12 h-12 text-text-muted/30" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Playlist</p>
              <h1 className="text-4xl font-bold text-text-primary mb-2">{playlist.name}</h1>
              <p className="text-text-secondary">
                {playlistSongs.length} song{playlistSongs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (playlistSongs.length > 0) playQueue(playlistSongs, 0);
              }}
              disabled={playlistSongs.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-full font-bold transition-all disabled:opacity-50 active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              Play
            </button>
            <button
              onClick={() => {
                if (playlistSongs.length > 0) {
                  const { shuffleArray } = require('@/lib/utils');
                  playQueue(shuffleArray([...playlistSongs]), 0);
                }
              }}
              disabled={playlistSongs.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors disabled:opacity-50"
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Songs
            </button>
            <button
              onClick={handleDelete}
              className="p-3 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors ml-2"
              title="Delete Playlist"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-8 pb-4 relative z-10">
        <div className="flex-1 overflow-hidden bg-surface/30 rounded-2xl border border-border/50 flex flex-col">
          <SongList
            songs={playlistSongs}
            emptyMessage="This playlist is empty. Add songs from your library."
            playlistId={playlist.id}
            onReorder={(start, end) => reorderPlaylistSongs(playlist.id, start, end)}
          />
        </div>
      </div>

      {/* Add Songs Modal */}
      {isAddModalOpen && (
        <AddSongsModal
          playlist={playlist}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
}
