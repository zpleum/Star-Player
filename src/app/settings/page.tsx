'use client';
// ============================================================
// Star Player — Settings & Storage Management
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import * as db from '@/lib/db';
import { 
  Settings as SettingsIcon, 
  Brain, 
  HardDrive, 
  Database,
  AlertTriangle,
  Search,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  FileAudio,
  Music2,
  Play,
  Heart,
  MoreVertical,
  Plus,
  Trash2,
  Video
} from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Checkbox from '@/components/ui/Checkbox';

interface SongSize {
  id: string;
  title: string;
  artist: string;
  size: number;
  analyzed: boolean;
  source?: 'upload' | 'youtube';
}

export default function SettingsPage() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: SongSize } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { songs, refreshSongs, showToast, deleteSong, importFiles, getCoverArtUrl, toggleFavorite, showErrorPopup } = useLibrary();
  const { playSong, state: playerState, toggleDynamicBackground, setAccentColor } = usePlayer();
  const { state: analysisState, analyzeAll, analyzeSong } = useAudioAnalysis();

  const [storage, setStorage] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [songSizes, setSongSizes] = useState<SongSize[]>([]);
  const [coverArts, setCoverArts] = useState<Map<string, string>>(new Map());
  const [loadingSizes, setLoadingSizes] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<import('@/lib/types').AppSettings | null>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);

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

  const handleContextMenu = (e: React.MouseEvent, song: SongSize) => {
    e.preventDefault();
    e.stopPropagation();
    
    let x = e.clientX;
    let y = e.clientY;
    
    const menuWidth = 208;
    const menuHeight = 250;
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    
    setContextMenu({ x, y, song });
  };

  // Sync height of Storage Manager with Sidebar
  useEffect(() => {
    if (!sidebarRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSidebarHeight(entry.contentRect.height);
      }
    });
    
    observer.observe(sidebarRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadStorageData();
    db.getSettings().then(setSettings);
  }, [songs]);

  const handleUpdateLimit = async (limit: number) => {
    if (!settings) return;
    const newSettings = { ...settings, storageLimit: limit };
    setSettings(newSettings);
    await db.saveSettings(newSettings);
    showToast('success', `Storage limit set to ${limit === 0 ? 'Browser Default' : limit + 'GB'}`);
  };

  const filteredSongSizes = useMemo(() => {
    return songSizes.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [songSizes, searchQuery]);

  const analyzedCount = songs.filter((s) => s.analyzed).length;
  const effectiveQuota = settings?.storageLimit && settings.storageLimit > 0 
    ? settings.storageLimit * 1024 * 1024 * 1024 
    : storage.quota;
  const usagePct = effectiveQuota > 0 ? (storage.usage / effectiveQuota) * 100 : 0;

  useEffect(() => {
    loadStorageData();
  }, [songs]);

  // Load cover arts for the list
  useEffect(() => {
    const loadCovers = async () => {
      const newCovers = new Map(coverArts);
      // Load covers for top 50 songs in current filtered list
      const visibleSongs = filteredSongSizes.slice(0, 50);
      let changed = false;
      
      for (const song of visibleSongs) {
        if (!newCovers.has(song.id)) {
          const librarySong = songs.find(s => s.id === song.id);
          if (librarySong?.hasCoverArt) {
            const url = await getCoverArtUrl(song.id);
            if (url) {
              newCovers.set(song.id, url);
              changed = true;
            }
          }
        }
      }
      if (changed) setCoverArts(newCovers);
    };
    if (filteredSongSizes.length > 0) {
      loadCovers();
    }
  }, [filteredSongSizes, getCoverArtUrl, songs]);

  const loadStorageData = async () => {
    setLoadingSizes(true);
    const [estimate, sizes] = await Promise.all([
      db.getStorageEstimate(),
      db.getSongsWithSizes()
    ]);
    setStorage(estimate);
    setSongSizes(sizes.sort((a, b) => b.size - a.size)); // Sort by largest
    setLoadingSizes(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleClearData = async () => {
    await db.clearAllData();
    await refreshSongs();
    showToast('success', 'All data cleared successfully');
    window.location.reload();
  };

  const handleBulkDelete = async () => {
    if (selectedSongs.size === 0) return;
    
    const count = selectedSongs.size;
    try {
      for (const id of Array.from(selectedSongs)) {
        await deleteSong(id);
      }
      setSelectedSongs(new Set());
      showToast('success', `Deleted ${count} songs`);
      loadStorageData();
    } catch (err) {
      showToast('error', 'Failed to delete some songs');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedSongs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSongs(next);
  };

  const toggleSelectAll = () => {
    if (selectedSongs.size === filteredSongSizes.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(filteredSongSizes.map(s => s.id)));
    }
  };

  // Dynamic Theme Suggestion (from first song in library)
  useEffect(() => {
    if (songs.length > 0 && !playerState.currentSong) {
      const firstSong = songs[0];
      getCoverArtUrl(firstSong.id).then(url => {
        if (!url) return;
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = 50; canvas.height = 50;
          ctx.drawImage(img, 0, 0, 50, 50);
          
          const regions = [
            { x: 0, y: 0, w: 25, h: 25 }, { x: 25, y: 0, w: 25, h: 25 },
            { x: 0, y: 25, w: 25, h: 25 }, { x: 25, y: 25, w: 25, h: 25 },
            { x: 12, y: 12, w: 25, h: 25 }
          ];

          const colors = regions.map(reg => {
            const data = ctx.getImageData(reg.x, reg.y, reg.w, reg.h).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
              r += data[i]; g += data[i+1]; b += data[i+2]; count++;
            }
            return `#${Math.floor(r/count).toString(16).padStart(2, '0')}${Math.floor(g/count).toString(16).padStart(2, '0')}${Math.floor(b/count).toString(16).padStart(2, '0')}`;
          });

          setAccentColor({
            c1: colors[0], c2: colors[1], c3: colors[2], c4: colors[3], c5: colors[4]
          });
        };
      });
    }
  }, [songs, playerState.currentSong, getCoverArtUrl, setAccentColor]);


  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Dynamic Background Mesh Gradient */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ease-in-out"
        style={{
          opacity: playerState.dynamicBackgroundEnabled ? 0.2 : 0,
          background: `
            radial-gradient(circle at var(--accent-pos-1-x) var(--accent-pos-1-y), var(--accent) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-2-x) var(--accent-pos-2-y), var(--accent-2) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-3-x) var(--accent-pos-3-y), var(--accent-3) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-4-x) var(--accent-pos-4-y), var(--accent-4) 0%, transparent 50%),
            radial-gradient(circle at var(--accent-pos-5-x) var(--accent-pos-5-y), var(--accent-5) 0%, transparent 50%)
          `
        }}
      />

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-accent" />
            Settings
          </h1>
          <p className="text-text-secondary">Manage your library storage and audio preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Settings Column */}
          <div 
            className="lg:col-span-2 flex flex-col"
            style={{ height: sidebarHeight ? `${sidebarHeight}px` : 'auto' }}
          >
            {/* Storage Manager */}
            <section className="glass-strong rounded-3xl border border-border overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface/30">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Database className="w-5 h-5 text-accent" />
                  Storage Manager
                </h2>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={loadStorageData}
                    className="p-2 hover:bg-surface rounded-lg transition-colors text-text-muted"
                    title="Refresh"
                   >
                     <RefreshCw className={`w-4 h-4 ${loadingSizes ? 'animate-spin' : ''}`} />
                   </button>
                   {selectedSongs.size > 0 && (
                     <button
                       onClick={handleBulkDelete}
                       className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                       Delete ({selectedSongs.size})
                     </button>
                   )}
                </div>
              </div>

              <div className="p-4 border-b border-border flex items-center gap-4 bg-surface/10">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files to manage storage..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'audio/*';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) importFiles(files);
                    };
                    input.click();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-accent/10 text-accent hover:bg-accent/20 rounded-xl transition-all font-bold"
                >
                  <RefreshCw className="w-4 h-4 rotate-45" />
                  Import
                </button>
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {selectedSongs.size === filteredSongSizes.length && filteredSongSizes.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-accent" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Select All
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                {loadingSizes ? (
                  <div className="p-10 text-center">
                    <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                    <p className="text-text-muted">Calculating storage usage...</p>
                  </div>
                ) : filteredSongSizes.length > 0 ? (
                  <table className="w-full text-left table-fixed">
                    <thead className="sticky top-0 bg-surface z-10">
                      <tr className="text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">
                        <th className="px-6 py-3 w-16"></th>
                        <th className="px-4 py-3">File Name</th>
                        <th className="px-4 py-3 text-center w-24">Source</th>
                        <th className="px-4 py-3 text-center w-24">Status</th>
                        <th className="px-4 py-3 text-right w-24">Size</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredSongSizes.map((song) => (
                        <tr 
                          key={song.id} 
                          className={`group hover:bg-surface-hover transition-colors cursor-pointer ${selectedSongs.has(song.id) ? 'bg-accent/5' : ''}`}
                          onClick={() => toggleSelect(song.id)}
                          onContextMenu={(e) => handleContextMenu(e, song)}
                        >
                          <td className="px-6 py-4">
                            {selectedSongs.has(song.id) ? (
                              <CheckSquare className="w-4 h-4 text-accent" />
                            ) : (
                              <Square className="w-4 h-4 text-text-muted group-hover:text-text-secondary" />
                            )}
                          </td>
                          <td className="px-4 py-4 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-background border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                                {coverArts.get(song.id) ? (
                                  <img src={coverArts.get(song.id)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Music2 className="w-4 h-4 text-text-muted" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">{song.title}</p>
                                <p className="text-xs text-text-muted truncate">{song.artist}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {song.source === 'youtube' ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">
                                <Video className="w-2.5 h-2.5" />
                                YouTube
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                <Plus className="w-2.5 h-2.5" />
                                Upload
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {song.analyzed ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                Analyzed
                              </div>
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const result = await analyzeSong(song.id, song.title);
                                  if (result.success) {
                                    showToast('success', `Analyzed ${song.title}`);
                                    loadStorageData();
                                  } else {
                                    showErrorPopup(
                                      `Analysis Failed: ${song.title}`,
                                      result.error || 'The audio data could not be processed.',
                                      `Failed: ${song.title}`
                                    );
                                  }
                                }}
                                disabled={analysisState.status === 'analyzing'}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent text-accent hover:text-white text-[10px] font-bold border border-accent/20 transition-all disabled:opacity-50"
                              >
                                {analysisState.status === 'analyzing' && analysisState.currentSongId === song.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Brain className="w-3 h-3" />
                                )}
                                Analyze
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-xs text-text-secondary">
                            {formatBytes(song.size)}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, song);
                              }}
                              className="p-2 rounded-lg hover:bg-surface text-text-muted opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-20 text-center text-text-muted">
                    <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No files found matching your search</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Stats & Danger Zone */}
          <div ref={sidebarRef} className="space-y-8">
            {/* Storage Summary */}
            <section className="p-6 glass-strong rounded-3xl border border-border">
              <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-accent" />
                Storage Usage
              </h2>
              
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-text-secondary">Used: {formatBytes(storage.usage)}</span>
                  <span className="text-text-muted">{usagePct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${usagePct > 90 ? 'bg-red-500' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text-muted mt-2">
                  <span>Quota: {formatBytes(effectiveQuota)}</span>
                  {settings?.storageLimit ? (
                    <span className="text-accent font-bold">Personal Limit</span>
                  ) : (
                    <span>Browser Default</span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-bold text-text-primary mb-3">Set Personal Limit</p>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleUpdateLimit(val)}
                      className={`py-2 rounded-lg border text-[10px] font-bold transition-all ${
                        (settings?.storageLimit || 0) === val
                          ? 'bg-accent border-accent text-white'
                          : 'bg-surface border-border text-text-muted hover:border-accent/50'
                      }`}
                    >
                      {val === 0 ? 'Auto' : `${val}GB`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-3 leading-tight">
                  IndexedDB is browser-managed. This limit is an app-level target.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-surface rounded-xl border border-border">
                  <span className="text-xs text-text-secondary">Total Songs</span>
                  <span className="text-sm font-bold text-text-primary">{songs.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface rounded-xl border border-border">
                  <span className="text-xs text-text-secondary">Analyzed</span>
                  <span className="text-sm font-bold text-emerald-400">{analyzedCount}</span>
                </div>
              </div>
            </section>

            {/* Personalization */}
            <section className="p-6 glass-strong rounded-3xl border border-border">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-accent" />
                Personalization
              </h2>
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                <div>
                  <p className="text-sm font-bold text-text-primary">Dynamic Background</p>
                  <p className="text-[10px] text-text-muted mt-1">Enable multi-color mesh gradients based on cover art.</p>
                </div>
                <Checkbox 
                  checked={playerState.dynamicBackgroundEnabled} 
                  onChange={toggleDynamicBackground} 
                />
              </div>
            </section>

            {/* Audio intelligence */}
            <section className="p-6 glass-strong rounded-3xl border border-border">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                AI Analysis
              </h2>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">
                Re-scan your library to update BPM, Mood, and Energy features for all songs.
              </p>
              <button
                onClick={analyzeAll}
                className="w-full py-2.5 bg-surface-hover hover:bg-border border border-border rounded-xl text-text-primary transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Analyze All Songs
              </button>
            </section>

            {/* Danger Zone */}
            <section className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5">
              <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h2>
              <p className="text-xs text-red-400/70 mb-6 leading-relaxed">
                Clearing all data will permanently delete your library, playlists, and settings.
              </p>
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All Database
              </button>
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Clear All Data"
        message="Are you sure you want to delete all songs, playlists, and settings? This action is permanent and cannot be undone."
        confirmLabel="Destroy All Data"
        isDestructive={true}
        verificationChallenge="I acknowledge that pressing confirm will delete all data."
        onConfirm={handleClearData}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div 
          ref={menuRef}
          className="fixed z-[200] w-52 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden py-1.5 animate-in fade-in zoom-in duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 mb-1 border-b border-white/5">
            <p className="text-xs font-bold text-text-primary truncate">{contextMenu.song.title}</p>
            <p className="text-[10px] text-text-muted truncate">{contextMenu.song.artist}</p>
          </div>

          <button
            onClick={() => {
              const fullSong = songs.find(s => s.id === contextMenu.song.id);
              if (fullSong) {
                const index = songs.indexOf(fullSong);
                playSong(fullSong, songs, index);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-accent hover:text-white transition-colors"
          >
            <Play className="w-4 h-4" />
            Play Now
          </button>

          <button
            onClick={async () => {
              await toggleFavorite(contextMenu.song.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-accent hover:text-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${songs.find(s => s.id === contextMenu.song.id)?.favorite ? 'fill-current' : ''}`} />
            Favorite
          </button>

          <button
            onClick={async () => {
              const song = contextMenu.song;
              setContextMenu(null);
              if (analysisState.status === 'analyzing') return;
              const result = await analyzeSong(song.id, song.title);
              if (result.success) {
                showToast('success', `Analyzed ${song.title}`);
                loadStorageData();
              } else {
                showErrorPopup(
                  `Analysis Failed: ${song.title}`,
                  result.error || 'The audio data could not be processed.',
                  `Failed: ${song.title}`
                );
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-accent hover:text-white transition-colors"
          >
            <Brain className="w-4 h-4" />
            Analyze AI
          </button>

          <div className="h-px bg-white/5 my-1" />

          <button
            onClick={async () => {
              const id = contextMenu.song.id;
              setContextMenu(null);
              if (confirm('Are you sure you want to delete this song?')) {
                await deleteSong(id);
                showToast('success', 'Song deleted');
                loadStorageData();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete File
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
