'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';

type VisualizerMode = 'bars' | 'wave' | 'circular';
const MODES: VisualizerMode[] = ['bars', 'wave', 'circular'];

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  className?: string;
}

export default function Visualizer({ analyser, isPlaying, className = '' }: VisualizerProps) {
  const { state: playerState } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [modeIndex, setModeIndex] = useState(0);
  const isPlayingRef = useRef(isPlaying);
  
  const mode = MODES[modeIndex];

  // Helper to add alpha to hex color
  const hexToRgba = (hex: string, alpha: number) => {
    if (!hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handleCanvasClick = () => {
    setModeIndex((prev) => (prev + 1) % MODES.length);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use current accent colors
    const primaryColor = playerState.accentColor;
    const secondaryColor = playerState.accentColor2;

    // Cancel any existing loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    
    // Arrays for smoothing
    const smoothedFreq = new Float32Array(bufferLength);
    const smoothedTime = new Float32Array(bufferLength).fill(128);

    const renderFrame = () => {
      animFrameRef.current = requestAnimationFrame(renderFrame);
      
      const playing = isPlayingRef.current;

      if (playing) {
        if (mode === 'bars' || mode === 'circular') {
          analyser.getByteFrequencyData(freqData);
        } else if (mode === 'wave') {
          analyser.getByteTimeDomainData(timeData);
        }
      } else {
        // Target is zero (or 128 for time domain) when paused
        if (mode === 'bars' || mode === 'circular') {
          freqData.fill(0);
        } else if (mode === 'wave') {
          timeData.fill(128);
        }
      }

      let isAnimating = false;
      const easing = 0.50; // Sensitivity

      ctx.clearRect(0, 0, width, height);

      if (mode === 'bars') {
        const barCount = 32; // Use half for symmetry
        const barWidth = width / (barCount * 2);
        const step = Math.floor(bufferLength / barCount);
        const centerX = width / 2;

        for (let i = 0; i < barCount; i++) {
          const targetValue = freqData[i * step];
          smoothedFreq[i * step] += (targetValue - smoothedFreq[i * step]) * easing;
          
          if (Math.abs(targetValue - smoothedFreq[i * step]) > 0.5) isAnimating = true;

          const value = smoothedFreq[i * step];
          const barHeight = Math.max((value / 255) * height * 1.0, playing ? 2 : 0);
          const y = height - barHeight;

          ctx.fillStyle = hexToRgba(primaryColor, 0.8);
          
          const xRight = centerX + (i * barWidth);
          ctx.fillRect(xRight + 1, y, barWidth - 2, barHeight);

          const xLeft = centerX - ((i + 1) * barWidth);
          ctx.fillRect(xLeft + 1, y, barWidth - 2, barHeight);
        }
      } 
      else if (mode === 'wave') {
        ctx.lineWidth = 4;
        ctx.strokeStyle = primaryColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const targetValue = timeData[i];
          smoothedTime[i] += (targetValue - smoothedTime[i]) * easing;
          
          if (Math.abs(targetValue - smoothedTime[i]) > 0.5) isAnimating = true;

          const v = smoothedTime[i] / 128.0; 
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } 
      else if (mode === 'circular') {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(centerX, centerY) - 5;
        const innerRadius = maxRadius * 0.4;
        
        // Calculate average volume for pulsing effect
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += freqData[i];
        const avg = sum / bufferLength;
        const pulse = (avg / 255) * 15;

        // Draw central core pulse
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 5 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(primaryColor, 0.3);
        ctx.fill();

        const barCount = 120; // More bars for a smoother look
        const step = Math.floor(bufferLength / barCount);
        const time = Date.now() / 2000; // Slow rotation

        for (let i = 0; i < barCount; i++) {
          const targetValue = freqData[i * step] || 0;
          smoothedFreq[i * step] = smoothedFreq[i * step] || 0;
          smoothedFreq[i * step] += (targetValue - smoothedFreq[i * step]) * easing;
          
          if (Math.abs(targetValue - smoothedFreq[i * step]) > 0.5) isAnimating = true;

          const value = smoothedFreq[i * step];
          const amplitude = (value / 255) * (maxRadius - innerRadius);
          
          // Add a bit of movement to the angle
          const angle = (i * 2 * Math.PI) / barCount + time;

          const x1 = centerX + Math.cos(angle) * (innerRadius + pulse);
          const y1 = centerY + Math.sin(angle) * (innerRadius + pulse);
          const x2 = centerX + Math.cos(angle) * (innerRadius + pulse + amplitude + 2);
          const y2 = centerY + Math.sin(angle) * (innerRadius + pulse + amplitude + 2);

          ctx.strokeStyle = hexToRgba(primaryColor, 0.9);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          
          // Thicker bars for lower frequencies
          const baseWidth = 2;
          ctx.lineWidth = baseWidth + (1 - i / barCount) * 2;
          
          ctx.strokeStyle = hexToRgba(primaryColor, 0.9);
          ctx.lineCap = 'round';
          
          ctx.stroke();
        }
        
        // Draw a faint outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(primaryColor, 0.15);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (!playing && !isAnimating) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };

    renderFrame();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [analyser, mode, playerState.accentColor, playerState.accentColor2]);

  useEffect(() => {
    const cleanup = draw();
    return cleanup;
  }, [draw]);

  useEffect(() => {
    if (isPlaying && !animFrameRef.current) {
      draw();
    }
  }, [isPlaying, draw]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`cursor-pointer transition-opacity hover:opacity-80 ${className}`} 
      onClick={handleCanvasClick}
      title="Click to change visualizer mode"
    />
  );
}
