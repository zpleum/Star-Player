'use client';
// ============================================================
// Star Player — Audio Analysis Hook
// ============================================================
import { useState, useCallback } from 'react';
import type { AnalysisState } from '@/lib/types';
import * as db from '@/lib/db';
import { useLibrary } from '@/contexts/LibraryContext';

export function useAudioAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    progress: 0,
    currentSongId: null,
    currentSongTitle: null,
    totalSongs: 0,
    analyzedCount: 0,
    error: null,
  });

  const { refreshSongs } = useLibrary();

  const analyzeSong = async (id: string, title: string) => {
    setState((prev) => ({
      ...prev,
      status: 'analyzing',
      currentSongId: id,
      currentSongTitle: title,
      error: null,
    }));

    try {
      const audioBlob = await db.getSongAudioData(id);
      if (!audioBlob) throw new Error('Audio data not found');

      // Dynamically import to keep bundle small when not analyzing
      const { analyzeAudio } = await import('@/lib/audioAnalyzer');
      const result = await analyzeAudio(audioBlob);

      await db.updateSongAnalysis(id, {
        bpm: result.features.bpm,
        mood: result.mood.mood,
        moodConfidence: result.mood.confidence,
        audioFeatures: result.features,
      });

      setState((prev) => ({
        ...prev,
        status: 'done',
        progress: 100,
        analyzedCount: prev.analyzedCount + 1,
      }));
      
      await refreshSongs();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to analyze song ${id}:`, error);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  };

  const analyzeAll = async () => {
    const unanalyzed = await db.getUnanalyzedSongs();
    if (unanalyzed.length === 0) {
       setState((prev) => ({ ...prev, status: 'done', totalSongs: 0, analyzedCount: 0 }));
       return;
    }

    setState((prev) => ({
      ...prev,
      status: 'analyzing',
      totalSongs: unanalyzed.length,
      analyzedCount: 0,
      progress: 0,
      error: null,
    }));

    for (let i = 0; i < unanalyzed.length; i++) {
      const song = unanalyzed[i];
      
      // Update state for current song
      setState((prev) => ({
        ...prev,
        currentSongId: song.id,
        currentSongTitle: song.title,
        progress: Math.round((i / unanalyzed.length) * 100),
      }));

      // Await a small timeout to let React render progress updates
      await new Promise(resolve => setTimeout(resolve, 50));

      const success = await analyzeSong(song.id, song.title);
      if (!success) {
        // Decide if we want to abort or continue. Continuing is usually better for batch.
        console.warn(`Skipping ${song.title} due to analysis error.`);
      }
    }

    setState((prev) => ({
      ...prev,
      status: 'done',
      progress: 100,
      currentSongId: null,
      currentSongTitle: null,
    }));
    
    await refreshSongs();
  };

  const cancelAnalysis = useCallback(() => {
    // We can't strictly cancel a running offline context easily here without a worker,
    // but we can stop the loop in analyzeAll by setting a flag if we implement one.
    // For now, we just reset the UI state.
    setState((prev) => ({
      ...prev,
      status: 'idle',
      currentSongId: null,
      currentSongTitle: null,
      progress: 0,
    }));
  }, []);

  return {
    state,
    analyzeSong,
    analyzeAll,
    cancelAnalysis,
  };
}
