'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import SongList from '@/components/library/SongList';
import SongGrid from '@/components/library/SongGrid';
import AddSongsModal from '@/components/library/AddSongsModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ChevronLeft, Play, Shuffle, Trash2, Plus, Music2, LayoutGrid, List, CheckSquare, Square, ListPlus } from 'lucide-react';

function PlaylistDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { 
    playlists, songs, deletePlaylist, reorderPlaylistSongs, getCoverArtUrl,
    isSelectionMode, setSelectionMode, clearSelection, selectedIds, selectAll,
    viewMode, setViewMode
  } = useLibrary();
  const { playQueue, toggleShuffle } = usePlayer();
  const [mounted, setMounted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const playlistId = searchParams.get('id');
  const playlist = playlists.find((p) => p.id === playlistId);

  // Get full song objects for this playlist, keeping the order of songIds
  const playlistSongs = useMemo(() => {
    return (playlist?.songIds ?? [])
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
  }, [playlist, songs]);

  const firstSongId = playlistSongs[0]?.id;
  const firstSongHasCover = playlistSongs[0]?.hasCoverArt ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);


  // Load cover art from first song
  const { setAccentColor, state: playerState } = usePlayer();

  useEffect(() => {
    if (playlistSongs.length > 0 && !playerState.currentSong) {
      getCoverArtUrl(playlistSongs[0].id).then(url => {
        if (!url) {
          // If no cover, use mood color or default
          setAccentColor('#8b5cf6');
          return;
        }
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = 50;
          canvas.height = 50;
          ctx.drawImage(img, 0, 0, 50, 50);
          
          const regions = [
            { x: 0, y: 0, w: 25, h: 25 }, { x: 25, y: 0, w: 25, h: 25 },
            { x: 0, y: 25, w: 25, h: 25 }, { x: 25, y: 25, w: 25, h: 25 },
            { x: 12, y: 12, w: 25, h: 25 }
          ];

          const colors = regions.map(reg => {
            const data = ctx.getImageData(reg.x, reg.y, reg.w, reg.h).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
              r += data[i]; g += data[i+1]; b += data[i+2]; count++;
            }
            return `#${Math.floor(r/count).toString(16).padStart(2, '0')}${Math.floor(g/count).toString(16).padStart(2, '0')}${Math.floor(b/count).toString(16).padStart(2, '0')}`;
          });

          setAccentColor({
            c1: colors[0], c2: colors[1], c3: colors[2], c4: colors[3], c5: colors[4]
          });
        };
      });
    }
  }, [playlistSongs, playerState.currentSong, getCoverArtUrl, setAccentColor]);

  useEffect(() => {
    if (firstSongId && firstSongHasCover) {
      getCoverArtUrl(firstSongId).then(setCoverUrl);
    } else {
      setCoverUrl(null);
    }
  }, [firstSongId, firstSongHasCover, getCoverArtUrl]);

  if (!mounted) return null;

  if (!playlistId || !playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-text-muted">Playlist not found</p>
        <button onClick={() => router.push('/playlists')} className="mt-4 text-accent hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const onConfirmDelete = () => {
    deletePlaylist(playlist.id);
    router.push('/playlists');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
      />
      {/* Dynamic Background Mesh Gradient */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ease-in-out"
        style={{
          opacity: playerState.dynamicBackgroundEnabled ? 0.2 : 0,
          background: `
            radial-gradient(circle at var(--accent-pos-1-x) var(--accent-pos-1-y), var(--accent) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-2-x) var(--accent-pos-2-y), var(--accent-2) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-3-x) var(--accent-pos-3-y), var(--accent-3) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-4-x) var(--accent-pos-4-y), var(--accent-4) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-5-x) var(--accent-pos-5-y), var(--accent-5) 0%, transparent 50%)
          `
        }}
      />

      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex-shrink-0 relative z-10">
        <button
          onClick={() => router.push('/playlists')}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Playlists
        </button>

        {/* Hero Section */}
        <div className="flex items-center gap-5 md:gap-8 mb-6">
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xl shadow-black/30">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music2 className="w-10 h-10 md:w-14 md:h-14 text-text-muted/20" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] md:text-xs font-semibold text-accent uppercase tracking-wider mb-1 md:mb-2">Playlist</p>
            <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-1 md:mb-2 truncate leading-tight">{playlist.name}</h1>
            <p className="text-sm md:text-base text-text-secondary">
              {playlistSongs.length} song{playlistSongs.length !== 1 ? 's' : ''}
            </p>

            {/* Primary Actions */}
            <div className="flex items-center gap-2.5 mt-4">
              <button
                onClick={() => {
                  if (playlistSongs.length > 0) playQueue(playlistSongs, 0);
                }}
                disabled={playlistSongs.length === 0}
                className="flex items-center gap-2 px-5 md:px-7 py-2.5 md:py-3 bg-accent hover:bg-accent-hover text-accent-foreground rounded-full font-bold transition-all disabled:opacity-50 active:scale-95 text-sm md:text-base"
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
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
                className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors disabled:opacity-50 text-sm md:text-base"
              >
                <Shuffle className="w-4 h-4 md:w-5 md:h-5" />
                Shuffle
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Toolbar */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 pt-3 border-t border-border/50">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full font-medium transition-colors text-xs md:text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Songs
          </button>
          <button
            onClick={() => {
              if (isSelectionMode) clearSelection();
              setSelectionMode(!isSelectionMode);
            }}
            disabled={playlistSongs.length === 0}
            className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full font-medium transition-all text-xs md:text-sm ${
              isSelectionMode 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-surface border border-border hover:bg-surface-hover text-text-primary'
            }`}
          >
            {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Select
          </button>

          {isSelectionMode && (
            <div className="flex items-center gap-2 animate-fade-in">
              <button
                onClick={() => {
                  const allIds = playlistSongs.map(s => s.id);
                  if (selectedIds.size === allIds.length) clearSelection();
                  else selectAll(allIds);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-primary rounded-full text-xs font-medium transition-all"
              >
                <ListPlus className="w-3.5 h-3.5" />
                {selectedIds.size === playlistSongs.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-text-muted font-medium bg-surface px-3 py-2 rounded-full border border-border">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 md:p-2.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
            title="Delete Playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-surface border border-border rounded-full p-1 ml-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-background text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-background text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 relative z-10 custom-scrollbar">
        <div className="bg-surface/30 rounded-2xl border border-border/50 flex flex-col overflow-hidden min-h-[400px]">
          {viewMode === 'list' ? (
            <SongList
              songs={playlistSongs}
              emptyMessage="This playlist is empty. Add songs from your library."
              playlistId={playlist.id}
              onReorder={(start, end) => reorderPlaylistSongs(playlist.id, start, end)}
            />
          ) : (
            <SongGrid
              songs={playlistSongs}
              emptyMessage="This playlist is empty. Add songs from your library."
              playlistId={playlist.id}
              onReorder={(start, end) => reorderPlaylistSongs(playlist.id, start, end)}
            />
          )}
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

export default function PlaylistDetailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Loading...</div>}>
      <PlaylistDetailContent />
    </Suspense>
  );
}
