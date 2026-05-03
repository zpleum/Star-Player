'use client';
import { usePlayer } from '@/contexts/PlayerContext';
import React from 'react';

export default function AmbientBackground() {
  const { state } = usePlayer();
  const { dynamicBackgroundEnabled } = state;

  return (
    <div 
      className="fixed inset-0 pointer-events-none transition-opacity duration-1000 ease-in-out z-[-1]"
      style={{
        opacity: dynamicBackgroundEnabled ? 0.25 : 0,
        background: `
          radial-gradient(circle at var(--accent-pos-1-x) var(--accent-pos-1-y), var(--accent) 0%, transparent 50%),
          radial-gradient(circle at var(--accent-pos-2-x) var(--accent-pos-2-y), var(--accent-2) 0%, transparent 50%),
          radial-gradient(circle at var(--accent-pos-3-x) var(--accent-pos-3-y), var(--accent-3) 0%, transparent 50%),
          radial-gradient(circle at var(--accent-pos-4-x) var(--accent-pos-4-y), var(--accent-4) 0%, transparent 50%),
          radial-gradient(circle at var(--accent-pos-5-x) var(--accent-pos-5-y), var(--accent-5) 0%, transparent 50%)
        `
      }}
    />
  );
}
