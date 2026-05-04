import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { MOOD_CONFIG, type SongMeta, type MoodCategory } from '@/lib/types';
import { Play, Music2, Heart, GripVertical, ListPlus, Trash2, MoreVertical, Video, Plus, Brain, MoreHorizontal } from 'lucide-react';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SongGridProps {
  songs: SongMeta[];
  emptyMessage?: string;
  playlistId?: string;
  isQueuePage?: boolean;
  onReorder?: (startIndex: number, endIndex: number) => void;
}

const SongGridItemUI = React.forwardRef<HTMLDivElement, any>(({
  song, index, state, coverArts, onReorder, handlePlay, toggleFavorite, handleContextMenu,
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
      {...attributes}
      {...(onReorder && !isSelectionMode ? listeners : {})}
      className={`group relative flex flex-col gap-2 transition-all duration-300 ${
        isDragging && !isOverlay ? 'opacity-30' : ''
      } ${isOverlay ? 'scale-105 z-50' : ''}`}
      onClick={(e) => {
        handlePlay(song, index, e);
      }}
      onContextMenu={(e) => handleContextMenu(e, song)}
    >
      {/* Cover Art Wrapper */}
      <div className={`relative aspect-square w-full rounded-lg overflow-hidden bg-white/5 shadow-md transition-all duration-300 ${
        isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
      }`}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-10 h-10 text-text-muted/30" />
          </div>
        )}
        
        {/* Play Button Overlay (Very subtle on mobile, visible on hover/playing) */}
        <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${isCurrentSong ? 'opacity-100 bg-black/40' : 'opacity-0 md:group-hover:opacity-100'}`}>
          {isPlaying ? (
            <div className="flex items-end gap-[3px] h-5">
              <span className="w-[4px] bg-white animate-eq-bar rounded-full shadow-sm" style={{ animationDelay: '0ms' }} />
              <span className="w-[4px] bg-white animate-eq-bar rounded-full shadow-sm" style={{ animationDelay: '150ms' }} />
              <span className="w-[4px] bg-white animate-eq-bar rounded-full shadow-sm" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
             <Play className="w-10 h-10 text-white fill-current drop-shadow-lg opacity-80" />
          )}
        </div>

        {/* Action Button (Context Menu Trigger) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e, song);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/40 text-white md:opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md z-10"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Selection Indicator */}
        {isSelectionMode && (
          <div className="absolute top-2 left-2 z-20">
            <div className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${
              isSelected ? 'bg-accent border-accent text-white' : 'bg-black/20 border-white/40 backdrop-blur-md'
            }`}>
              {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
            </div>
          </div>
        )}

        {/* Drag Handle for Grid (visible only when reordering) */}
        {onReorder && !isSelectionMode && (
          <div 
            {...listeners} 
            {...attributes}
            className="absolute top-2 left-2 z-20 p-1.5 rounded-full bg-black/40 text-white backdrop-blur-md cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="flex flex-col min-w-0 px-0.5 pointer-events-none">
        <h3 className={`text-[15px] font-medium truncate leading-tight ${isCurrentSong ? 'text-accent' : 'text-white'}`}>
          {song.title}
        </h3>
        <p className="text-[13px] text-[#8e8e93] truncate leading-tight mt-1">
          {song.artist}
        </p>
        
        {/* Badges row (Hidden on mobile grid to keep it clean like Apple Music) */}
        <div className="hidden md:flex items-center gap-2 mt-2">
          {song.bpm && (
            <span className="text-[9px] font-bold text-text-muted bg-background px-1.5 py-0.5 rounded border border-border">
              {song.bpm}
            </span>
          )}
          {moodConfig && (
            <span className="text-[10px] opacity-60">{moodConfig.emoji} {song.mood}</span>
          )}
        </div>
      </div>
    </div>
  );
});

SongGridItemUI.displayName = 'SongGridItemUI';

function SortableGridItem(props: any) {
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
    <SongGridItemUI
      {...props}
      ref={setNodeRef}
      style={style}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
    />
  );
}


export default function SongGrid({ songs, emptyMessage = 'No songs yet', isQueuePage, playlistId, onReorder }: SongGridProps) {
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
    
    // Position menu near cursor
    let x = e.clientX;
    let y = e.clientY;
    
    // Ensure menu stays within window bounds with padding
    const menuWidth = 220; 
    const menuHeight = 400; 
    const padding = 16;

    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
    }
    
    // Ensure it doesn't go negative
    x = Math.max(padding, x);
    y = Math.max(padding, y);
    
    setContextMenu({ x, y, song });
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
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-text-muted text-center">
        <Music2 className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium text-text-primary">{emptyMessage}</p>
        <p className="text-sm mt-2 opacity-60">Try adding some tracks to get started.</p>
      </div>
    );
  }

  const items = songs.map(s => s.id);
  const activeSong = activeId ? songs.find(s => s.id === activeId) : null;
  const activeIndex = activeSong ? songs.findIndex(s => s.id === activeId) : -1;

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
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 p-6 content-start">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={items}
            strategy={rectSortingStrategy}
          >
            {songs.map((song, index) => (
              <SortableGridItem
                key={song.id}
                song={song}
                index={index}
                state={state}
                coverArts={coverArts}
                onReorder={onReorder}
                handlePlay={(s: any, i: any, e: any) => handlePlay(s, i, e)}
                handleContextMenu={handleContextMenu}
                toggleFavorite={toggleFavorite}
                isSelected={selectedIds.has(song.id)}
                isSelectionMode={isSelectionMode}
              />
            ))}
          </SortableContext>
          
          <DragOverlay dropAnimation={dropAnimation}>
            {activeSong ? (
              <SongGridItemUI
                song={activeSong}
                index={activeIndex}
                state={state}
                coverArts={coverArts}
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
          className="fixed z-50 w-52 py-1 rounded-xl glass-strong animate-fade-in ring-1 ring-black/10"
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
            <Heart className={`w-4 h-4 ${contextMenu.song.favorite ? 'fill-pink-500 text-pink-500' : ''}`} />
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
        confirmLabel={confirmAction.type === 'delete' ? 'Delete' : 'Remove'}
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
          setConfirmAction({ ...confirmAction, isOpen: false });
        }}
        onCancel={() => setConfirmAction({ ...confirmAction, isOpen: false })}
      />
    </div>
  );
}

