import { usePlayer } from '@/contexts/PlayerContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { MOOD_CONFIG, type SongMeta, type MoodCategory } from '@/lib/types';
import { Play, Music2, Heart, GripVertical } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  onReorder?: (startIndex: number, endIndex: number) => void;
}

const SongGridItemUI = React.forwardRef<HTMLDivElement, any>(({
  song, index, state, coverArts, onReorder, handlePlay, toggleFavorite,
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
      {...(onReorder ? listeners : {})}
      className={`group relative flex flex-col gap-3 p-4 rounded-2xl bg-surface/50 border border-border/50 transition-all duration-300 ${
        isDragging && !isOverlay ? 'opacity-30 border-transparent' : 'hover:bg-surface-hover hover:border-border'
      } ${isOverlay ? 'bg-surface-hover shadow-2xl scale-105 border-accent/50 z-50 ring-1 ring-black/10' : ''} ${
        onReorder ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
      onClick={(e) => {
        // Prevent play if we just finished dragging, but PointerSensor handles this natively
        handlePlay(song, index);
      }}
    >
      {/* Drag handle indicator (optional, just for visual cue) */}
      {onReorder && !isDragging && (
        <div className="absolute top-2 left-2 p-1.5 rounded-full bg-black/20 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-sm pointer-events-none">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Cover Art Wrapper */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-background shadow-lg">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-10 h-10 text-text-muted/50" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${isCurrentSong ? 'opacity-100 bg-black/50' : ''}`}>
          <div className={`w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 ${isCurrentSong ? 'translate-y-0' : ''}`}>
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
          className="absolute top-2 right-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm z-10"
        >
          <Heart className={`w-4 h-4 ${song.favorite ? 'fill-pink-500 text-pink-500' : ''}`} />
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


export default function SongGrid({ songs, emptyMessage = 'No songs yet', onReorder }: SongGridProps) {
  const { state, playSong } = usePlayer();
  const { toggleFavorite, getCoverArtUrl } = useLibrary();
  const [coverArts, setCoverArts] = useState<Map<string, string>>(new Map());
  
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
      // Load first 50 covers for now
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

  const handlePlay = useCallback((song: SongMeta, index: number) => {
    playSong(song, songs, index);
  }, [playSong, songs]);

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
    <div className="h-full overflow-y-auto">
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
                handlePlay={handlePlay}
                toggleFavorite={toggleFavorite}
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
                toggleFavorite={() => {}}
                isDragging={true}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
