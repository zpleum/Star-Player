// ============================================================
// Star Player — Mood Classifier (Rule-based with Fuzzy Scoring)
// ============================================================
import type { AudioFeatures, MoodCategory } from './types';

interface MoodScore {
  mood: MoodCategory;
  score: number;
}

// Normalize a value between min and max to 0-1 range
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Gaussian-like scoring function — peaks at 'center' with given 'width'
function gaussianScore(value: number, center: number, width: number): number {
  const diff = value - center;
  return Math.exp(-(diff * diff) / (2 * width * width));
}

// Score how well features match a given BPM range
function bpmRangeScore(bpm: number, min: number, max: number): number {
  if (bpm >= min && bpm <= max) return 1.0;
  if (bpm < min) return Math.max(0, 1 - (min - bpm) / 30);
  return Math.max(0, 1 - (bpm - max) / 30);
}

export function classifyMood(features: AudioFeatures): { mood: MoodCategory; confidence: number } {
  const { bpm, energy, spectralCentroid, spectralFlatness, zcr } = features;

  // Normalize features to 0-1 range (approximate typical ranges)
  const normEnergy = normalize(energy, 0, 1);
  const normCentroid = normalize(spectralCentroid, 0, 256); // half of typical 512 fft
  const normZcr = normalize(zcr, 0, 128);
  const normFlatness = normalize(spectralFlatness, 0, 1);

  const scores: MoodScore[] = [
    // 🎉 Fun — Party: BPM 120-145, high energy, bright, high ZCR
    {
      mood: 'Fun',
      score:
        bpmRangeScore(bpm, 120, 145) * 0.35 +
        gaussianScore(normEnergy, 0.75, 0.2) * 0.30 +
        gaussianScore(normCentroid, 0.7, 0.25) * 0.20 +
        gaussianScore(normZcr, 0.65, 0.25) * 0.15,
    },
    // 😢 Sad — Sad: BPM <100, low energy, dark (low centroid)
    {
      mood: 'Sad',
      score:
        bpmRangeScore(bpm, 50, 100) * 0.35 +
        gaussianScore(normEnergy, 0.25, 0.2) * 0.30 +
        gaussianScore(normCentroid, 0.3, 0.2) * 0.20 +
        gaussianScore(normZcr, 0.25, 0.2) * 0.15,
    },
    // 💼 Work — Focus: BPM 90-120, moderate energy, stable
    {
      mood: 'Work',
      score:
        bpmRangeScore(bpm, 90, 120) * 0.35 +
        gaussianScore(normEnergy, 0.45, 0.15) * 0.30 +
        gaussianScore(normCentroid, 0.5, 0.2) * 0.20 +
        gaussianScore(normFlatness, 0.4, 0.2) * 0.15,
    },
    // 🌊 Chill — Chill: BPM 70-110, low-med energy, warm
    {
      mood: 'Chill',
      score:
        bpmRangeScore(bpm, 70, 110) * 0.35 +
        gaussianScore(normEnergy, 0.35, 0.2) * 0.30 +
        gaussianScore(normCentroid, 0.4, 0.2) * 0.20 +
        gaussianScore(normZcr, 0.35, 0.2) * 0.15,
    },
    // 🏋️ Workout — Workout: BPM >145, very high energy
    {
      mood: 'Workout',
      score:
        bpmRangeScore(bpm, 145, 200) * 0.35 +
        gaussianScore(normEnergy, 0.85, 0.15) * 0.30 +
        gaussianScore(normCentroid, 0.75, 0.2) * 0.20 +
        gaussianScore(normZcr, 0.7, 0.2) * 0.15,
    },
  ];

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const bestScore = scores[0];
  const secondBest = scores[1];

  // Confidence = how much better the best is than the second best
  const confidence = Math.min(1, bestScore.score / Math.max(0.01, bestScore.score + secondBest.score));

  return {
    mood: bestScore.mood,
    confidence: Math.round(confidence * 100) / 100,
  };
}
