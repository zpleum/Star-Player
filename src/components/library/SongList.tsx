'use client';
// ============================================================
// Star Player — Song List Component
// ============================================================
import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { formatTime } from '@/lib/utils';
import { MOOD_CONFIG, type SongMeta, type MoodCategory } from '@/lib/types';
import {
  Play, Pause, Heart, MoreVertical, Plus, Trash2, ListPlus, Music2, GripVertical
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SongListProps {
  songs: SongMeta[];
  showMoodBadge?: boolean;
  showBpm?: boolean;
  emptyMessage?: string;
  playlistId?: string;
  onReorder?: (startIndex: number, endIndex: number) => void;
}

// Dumb UI component that just renders the row, used by both the list item and the drag overlay
const SongRowUI = React.forwardRef<HTMLDivElement, any>(({
  song, index, state, coverArts, showMoodBadge, showBpm, onReorder, handlePlay, handleContextMenu, toggleFavorite,
  style, isDragging, isOverlay, attributes, listeners
}, ref) => {
  const isCurrentSong = state.currentSong?.id === song.id;
  const isPlaying = isCurrentSong && state.isPlaying;
  const moodConfig = song.mood ? MOOD_CONFIG[song.mood as MoodCategory] : null;
  const coverUrl = coverArts.get(song.id);

  return (
    <div
      ref={ref}
      style={style}
      className={`group relative grid grid-cols-[40px_1fr_1fr_80px_80px_40px] gap-3 px-4 py-2.5 items-center rounded-lg cursor-pointer transition-all duration-150 ${
        isCurrentSong ? 'bg-accent/10 text-accent' : 'hover:bg-surface-hover text-text-primary'
      } ${isDragging && !isOverlay ? 'opacity-30 border border-transparent' : ''} ${
        isOverlay ? 'bg-surface-hover shadow-2xl scale-[1.02] border border-accent/50 z-50 ring-1 ring-black/5' : ''
      }`}
      onClick={() => handlePlay(song, index)}
      onContextMenu={(e) => handleContextMenu(e, song)}
    >
      {/* Number / play icon / drag handle */}
      <div className="flex items-center justify-center">
        {isPlaying ? (
          <div className="flex items-end gap-[2px] h-4">
            <span className="w-[3px] bg-accent animate-eq-bar rounded-full" style={{ animationDelay: '0ms' }} />
            <span className="w-[3px] bg-accent animate-eq-bar rounded-full" style={{ animationDelay: '150ms' }} />
            <span className="w-[3px] bg-accent animate-eq-bar rounded-full" style={{ animationDelay: '300ms' }} />
          </div>
        ) : onReorder ? (
          <div 
            {...listeners} 
            {...attributes}
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80" />
            <span className="text-xs text-text-muted">{index + 1}</span>
          </div>
        ) : (
          <>
            <span className="text-sm text-text-muted group-hover:hidden">{index + 1}</span>
            <Play className="w-4 h-4 text-text-primary hidden group-hover:block" />
          </>
        )}
      </div>

      {/* Title + cover */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-md bg-surface overflow-hidden flex-shrink-0 flex items-center justify-center">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music2 className="w-4 h-4 text-text-muted" />
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isCurrentSong ? 'text-accent' : ''}`}>
            {song.title}
          </p>
          {showMoodBadge && moodConfig && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mt-0.5"
              style={{ background: `${moodConfig.color}20`, color: moodConfig.color }}>
              {moodConfig.emoji} {song.mood}
            </span>
          )}
        </div>
      </div>

      {/* Artist / Album */}
      <div className="min-w-0">
        <p className="text-sm text-text-secondary truncate">{song.artist}</p>
        <p className="text-xs text-text-muted truncate">{song.album}</p>
      </div>

      {/* BPM */}
      {showBpm && (
        <div className="text-center">
          {song.bpm ? (
            <span className="text-xs text-text-muted">{song.bpm}</span>
          ) : (
            <span className="text-xs text-text-muted/50">—</span>
          )}
        </div>
      )}
      {!showBpm && <div />}

      {/* Duration */}
      <div className="text-right text-sm text-text-muted">
        {formatTime(song.duration)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggleFavorite(song.id)}
          className={`p-1 transition-colors ${song.favorite ? 'text-pink-500' : 'text-text-muted hover:text-pink-500'}`}
        >
          <Heart className={`w-3.5 h-3.5 ${song.favorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
});

SongRowUI.displayName = 'SongRowUI';

import React from 'react';

function SortableSongItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SongRowUI
      {...props}
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
    />
  );
}

export default function SongList({
  songs,
  showMoodBadge = true,
  showBpm = true,
  emptyMessage = 'No songs yet',
  playlistId,
  onReorder
}: SongListProps) {
  const { state, playSong } = usePlayer();
  const { toggleFavorite, deleteSong, getCoverArtUrl, playlists, addSongsToPlaylist, removeSongFromPlaylist, showToast } = useLibrary();

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    type: 'delete' | 'removeFromPlaylist';
    songId?: string;
    songTitle?: string;
  }>({ isOpen: false, type: 'delete' });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: SongMeta } | null>(null);
  const [coverArts, setCoverArts] = useState<Map<string, string>>(new Map());
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load cover arts for visible songs
  useEffect(() => {
    const loadCovers = async () => {
      const newCovers = new Map(coverArts);
      for (const song of songs.slice(0, 50)) {
        if (!newCovers.has(song.id) && song.hasCoverArt) {
          const url = await getCoverArtUrl(song.id);
          if (url) newCovers.set(song.id, url);
        }
      }
      setCoverArts(newCovers);
    };
    loadCovers();
  }, [songs, getCoverArtUrl]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePlay = useCallback((song: SongMeta, index: number) => {
    playSong(song, songs, index);
  }, [playSong, songs]);

  const handleContextMenu = (e: React.MouseEvent, song: SongMeta) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (active.id !== over?.id && onReorder) {
      const oldIndex = songs.findIndex(s => s.id === active.id);
      const newIndex = songs.findIndex(s => s.id === over?.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Music2 className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  const items = songs.map(s => s.id);
  const activeSong = activeId ? songs.find(s => s.id === activeId) : null;
  const activeIndex = activeSong ? songs.findIndex(s => s.id === activeId) : -1;

  // Setup drop animation
  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  return (
    <>
      {/* Header row */}
      <div className="grid grid-cols-[40px_1fr_1fr_80px_80px_40px] gap-3 px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Artist / Album</span>
        {showBpm && <span className="text-center">BPM</span>}
        {!showBpm && <span />}
        <span className="text-right">Duration</span>
        <span />
      </div>

      {/* Song rows */}
      <div className="overflow-y-auto flex-1 pb-20">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={items}
            strategy={verticalListSortingStrategy}
          >
            {songs.map((song, index) => (
              <SortableSongItem
                key={song.id}
                song={song}
                index={index}
                state={state}
                coverArts={coverArts}
                showMoodBadge={showMoodBadge}
                showBpm={showBpm}
                onReorder={onReorder}
                handlePlay={handlePlay}
                handleContextMenu={handleContextMenu}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </SortableContext>
          
          {/* Super smooth drag overlay */}
          <DragOverlay dropAnimation={dropAnimation}>
            {activeSong ? (
              <SongRowUI
                song={activeSong}
                index={activeIndex}
                state={state}
                coverArts={coverArts}
                showMoodBadge={showMoodBadge}
                showBpm={showBpm}
                onReorder={onReorder}
                handlePlay={() => {}}
                handleContextMenu={() => {}}
                toggleFavorite={() => {}}
                isDragging={true}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-52 py-1 rounded-xl glass-strong shadow-2xl animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            onClick={() => { handlePlay(contextMenu.song, songs.indexOf(contextMenu.song)); setContextMenu(null); }}
          >
            <Play className="w-4 h-4" /> Play
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            onClick={() => { toggleFavorite(contextMenu.song.id); setContextMenu(null); }}
          >
            <Heart className="w-4 h-4" />
            {contextMenu.song.favorite ? 'Remove from favorites' : 'Add to favorites'}
          </button>

          {/* Add to playlist submenu */}
          {playlists.length > 0 && (
            <>
              <div className="border-t border-border my-1" />
              <p className="px-4 py-1 text-xs text-text-muted">Add to playlist</p>
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                  onClick={() => { addSongsToPlaylist(pl.id, [contextMenu.song.id]); setContextMenu(null); }}
                >
                  <ListPlus className="w-4 h-4" /> {pl.name}
                </button>
              ))}
            </>
          )}

          {playlistId && (
            <>
              <div className="border-t border-border my-1" />
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-hover transition-colors"
                onClick={() => {
                  setConfirmAction({ isOpen: true, type: 'removeFromPlaylist', songId: contextMenu.song.id, songTitle: contextMenu.song.title });
                  setContextMenu(null);
                }}
              >
                <Trash2 className="w-4 h-4" /> Remove from playlist
              </button>
            </>
          )}

          <div className="border-t border-border my-1" />
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-hover transition-colors"
            onClick={() => {
              setConfirmAction({ isOpen: true, type: 'delete', songId: contextMenu.song.id, songTitle: contextMenu.song.title });
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-4 h-4" /> Delete song
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmAction.isOpen}
        title={confirmAction.type === 'delete' ? 'Delete Song' : 'Remove from Playlist'}
        message={
          confirmAction.type === 'delete'
            ? `Are you sure you want to permanently delete "${confirmAction.songTitle}"? This action cannot be undone.`
            : `Are you sure you want to remove "${confirmAction.songTitle}" from this playlist?`
        }
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (!confirmAction.songId) return;
          if (confirmAction.type === 'delete') {
            await deleteSong(confirmAction.songId);
          } else if (confirmAction.type === 'removeFromPlaylist' && playlistId) {
            await removeSongFromPlaylist(playlistId, confirmAction.songId);
          }
          setConfirmAction({ isOpen: false, type: 'delete' });
        }}
        onCancel={() => setConfirmAction({ isOpen: false, type: 'delete' })}
      />
    </>
  );
}
