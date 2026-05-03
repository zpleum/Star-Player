'use client';
// ============================================================
// Star Player — Mood Badge Component
// ============================================================
import { MOOD_CONFIG, type MoodCategory } from '@/lib/types';
import { useLibrary } from '@/contexts/LibraryContext';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface MoodBadgeProps {
  songId: string;
  mood: MoodCategory | null;
  confidence?: number | null;
  bpm?: number | null;
  className?: string;
}

export default function MoodBadge({ songId, mood, confidence, bpm, className = '' }: MoodBadgeProps) {
  const { updateSongMood } = useLibrary();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (!mood) return null;

  const config = MOOD_CONFIG[mood];

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95"
        style={{
          backgroundColor: `${config.color}15`,
          borderColor: `${config.color}30`,
          color: config.color,
        }}
        title={confidence ? `Confidence: ${Math.round(confidence * 100)}%${bpm ? ` • ${bpm} BPM` : ''}` : ''}
      >
        <span>{config.emoji}</span>
        <span>{mood}</span>
        <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50 w-48 py-1 rounded-xl glass-strong border border-border animate-fade-in text-left">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Override Mood</p>
          </div>
          {(Object.entries(MOOD_CONFIG) as [MoodCategory, typeof MOOD_CONFIG[MoodCategory]][]).map(([m, c]) => (
            <button
              key={m}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                m === mood ? 'bg-surface-hover text-text-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                updateSongMood(songId, m);
                setIsOpen(false);
              }}
            >
              <span className="w-5">{c.emoji}</span>
              <span>{m}</span>
              {m === mood && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
