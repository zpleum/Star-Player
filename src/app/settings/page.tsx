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
      {/* Dynamic Background */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500"
        style={{
          opacity: playerState.dynamicBackgroundEnabled ? 0.2 : 0,
          background: `
            radial-gradient(circle at 20% 20%, var(--accent) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, var(--accent-2) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, var(--accent-3) 0%, transparent 50%)
          `
        }}
      />

      {/* Header */}
      <div className="px-4 md:px-8 pt-5 md:pt-8 pb-4 flex-shrink-0 relative z-10 border-b border-border/30">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 md:w-7 md:h-7 text-accent" />
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">Manage your library, storage, and preferences.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-36 md:pb-8 custom-scrollbar relative z-10">
        <div className="max-w-6xl mx-auto space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">

          {/* ═══ Left/Main: Storage Manager ═══ */}
          <div className="lg:col-span-2">
            <section className="bg-surface/30 rounded-2xl border border-border/50 overflow-hidden">
              {/* Section Header */}
              <div className="p-4 md:p-6 border-b border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-text-primary flex items-center gap-2">
                      <Database className="w-5 h-5 text-accent" />
                      Storage Manager
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {songSizes.length} files · {formatBytes(storage.usage)} used
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file'; input.multiple = true; input.accept = 'audio/*';
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) importFiles(files);
                      };
                      input.click();
                    }}
                    className="flex items-center gap-1.5 px-3 md:px-5 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-full font-bold transition-all active:scale-95 text-xs md:text-sm whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Import
                  </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input 
                      type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-full text-xs focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <button 
                    onClick={toggleSelectAll}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-medium transition-all text-xs whitespace-nowrap ${
                      selectedSongs.size === filteredSongSizes.length && filteredSongSizes.length > 0
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-surface border border-border hover:bg-surface-hover text-text-primary'
                    }`}
                  >
                    {selectedSongs.size === filteredSongSizes.length && filteredSongSizes.length > 0 
                      ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    All
                  </button>
                  {selectedSongs.size > 0 && (
                    <button onClick={handleBulkDelete}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full font-bold transition-all text-xs whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete ({selectedSongs.size})
                    </button>
                  )}
                  <button onClick={loadStorageData} className="p-2 ml-auto text-text-muted hover:text-text-primary hover:bg-surface rounded-full transition-all">
                    <RefreshCw className={`w-4 h-4 ${loadingSizes ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Song List — Card rows (mobile-friendly) */}
              <div className="divide-y divide-border/30 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {loadingSizes ? (
                  <div className="p-10 text-center">
                    <RefreshCw className="w-7 h-7 text-accent animate-spin mx-auto mb-2" />
                    <p className="text-sm text-text-muted">Calculating storage...</p>
                  </div>
                ) : filteredSongSizes.length > 0 ? (
                  filteredSongSizes.map((song, index) => (
                    <div
                      key={song.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-surface-hover ${selectedSongs.has(song.id) ? 'bg-accent/5' : ''}`}
                      onClick={() => toggleSelect(song.id)}
                      onContextMenu={(e) => handleContextMenu(e, song)}
                    >
                      {/* Row Number */}
                      <span className="flex-shrink-0 w-6 text-center text-[11px] text-text-muted/50 font-mono tabular-nums select-none">{index + 1}</span>

                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        {selectedSongs.has(song.id)
                          ? <CheckSquare className="w-4 h-4 text-accent" />
                          : <Square className="w-4 h-4 text-text-muted" />}
                      </div>

                      {/* Cover */}
                      <div className="w-10 h-10 rounded-lg bg-surface border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                        {coverArts.get(song.id)
                          ? <img src={coverArts.get(song.id)} alt="" className="w-full h-full object-cover" />
                          : <Music2 className="w-4 h-4 text-text-muted" />}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">{song.title}</p>
                        <p className="text-xs text-text-muted truncate">{song.artist}</p>
                        {/* Mobile: badges inline */}
                        <div className="flex items-center gap-1.5 mt-1 md:hidden">
                          {song.source === 'youtube' 
                            ? <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">YT</span>
                            : <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">Upload</span>}
                          {song.analyzed 
                            ? <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">✓ Analyzed</span>
                            : null}
                        </div>
                      </div>

                      {/* Desktop: badges */}
                      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                        {song.source === 'youtube'
                          ? <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 flex items-center gap-1"><Video className="w-2.5 h-2.5"/>YT</span>
                          : <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1"><Plus className="w-2.5 h-2.5"/>Upload</span>}
                        {song.analyzed 
                          ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">✓ Analyzed</span>
                          : (
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              const result = await analyzeSong(song.id, song.title);
                              if (result.success) { showToast('success', `Analyzed ${song.title}`); loadStorageData(); }
                              else showErrorPopup(`Analysis Failed`, result.error || 'Could not process audio.', song.title);
                            }}
                              disabled={analysisState.status === 'analyzing'}
                              className="px-2 py-0.5 rounded-full bg-accent/10 hover:bg-accent text-accent hover:text-white text-[10px] font-bold border border-accent/20 transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              <Brain className="w-2.5 h-2.5"/>Analyze
                            </button>
                          )}
                      </div>

                      {/* Size */}
                      <span className="text-xs text-text-muted font-mono flex-shrink-0">{formatBytes(song.size)}</span>

                      {/* More */}
                      <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e, song); }}
                        className="p-1.5 rounded-lg hover:bg-surface text-text-muted transition-all flex-shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-16 text-center text-text-muted">
                    <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No files found</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ═══ Right/Sidebar: Stats & Settings ═══ */}
          <div ref={sidebarRef} className="space-y-4 md:space-y-6">
            {/* Storage Usage */}
            <section className="p-4 md:p-6 bg-surface/30 rounded-2xl border border-border/50">
              <h2 className="text-base md:text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <HardDrive className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                Storage Usage
              </h2>
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-secondary">{formatBytes(storage.usage)} used</span>
                  <span className="text-text-muted">{usagePct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${usagePct > 90 ? 'bg-red-500' : 'bg-accent'}`} style={{ width: `${Math.min(100, usagePct)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
                  <span>Quota: {formatBytes(effectiveQuota)}</span>
                  {settings?.storageLimit ? <span className="text-accent font-bold">Custom Limit</span> : <span>Browser Default</span>}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-bold text-text-primary mb-2">Set Personal Limit</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 5].map((val) => (
                    <button key={val} onClick={() => handleUpdateLimit(val)}
                      className={`py-2 rounded-lg border text-[10px] font-bold transition-all ${(settings?.storageLimit || 0) === val ? 'bg-accent border-accent text-white' : 'bg-surface border-border text-text-muted hover:border-accent/50'}`}
                    >
                      {val === 0 ? 'Auto' : `${val}GB`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-surface rounded-xl border border-border text-center">
                  <p className="text-xs text-text-secondary mb-1">Songs</p>
                  <p className="text-xl font-bold text-text-primary">{songs.length}</p>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border text-center">
                  <p className="text-xs text-text-secondary mb-1">Analyzed</p>
                  <p className="text-xl font-bold text-emerald-400">{analyzedCount}</p>
                </div>
              </div>
            </section>

            {/* Personalization */}
            <section className="p-4 md:p-6 bg-surface/30 rounded-2xl border border-border/50">
              <h2 className="text-base md:text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                Personalization
              </h2>
              <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Dynamic Background</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Mesh gradient from cover art colors.</p>
                </div>
                <Checkbox checked={playerState.dynamicBackgroundEnabled} onChange={toggleDynamicBackground} />
              </div>
            </section>

            {/* AI Analysis */}
            <section className="p-4 md:p-6 bg-surface/30 rounded-2xl border border-border/50">
              <h2 className="text-base md:text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                AI Analysis
              </h2>
              <p className="text-xs text-text-muted mb-4 leading-relaxed">Re-scan library to update BPM, Mood, and Energy for all songs.</p>
              <button onClick={analyzeAll}
                className="w-full py-2.5 bg-surface-hover hover:bg-border border border-border rounded-xl text-text-primary transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Analyze All Songs
              </button>
            </section>

            {/* Danger Zone */}
            <section className="p-4 md:p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
              <h2 className="text-base md:text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                Danger Zone
              </h2>
              <p className="text-xs text-red-400/70 mb-4 leading-relaxed">Permanently delete all library data, playlists, and settings.</p>
              <button onClick={() => setIsConfirmOpen(true)}
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
        <div ref={menuRef}
          className="fixed z-[200] w-52 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden py-1.5 shadow-2xl animate-in fade-in zoom-in duration-150"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 mb-1 border-b border-white/5">
            <p className="text-xs font-bold text-text-primary truncate">{contextMenu.song.title}</p>
            <p className="text-[10px] text-text-muted truncate">{contextMenu.song.artist}</p>
          </div>
          <button onClick={() => { const s = songs.find(x => x.id === contextMenu.song.id); if (s) playSong(s, songs, songs.indexOf(s)); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-accent hover:text-white transition-colors">
            <Play className="w-4 h-4" /> Play Now
          </button>
          <button onClick={async () => { await toggleFavorite(contextMenu.song.id); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-accent hover:text-white transition-colors">
            <Heart className={`w-4 h-4 ${songs.find(s => s.id === contextMenu.song.id)?.favorite ? 'fill-current' : ''}`} /> Favorite
          </button>
          <button onClick={async () => { const song = contextMenu.song; setContextMenu(null); const r = await analyzeSong(song.id, song.title); if (r.success) { showToast('success', `Analyzed ${song.title}`); loadStorageData(); } else showErrorPopup(`Analysis Failed`, r.error || '', song.title); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-accent hover:text-white transition-colors">
            <Brain className="w-4 h-4" /> Analyze AI
          </button>
          <div className="h-px bg-white/5 my-1" />
          <button onClick={async () => { const id = contextMenu.song.id; setContextMenu(null); if (confirm('Delete this song?')) { await deleteSong(id); showToast('success', 'Song deleted'); loadStorageData(); } }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors">
            <Trash2 className="w-4 h-4" /> Delete File
          </button>
        </div>
      )}
    </div>
  );
}
