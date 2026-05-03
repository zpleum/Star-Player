// ============================================================
// Star Player — Audio Analyzer (Meyda + BPM Detection)
// ============================================================
import type { AudioFeatures } from './types';
import { classifyMood } from './moodClassifier';

/**
 * Analyzes an audio blob and returns extracted features + mood classification.
 * Runs entirely offline in the browser using OfflineAudioContext.
 */
export async function analyzeAudio(audioBlob: Blob): Promise<{
  features: AudioFeatures;
  mood: ReturnType<typeof classifyMood>;
}> {
  // 1. Decode audio blob to AudioBuffer
  // Check size first to prevent browser crash
  if (audioBlob.size > 250 * 1024 * 1024) {
    throw new Error('File too large for analysis (>250MB). Browser may run out of memory.');
  }

  let arrayBuffer: ArrayBuffer | null = await audioBlob.arrayBuffer();
  
  // Use standard AudioContext for decoding (more robust than OfflineAudioContext in some browsers)
  const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
  const tempCtx = new AudioContextClass();
  
  try {
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    
    // Clear arrayBuffer immediately to free memory
    arrayBuffer = null;
    
    // 2. Extract features using Meyda
    const features = await extractFeatures(audioBuffer);

    // 3. Detect BPM
    const bpm = await detectBPM(audioBuffer);
    features.bpm = bpm;

    // 4. Classify mood
    const mood = classifyMood(features);

    return { features, mood };
  } catch (err) {
    console.error('Audio decoding error details:', {
      name: (err as Error).name,
      message: (err as Error).message,
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
    });

    if (err instanceof Error && (err.name === 'EncodingError' || err.message.includes('decode'))) {
      throw new Error(`Unable to decode audio (${(audioBlob.size / 1024 / 1024).toFixed(1)}MB). The format might be unsupported or the file corrupted.`);
    }
    throw err;
  } finally {
    // Always clean up the temporary context
    if (tempCtx.state !== 'closed') {
      await tempCtx.close().catch(() => {});
    }
  }
}

async function extractFeatures(buffer: AudioBuffer): Promise<AudioFeatures> {
  // Dynamic import Meyda (it expects browser environment)
  const Meyda = (await import('meyda')).default;

  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const bufferSize = 2048;
  const hopSize = bufferSize; // non-overlapping frames

  const totalFrames = Math.floor(channelData.length / hopSize);
  // Sample up to 200 frames spread across the song for efficiency
  const maxFrames = Math.min(totalFrames, 200);
  const frameStep = Math.max(1, Math.floor(totalFrames / maxFrames));

  const featureAccumulator = {
    rms: [] as number[],
    energy: [] as number[],
    spectralCentroid: [] as number[],
    spectralFlatness: [] as number[],
    zcr: [] as number[],
    loudness: [] as number[],
    spectralRolloff: [] as number[],
    mfcc: [] as number[][],
    perceptualSpread: [] as number[],
    perceptualSharpness: [] as number[],
  };

  for (let i = 0; i < totalFrames; i += frameStep) {
    const start = i * hopSize;
    const end = Math.min(start + bufferSize, channelData.length);
    const frame = channelData.slice(start, end);

    // Pad if needed
    const paddedFrame = new Float32Array(bufferSize);
    paddedFrame.set(frame);

    try {
      Meyda.sampleRate = sampleRate;
      Meyda.bufferSize = bufferSize;
      const extracted = Meyda.extract(
        [
          'rms',
          'energy',
          'spectralCentroid',
          'spectralFlatness',
          'zcr',
          'loudness',
          'spectralRolloff',
          'mfcc',
          'perceptualSpread',
          'perceptualSharpness',
        ],
        paddedFrame
      );

      if (extracted) {
        if (typeof extracted.rms === 'number') featureAccumulator.rms.push(extracted.rms);
        if (typeof extracted.energy === 'number') featureAccumulator.energy.push(extracted.energy);
        if (typeof extracted.spectralCentroid === 'number')
          featureAccumulator.spectralCentroid.push(extracted.spectralCentroid);
        if (typeof extracted.spectralFlatness === 'number')
          featureAccumulator.spectralFlatness.push(extracted.spectralFlatness);
        if (typeof extracted.zcr === 'number') featureAccumulator.zcr.push(extracted.zcr);
        if (extracted.loudness && typeof extracted.loudness === 'object' && 'total' in extracted.loudness)
          featureAccumulator.loudness.push((extracted.loudness as { total: number }).total);
        if (typeof extracted.spectralRolloff === 'number')
          featureAccumulator.spectralRolloff.push(extracted.spectralRolloff);
        if (Array.isArray(extracted.mfcc)) featureAccumulator.mfcc.push(extracted.mfcc as number[]);
        if (typeof extracted.perceptualSpread === 'number')
          featureAccumulator.perceptualSpread.push(extracted.perceptualSpread);
        if (typeof extracted.perceptualSharpness === 'number')
          featureAccumulator.perceptualSharpness.push(extracted.perceptualSharpness);
      }
    } catch {
      // Skip frames that fail to extract
    }
  }

  // Aggregate: compute mean of each feature
  const mean = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  // Mean MFCCs
  const mfccMean = featureAccumulator.mfcc.length > 0
    ? featureAccumulator.mfcc[0].map((_, i) =>
        mean(featureAccumulator.mfcc.map((m) => m[i] || 0))
      )
    : [];

  return {
    bpm: 0, // will be filled by BPM detector
    energy: mean(featureAccumulator.rms),
    spectralCentroid: mean(featureAccumulator.spectralCentroid),
    spectralFlatness: mean(featureAccumulator.spectralFlatness),
    zcr: mean(featureAccumulator.zcr),
    loudness: mean(featureAccumulator.loudness),
    spectralRolloff: mean(featureAccumulator.spectralRolloff),
    mfcc: mfccMean,
    perceptualSpread: mean(featureAccumulator.perceptualSpread),
    perceptualSharpness: mean(featureAccumulator.perceptualSharpness),
  };
}

async function detectBPM(buffer: AudioBuffer): Promise<number> {
  try {
    const { analyze } = await import('web-audio-beat-detector');
    const bpm = await analyze(buffer);
    return Math.round(bpm);
  } catch {
    // Fallback: estimate from energy peaks
    return estimateBPMFromEnergy(buffer);
  }
}

/**
 * Simple fallback BPM estimator using energy peak detection.
 */
function estimateBPMFromEnergy(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  const energies: number[] = [];

  for (let i = 0; i < data.length - windowSize; i += windowSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += data[j] * data[j];
    }
    energies.push(sum / windowSize);
  }

  // Find peaks (simple threshold-based)
  const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
  const threshold = meanEnergy * 1.5;
  const peaks: number[] = [];

  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      peaks.push(i);
    }
  }

  if (peaks.length < 2) return 120; // default

  // Calculate average interval between peaks
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) * 0.05); // seconds
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60 / avgInterval);

  // Clamp to reasonable range
  return Math.max(40, Math.min(220, bpm));
}
