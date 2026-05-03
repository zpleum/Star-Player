'use client';
// ============================================================
// Star Player — Song List Component
// ============================================================
import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { formatTime } from '@/lib/utils';
import { MOOD_CONFIG, type SongMeta, type MoodCategory } from '@/lib/types';
import {
  Play, Pause, Heart, MoreVertical, Plus, Trash2, ListPlus, Music2, GripVertical, Video, Brain
} from 'lucide-react';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
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
  isQueuePage?: boolean;
  onReorder?: (startIndex: number, endIndex: number) => void;
}

// Dumb UI component that just renders the row, used by both the list item and the drag overlay
const SongRowUI = React.forwardRef<HTMLDivElement, any>(({
  song, index, state, coverArts, showMoodBadge, showBpm, onReorder, handlePlay, handleContextMenu, toggleFavorite,
  isSelected, isSelectionMode,
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
      className={`group relative grid grid-cols-[40px_1fr_1fr_80px_80px_80px_40px] gap-3 px-4 py-2.5 items-center rounded-lg cursor-pointer transition-all duration-150 ${
        isCurrentSong ? 'bg-accent/10 text-accent' : 
        isSelected ? 'bg-accent/20 border-accent/30' : 'hover:bg-surface-hover text-text-primary'
      } ${isDragging && !isOverlay ? 'opacity-30 border border-transparent' : ''} ${
        isOverlay ? 'bg-surface-hover scale-[1.02] border border-accent/50 z-50 ring-1 ring-black/5' : ''
      }`}
      onClick={(e) => handlePlay(song, index, e)}
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
        ) : isSelectionMode ? (
          <div 
            className="flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handlePlay(song, index, e);
            }}
          >
            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
              isSelected ? 'bg-accent border-accent text-white' : 'bg-surface border-border hover:border-accent'
            }`}>
              {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
            </div>
            <span className={`text-[10px] font-bold ${isSelected ? 'text-accent' : 'text-text-muted'}`}>
              {index + 1}
            </span>
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
          <div className="relative w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-sm text-text-muted group-hover:hidden">{index + 1}</span>
            <Play className="w-4 h-4 text-accent hidden group-hover:block" />
          </div>
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

      {/* Source */}
      <div className="flex justify-center">
        {song.source === 'youtube' ? (
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[9px] font-bold border border-red-500/20">
            <Video className="w-2.5 h-2.5" />
            YouTube
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20">
            <Plus className="w-2.5 h-2.5" />
            Upload
          </div>
        )}
      </div>

      {/* BPM */}
      {showBpm ? (
        <div className="text-center text-xs text-text-muted">
          {song.bpm || '—'}
        </div>
      ) : <div />}

      {/* Duration */}
      <div className="text-right text-sm text-text-muted">
        {formatTime(song.duration)}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 transition-opacity ${song.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
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
  isQueuePage,
  onReorder
}: SongListProps) {
  const { state, playSong, addToQueue, removeFromQueue } = usePlayer();
  const { 
    toggleFavorite, deleteSong, getCoverArtUrl, playlists, addSongsToPlaylist, 
    removeSongFromPlaylist, showToast, showErrorPopup,
    selectedIds, toggleSelection, setSelectedIds, clearSelection,
    isSelectionMode
  } = useLibrary();
  const { state: analysisState, analyzeSong } = useAudioAnalysis();

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

  const handlePlay = useCallback((song: SongMeta, index: number, e?: React.MouseEvent) => {
    // If in selection mode, click toggles selection
    if (isSelectionMode && !e?.ctrlKey && !e?.metaKey && !e?.shiftKey) {
      toggleSelection(song.id, true);
      return;
    }

    // Existing multi-select logic (keyboard)
    if (e?.ctrlKey || e?.metaKey || e?.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.shiftKey && selectedIds.size > 0) {
        // Range selection
        const songIds = songs.map(s => s.id);
        const lastSelectedId = Array.from(selectedIds).pop()!;
        const lastIndex = songIds.indexOf(lastSelectedId);
        const currentIndex = index;
        
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        const newSelection = new Set(selectedIds);
        for (let i = start; i <= end; i++) {
          newSelection.add(songIds[i]);
        }
        setSelectedIds(newSelection);
      } else {
        toggleSelection(song.id, true);
      }
      return;
    }
    
    playSong(song, songs, index);
    if (selectedIds.size > 0) clearSelection();
  }, [playSong, songs, selectedIds, toggleSelection, setSelectedIds, clearSelection]);

  const handleContextMenu = (e: React.MouseEvent, song: SongMeta) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.has(song.id) && !e.ctrlKey && !e.metaKey) {
      toggleSelection(song.id, false);
    }
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
      <div className="flex flex-col items-center justify-center py-20 text-text-muted h-full">
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
      <div className="grid grid-cols-[40px_1fr_1fr_80px_80px_80px_40px] gap-3 px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Artist / Album</span>
        <span className="text-center">Source</span>
        {showBpm ? <span className="text-center">BPM</span> : <span />}
        <span className="text-right">Duration</span>
        <span />
      </div>

      {/* Song rows */}
      <div className="flex flex-col pb-10">
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
                handlePlay={(s: any, i: any, e: any) => handlePlay(s, i, e)}
                handleContextMenu={handleContextMenu}
                toggleFavorite={toggleFavorite}
                isSelected={selectedIds.has(song.id)}
                isSelectionMode={isSelectionMode}
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
          className="fixed z-50 w-52 py-1 rounded-xl glass-strong animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            onClick={() => { handlePlay(contextMenu.song, songs.indexOf(contextMenu.song)); setContextMenu(null); }}
          >
            <Play className="w-4 h-4" /> Play
          </button>

          {isQueuePage ? (
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-hover transition-colors"
              onClick={() => {
                const songsToRemove = selectedIds.has(contextMenu.song.id) 
                  ? songs.filter(s => selectedIds.has(s.id))
                  : [contextMenu.song];
                
                songsToRemove.forEach(s => {
                  const idx = songs.indexOf(s);
                  if (idx !== -1) removeFromQueue(idx);
                });
                
                clearSelection();
                setContextMenu(null);
                showToast('success', `Removed ${songsToRemove.length} song(s) from queue`);
              }}
            >
              <Trash2 className="w-4 h-4" /> Remove from Queue
            </button>
          ) : (
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
              onClick={() => {
                const songsToAdd = selectedIds.has(contextMenu.song.id)
                  ? songs.filter(s => selectedIds.has(s.id))
                  : [contextMenu.song];
                
                addToQueue(songsToAdd);
                clearSelection();
                setContextMenu(null);
                showToast('success', `Added ${songsToAdd.length} song(s) to queue`);
              }}
            >
              <ListPlus className="w-4 h-4" /> Add to Queue
            </button>
          )}
          
          {!contextMenu.song.analyzed && (
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
              onClick={async () => {
                const songId = contextMenu.song.id;
                const songTitle = contextMenu.song.title;
                setContextMenu(null);
                showToast('info', `Analyzing "${songTitle}"...`);
                const result = await analyzeSong(songId, songTitle);
                if (result.success) {
                  showToast('success', `Analysis complete for "${songTitle}"`);
                } else {
                  showErrorPopup(
                    'Analysis Failed',
                    result.error || 'The audio file format might be unsupported or the file is corrupted.',
                    `Failed to analyze: ${songTitle}`
                  );
                }
              }}
              disabled={analysisState.status === 'analyzing' && analysisState.currentSongId === contextMenu.song.id}
            >
              <Brain className={`w-4 h-4 ${analysisState.status === 'analyzing' && analysisState.currentSongId === contextMenu.song.id ? 'animate-pulse text-accent' : ''}`} />
              {analysisState.status === 'analyzing' && analysisState.currentSongId === contextMenu.song.id ? 'Analyzing...' : 'Analyze Audio'}
            </button>
          )}
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
                  onClick={() => { 
                    const ids = selectedIds.has(contextMenu.song.id) ? Array.from(selectedIds) : [contextMenu.song.id];
                    addSongsToPlaylist(pl.id, ids); 
                    setContextMenu(null); 
                    if (selectedIds.size > 0) clearSelection();
                  }}
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
                  if (selectedIds.size > 1) {
                    setConfirmAction({ isOpen: true, type: 'removeFromPlaylist', songId: 'multiple', songTitle: `${selectedIds.size} songs` });
                  } else {
                    setConfirmAction({ isOpen: true, type: 'removeFromPlaylist', songId: contextMenu.song.id, songTitle: contextMenu.song.title });
                  }
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
              if (selectedIds.size > 1) {
                setConfirmAction({ isOpen: true, type: 'delete', songId: 'multiple', songTitle: `${selectedIds.size} songs` });
              } else {
                setConfirmAction({ isOpen: true, type: 'delete', songId: contextMenu.song.id, songTitle: contextMenu.song.title });
              }
              setContextMenu(null);
            }}
          >
            <Trash2 className="w-4 h-4" /> {selectedIds.size > 1 ? `Delete ${selectedIds.size} songs` : 'Delete song'}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmAction.isOpen}
        title={confirmAction.type === 'delete' ? 'Delete Songs' : 'Remove from Playlist'}
        message={
          confirmAction.type === 'delete'
            ? `Are you sure you want to permanently delete ${confirmAction.songTitle}? This action cannot be undone.`
            : `Are you sure you want to remove ${confirmAction.songTitle} from this playlist?`
        }
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (!confirmAction.songId) return;
          const ids = confirmAction.songId === 'multiple' ? Array.from(selectedIds) : [confirmAction.songId];
          
          if (confirmAction.type === 'delete') {
            for (const id of ids) {
              await deleteSong(id);
            }
            if (ids.length > 1) showToast('success', `Deleted ${ids.length} songs`);
          } else if (confirmAction.type === 'removeFromPlaylist' && playlistId) {
            for (const id of ids) {
              await removeSongFromPlaylist(playlistId, id);
            }
            if (ids.length > 1) showToast('success', `Removed ${ids.length} songs from playlist`);
          }
          
          clearSelection();
          setConfirmAction({ isOpen: false, type: 'delete' });
        }}
        onCancel={() => setConfirmAction({ isOpen: false, type: 'delete' })}
      />
    </>
  );
}
