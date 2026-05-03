import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { MOOD_CONFIG, type SongMeta, type MoodCategory } from '@/lib/types';
import { Play, Music2, Heart, GripVertical, ListPlus, Trash2, MoreVertical, Video, Plus, Brain } from 'lucide-react';
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
      className={`group relative flex flex-col gap-3 p-4 rounded-2xl bg-surface/50 border border-border/50 transition-all duration-300 ${
        isDragging && !isOverlay ? 'opacity-30 border-transparent' : 
        isSelected ? 'bg-accent/20 border-accent/40' : 'hover:bg-surface-hover hover:border-border'
      } ${isOverlay ? 'bg-surface-hover scale-105 border-accent/50 z-50 ring-1 ring-black/10' : ''} ${
        onReorder ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
      onClick={(e) => {
        handlePlay(song, index, e);
      }}
      onContextMenu={(e) => handleContextMenu(e, song)}
    >
      {/* Selection / Drag handle indicator */}
      {!isDragging && (
        <div 
          className={`absolute top-2 left-2 z-20 flex items-center justify-center transition-all duration-200 ${
            isSelectionMode 
              ? 'w-6 h-6 rounded-lg bg-accent' 
              : 'p-1.5 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 backdrop-blur-sm'
          }`}
          onClick={(e) => {
            if (isSelectionMode) {
              e.stopPropagation();
              handlePlay(song, index, e);
            }
          }}
        >
          {isSelectionMode ? (
            <div className="w-3 h-3 rounded-sm border border-white flex items-center justify-center bg-white/20">
              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
            </div>
          ) : onReorder ? (
            <GripVertical className="w-4 h-4 text-white" />
          ) : null}
        </div>
      )}

      {/* Cover Art Wrapper */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-background">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-10 h-10 text-text-muted/50" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${isCurrentSong ? 'opacity-100 bg-black/50' : ''}`}>
          <div className={`w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 ${isCurrentSong ? 'translate-y-0' : ''}`}>
            {isPlaying ? (
              <div className="flex items-end gap-[2px] h-4">
                <span className="w-[3px] bg-white animate-eq-bar rounded-full" style={{ animationDelay: '0ms' }} />
                <span className="w-[3px] bg-white animate-eq-bar rounded-full" style={{ animationDelay: '150ms' }} />
                <span className="w-[3px] bg-white animate-eq-bar rounded-full" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <Play className="w-6 h-6 ml-1 fill-current" />
            )}
          </div>
        </div>

        {/* Top-Right Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
          }}
          className={`absolute top-2 right-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-opacity duration-200 backdrop-blur-sm z-10 ${song.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Heart className={`w-4 h-4 ${song.favorite ? 'fill-pink-500 text-pink-500' : ''}`} />
        </button>

        {/* Action Button (Context Menu Trigger) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e, song);
          }}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm z-10"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Song Info */}
      <div className="flex flex-col gap-1 min-w-0 px-1 pointer-events-none">
        <h3 className={`text-base font-bold truncate ${isCurrentSong ? 'text-accent' : 'text-text-primary'}`}>
          {song.title}
        </h3>
        <p className="text-sm text-text-secondary truncate">
          {song.artist}
        </p>
        
        {/* Badges row */}
        <div className="flex items-center gap-2 mt-1">
          {song.bpm && (
            <span className="text-[10px] font-medium text-text-muted bg-background px-2 py-0.5 rounded-full border border-border">
              {song.bpm}
            </span>
          )}
          {moodConfig && (
            <span 
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{ 
                background: `${moodConfig.color}15`, 
                color: moodConfig.color,
                borderColor: `${moodConfig.color}30`
              }}
            >
              {moodConfig.emoji} {song.mood}
            </span>
          )}
          {song.source === 'youtube' ? (
            <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
              <Video className="w-2.5 h-2.5" /> YouTube
            </span>
          ) : (
            <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
              <Plus className="w-2.5 h-2.5" /> Upload
            </span>
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
    
    // Ensure menu stays within window bounds
    const menuWidth = 208; // w-52 = 13rem = 208px
    const menuHeight = 300; // rough estimate
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    
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
      <div className="flex flex-col items-center justify-center py-20 text-text-muted h-full">
        <Music2 className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">{emptyMessage}</p>
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

