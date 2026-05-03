'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Play, ListMusic } from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import ConfirmDialog from './ConfirmDialog';

export default function PlaylistContextMenu() {
  const router = useRouter();
  const { playlists, songs, deletePlaylist } = useLibrary();
  const { playQueue } = usePlayer();
  
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [targetPlaylistId, setTargetPlaylistId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const playlistItem = target.closest('[data-playlist-id]');
      
      if (!playlistItem) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const playlistId = playlistItem.getAttribute('data-playlist-id');
      setTargetPlaylistId(playlistId);
      
      setVisible(false);
      setPos({ x: e.clientX, y: e.clientY });
      setTimeout(() => setVisible(true), 10);
    };

    const handleClick = () => setVisible(false);
    const handleScroll = () => setVisible(false);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      let newX = pos.x;
      let newY = pos.y;
      if (pos.x + rect.width > window.innerWidth - 10) newX = window.innerWidth - rect.width - 10;
      if (pos.y + rect.height > window.innerHeight - 10) newY = window.innerHeight - rect.height - 10;
      if (newX !== pos.x || newY !== pos.y) setPos({ x: newX, y: newY });
    }
  }, [visible, pos]);

  if (!visible && !isDeleteModalOpen) return null;

  const targetPlaylist = playlists.find(p => p.id === targetPlaylistId);
  if (!targetPlaylist && !isDeleteModalOpen) return null;

  const handleDelete = async () => {
    if (targetPlaylistId) {
      await deletePlaylist(targetPlaylistId);
      setIsDeleteModalOpen(false);
      setVisible(false);
    }
  };

  return (
    <>
      {visible && (
        <div
          ref={menuRef}
          className="fixed z-[9999] w-48 py-1.5 rounded-xl glass-strong ring-1 ring-black/10 animate-fade-in border border-white/5"
          style={{ left: pos.x, top: pos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 mb-1 flex items-center gap-2 border-b border-white/5 mx-1">
            <ListMusic className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider truncate">
              {targetPlaylist?.name}
            </span>
          </div>
          
          <button
            onClick={() => {
              if (targetPlaylist) {
                const pSongs = targetPlaylist.songIds
                  .map(id => songs.find(s => s.id === id))
                  .filter((s): s is any => s !== undefined);
                playQueue(pSongs, 0);
              }
              setVisible(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors rounded-lg mx-1"
          >
            <Play className="w-4 h-4 opacity-70" />
            <span>Play</span>
          </button>

          <button
            onClick={() => {
              router.push(`/playlists/${targetPlaylistId}`);
              setVisible(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors rounded-lg mx-1"
          >
            <Edit className="w-4 h-4 opacity-70" />
            <span>Edit / View</span>
          </button>

          <div className="h-px bg-white/5 my-1 mx-2" />

          <button
            onClick={() => {
              setIsDeleteModalOpen(true);
              setVisible(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors rounded-lg mx-1"
          >
            <Trash2 className="w-4 h-4 opacity-70" />
            <span>Delete Playlist</span>
          </button>
        </div>
      )}

      {isDeleteModalOpen && targetPlaylist && (
        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Playlist"
          message={`Are you sure you want to delete "${targetPlaylist.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          isDestructive={true}
        />
      )}
    </>
  );
}
