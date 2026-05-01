import { useEffect, useState, useMemo } from 'react';
import * as db from '@/lib/db';
import { Song, MOOD_CONFIG, ALL_MOODS, MoodCategory } from '@/lib/types';
import { X, Activity, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';

interface SongAnalysisDetailProps {
  songId: string;
  onClose: () => void;
}

export default function SongAnalysisDetail({ songId, onClose }: SongAnalysisDetailProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const { refreshSongs } = useLibrary();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    db.getSong(songId).then(data => {
      setSong(data || null);
      setLoading(false);
    });
  }, [songId]);

  const handleOverrideMood = async (newMood: MoodCategory) => {
    if (!song) return;
    
    // Update the song object locally
    const updated = { ...song, mood: newMood, moodConfidence: 1 };
    
    // Save to database using updateSongMeta
    await db.updateSongMeta(song.id, { mood: newMood, moodConfidence: 1 });
    
    setSong(updated);
    refreshSongs();
    setIsDropdownOpen(false);
  };

  const radarData = useMemo(() => {
    if (!song?.audioFeatures) return [];
    const f = song.audioFeatures;
    return [
      { label: 'Energy', value: Math.min(1, Number(f.energy) || 0) },
      { label: 'Brightness', value: Math.min(1, (Number(f.spectralCentroid) || 0) / 80) }, // Centroid usually ~30-80
      { label: 'Noisiness', value: Math.min(1, (Number(f.spectralFlatness) || 0) * 2) }, // Flatness is often low
      { label: 'Percussive', value: Math.min(1, (Number(f.zcr) || 0) / 100) }, // ZCR is usually < 100
      { label: 'Sharpness', value: Math.min(1, (Number(f.perceptualSharpness) || 0) * 1.5) }
    ];
  }, [song]);

  // Radar chart SVG generation
  const size = 200;
  const center = size / 2;
  const radius = (size / 2) - 30; // padding for labels

  const getPoint = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = value * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const polygonPoints = radarData
    .map((d, i) => {
      const p = getPoint(d.value, i, radarData.length);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const gridPolygons = [0.25, 0.5, 0.75, 1].map(scale => {
    return radarData.map((_, i) => {
      const p = getPoint(scale, i, radarData.length);
      return `${p.x},${p.y}`;
    }).join(' ');
  });

  if (loading) {
    return (
      <div className="bg-surface/90 backdrop-blur-3xl rounded-3xl border border-border shadow-2xl p-12 w-full max-w-md mx-auto flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!song) return null;

  const moodConfig = song.mood ? MOOD_CONFIG[song.mood] : null;

  return (
    <div className="bg-surface/95 backdrop-blur-3xl rounded-3xl border border-border shadow-2xl p-6 w-full max-w-md mx-auto flex flex-col gap-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Background glow based on mood */}
      {moodConfig && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle at top right, ${moodConfig.color}, transparent 60%)` }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary leading-tight">Audio Analysis</h2>
            <p className="text-xs text-text-muted truncate max-w-[200px]">{song.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!song.analyzed || !song.audioFeatures ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-12 h-12 text-text-muted mb-4 opacity-50" />
          <p className="text-text-primary font-medium">Not Analyzed Yet</p>
          <p className="text-sm text-text-muted mt-1">Please wait for the background analysis to complete.</p>
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex-1 bg-background/50 border border-border rounded-2xl p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-accent">{Math.round(song.bpm || 0)}</span>
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider mt-1">BPM</span>
            </div>
            
            <div className="flex-1 bg-background/50 border border-border rounded-2xl p-4 flex flex-col items-center justify-center relative">
              <span className="text-3xl mb-1">{moodConfig?.emoji || '❓'}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-text-primary">{song.mood || 'Unknown'}</span>
              </div>
              {song.moodConfidence && (
                <div className="w-full bg-surface rounded-full h-1 mt-3 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${moodConfig?.gradient || 'from-gray-500 to-gray-400'}`}
                    style={{ width: `${song.moodConfidence * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Radar Chart */}
          <div className="relative w-full flex justify-center py-4 z-10">
            <svg width={size} height={size} className="overflow-visible">
              {/* Grid */}
              {gridPolygons.map((points, i) => (
                <polygon 
                  key={i} 
                  points={points} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="1" 
                />
              ))}
              
              {/* Axes */}
              {radarData.map((_, i) => {
                const p = getPoint(1, i, radarData.length);
                return (
                  <line 
                    key={i} 
                    x1={center} 
                    y1={center} 
                    x2={p.x} 
                    y2={p.y} 
                    stroke="rgba(255,255,255,0.1)" 
                    strokeWidth="1" 
                  />
                );
              })}

              {/* Data Polygon */}
              <polygon 
                points={polygonPoints} 
                fill={moodConfig ? `${moodConfig.color}40` : "rgba(139, 92, 246, 0.4)"}
                stroke={moodConfig?.color || "#8b5cf6"}
                strokeWidth="2" 
                className="transition-all duration-500"
              />

              {/* Data Points & Labels */}
              {radarData.map((d, i) => {
                const p = getPoint(d.value, i, radarData.length);
                const labelP = getPoint(1.2, i, radarData.length); // Push labels further out
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3" fill={moodConfig?.color || "#8b5cf6"} />
                    <text 
                      x={labelP.x} 
                      y={labelP.y} 
                      fontSize="10" 
                      fill="currentColor" 
                      className="text-text-muted font-medium"
                      textAnchor="middle" 
                      dominantBaseline="middle"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mood Override Dropdown */}
          <div className="mt-2 relative z-20">
            <label className="text-xs font-medium text-text-muted mb-2 block">Correct Mood Category</label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-background border border-border text-text-primary text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{moodConfig?.emoji}</span>
                  <span>{song.mood}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {ALL_MOODS.map((m) => {
                      const cfg = MOOD_CONFIG[m];
                      return (
                        <button
                          key={m}
                          onClick={() => handleOverrideMood(m)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-surface ${
                            song.mood === m ? 'text-accent bg-accent/10 font-medium' : 'text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{cfg.emoji}</span>
                            <span>{m}</span>
                          </div>
                          {song.mood === m && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
