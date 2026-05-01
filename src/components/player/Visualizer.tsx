import { useEffect, useRef, useCallback, useState } from 'react';

type VisualizerMode = 'bars' | 'wave' | 'circular';
const MODES: VisualizerMode[] = ['bars', 'wave', 'circular'];

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  className?: string;
}

export default function Visualizer({ analyser, isPlaying, className = '' }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [modeIndex, setModeIndex] = useState(0);
  const isPlayingRef = useRef(isPlaying);
  
  const mode = MODES[modeIndex];

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
      const easing = 0.15; // Smoothness factor

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
          // Add some smoothing/minimum height when playing, else 0
          const barHeight = Math.max((value / 255) * height * 0.8, playing ? 2 : 0);
          const y = height - barHeight;

          const gradient = ctx.createLinearGradient(0, y, 0, height);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)'); // accent
          gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.6)'); // pink
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)');

          ctx.fillStyle = gradient;
          
          // Draw right side
          const xRight = centerX + (i * barWidth);
          ctx.fillRect(xRight + 1, y, barWidth - 2, barHeight);

          // Draw left side (mirrored)
          const xLeft = centerX - ((i + 1) * barWidth);
          ctx.fillRect(xLeft + 1, y, barWidth - 2, barHeight);
        }
      } 
      else if (mode === 'wave') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)'; // pink
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const targetValue = timeData[i];
          smoothedTime[i] += (targetValue - smoothedTime[i]) * easing;
          
          if (Math.abs(targetValue - smoothedTime[i]) > 0.5) isAnimating = true;

          const v = smoothedTime[i] / 128.0; // 128 is center
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
        const maxRadius = Math.min(centerX, centerY) - 10;
        const innerRadius = maxRadius * 0.3;

        const barCount = 64;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const targetValue = freqData[i * step];
          smoothedFreq[i * step] += (targetValue - smoothedFreq[i * step]) * easing;
          
          if (Math.abs(targetValue - smoothedFreq[i * step]) > 0.5) isAnimating = true;

          const value = smoothedFreq[i * step];
          const amplitude = (value / 255) * (maxRadius - innerRadius);
          const angle = (i * 2 * Math.PI) / barCount;

          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * (innerRadius + amplitude);
          const y2 = centerY + Math.sin(angle) * (innerRadius + amplitude);

          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.8)');

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = 3;
          ctx.strokeStyle = gradient;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Stop animation loop if fully paused and returned to resting state
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
  }, [analyser, mode]);

  useEffect(() => {
    // Start drawing when component mounts or analyser changes
    const cleanup = draw();
    return cleanup;
  }, [draw]);

  useEffect(() => {
    // If we start playing again but the loop was stopped, restart it
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
