'use client';
// ============================================================
// Star Player — YouTube Downloader UI
// ============================================================
import { useState, useRef } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { API_BASE_URL } from '@/lib/constants';
import { Download, Video, Loader2, Search, CheckCircle2, AlertCircle, Link, List, X, Plus } from 'lucide-react';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
}

type DownloadMode = 'single' | 'batch';

interface BatchItem {
  id: string;
  url: string;
  status: 'pending' | 'fetching' | 'ready' | 'downloading' | 'done' | 'error';
  info?: VideoInfo;
  error?: string;
  progress: number;
}

export default function YouTubeDownloader() {
  // Mode
  const [mode, setMode] = useState<DownloadMode>('single');

  // Single mode state
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{ isOpen: boolean; existingSongId?: string; title?: string }>({ isOpen: false });

  // Batch mode state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchUrl, setBatchUrl] = useState('');
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [batchError, setBatchError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const { refreshSongs, showToast, songs, deleteSong, fetchLyricsSilent } = useLibrary();
  const { analyzeAll } = useAudioAnalysis();

  // ── Single Mode Functions ──────────────────────────
  const fetchInfo = async () => {
    if (!url) return;
    try {
      new URL(url);
    } catch {
      const msg = 'Please enter a valid URL';
      setError(msg);
      showToast('error', msg);
      return;
    }

    setIsLoadingInfo(true);
    setError(null);
    setVideoInfo(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/info?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch video info');
      }
      const data = await res.json();
      setVideoInfo({
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast('error', msg);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleDownload = async (overwriteSongId?: string) => {
    if (!url || !videoInfo) return;

    if (!overwriteSongId) {
      const existingSong = songs.find(s => s.title === videoInfo.title);
      if (existingSong) {
        setConfirmOverwrite({ isOpen: true, existingSongId: existingSong.id, title: videoInfo.title });
        return;
      }
    }

    setIsDownloading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);
    
    if (overwriteSongId) {
      await deleteSong(overwriteSongId);
      setConfirmOverwrite({ isOpen: false });
    }
    
    const taskId = Math.random().toString(36).substring(7);
    
    const progressInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/youtube/progress?taskId=${taskId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.progress > 0) setProgress(data.progress);
        }
      } catch (e) {}
    }, 1000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, taskId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Download failed');
      }

      const blob = await res.blob();
      const { v4: uuidv4 } = await import('uuid');
      const { addSong } = await import('@/lib/db');
      
      let coverArt: Blob | null = null;
      try {
          const thumbRes = await fetch(videoInfo.thumbnail);
          if (thumbRes.ok) {
              coverArt = await thumbRes.blob();
          }
      } catch (e) {
          console.error('Failed to fetch thumbnail', e);
      }

      const songId = uuidv4();
      await addSong({
        id: songId,
        title: videoInfo.title,
        artist: 'YouTube',
        album: 'YouTube Downloads',
        duration: videoInfo.duration,
        coverArt,
        audioData: blob,
        genre: '',
        year: new Date().getFullYear(),
        dateAdded: Date.now(),
        playCount: 0,
        favorite: false,
        bpm: null,
        mood: null,
        moodConfidence: null,
        audioFeatures: null,
        analyzed: false,
        source: 'youtube',
      });

      // Auto-fetch lyrics in background
      fetchLyricsSilent(songId, videoInfo.title, 'YouTube');

      await refreshSongs();
      showToast('success', 'Song downloaded successfully');
      setSuccess(true);
      setVideoInfo(null);
      setUrl('');
      analyzeAll();
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during download';
      setError(msg);
      showToast('error', msg);
    } finally {
      clearInterval(progressInterval);
      setIsDownloading(false);
      setProgress(0);
    }
  };

  // ── Batch Mode Functions ──────────────────────────
  const addBatchUrl = () => {
    const trimmed = batchUrl.trim();
    if (!trimmed) return;
    
    // Split by whitespace/newlines to support multiple links
    const urls = trimmed.split(/[\s\n,]+/).filter(u => {
      try {
        new URL(u.trim());
        return true;
      } catch {
        return false;
      }
    });

    if (urls.length === 0) {
      const msg = 'Please enter valid YouTube URLs';
      setBatchError(msg);
      showToast('error', msg);
      return;
    }

    setBatchError(null);

    const existingUrls = new Set(batchItems.map(i => i.url));
    const newItemsToAdd: BatchItem[] = [];
    
    urls.forEach(u => {
      const urlStr = u.trim();
      if (!existingUrls.has(urlStr)) {
        newItemsToAdd.push({
          id: Math.random().toString(36).substring(7),
          url: urlStr,
          status: 'pending',
          progress: 0,
        });
      }
    });

    if (newItemsToAdd.length > 0) {
      setBatchItems(prev => [...prev, ...newItemsToAdd]);
      showToast('success', `Added ${newItemsToAdd.length} link(s) to queue`);
    } else {
      showToast('error', 'All links are already in the queue');
    }
    setBatchUrl('');
  };

  const removeBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const fetchBatchInfo = async (item: BatchItem): Promise<VideoInfo | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/info?url=${encodeURIComponent(item.url)}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return { title: data.title, thumbnail: data.thumbnail, duration: data.duration };
    } catch {
      return null;
    }
  };

  const downloadBatchItem = async (item: BatchItem, info: VideoInfo) => {
    const taskId = Math.random().toString(36).substring(7);
    
    const progressInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/youtube/progress?taskId=${taskId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.progress > 0) {
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: data.progress } : i));
          }
        }
      } catch (e) {}
    }, 1000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, taskId }),
      });

      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const { v4: uuidv4 } = await import('uuid');
      const { addSong } = await import('@/lib/db');
      
      let coverArt: Blob | null = null;
      try {
        const thumbRes = await fetch(info.thumbnail);
        if (thumbRes.ok) coverArt = await thumbRes.blob();
      } catch (e) {}

      const songId = uuidv4();
      await addSong({
        id: songId,
        title: info.title,
        artist: 'YouTube',
        album: 'YouTube Downloads',
        duration: info.duration,
        coverArt,
        audioData: blob,
        genre: '',
        year: new Date().getFullYear(),
        dateAdded: Date.now(),
        playCount: 0,
        favorite: false,
        bpm: null,
        mood: null,
        moodConfidence: null,
        audioFeatures: null,
        analyzed: false,
        source: 'youtube',
      });

      // Auto-fetch lyrics in background
      fetchLyricsSilent(songId, info.title, 'YouTube');

      return true;
    } catch {
      return false;
    } finally {
      clearInterval(progressInterval);
    }
  };

  const startBatchDownload = async () => {
    if (batchItems.length === 0) return;
    setIsBatchDownloading(true);
    abortRef.current = false;

    const queue = [...batchItems].filter(i => i.status !== 'done' && i.status !== 'downloading');
    
    // Helper to process a single item
    const processItem = async (item: BatchItem) => {
      if (abortRef.current) return;

      // Fetch info
      setBatchItems(prev => prev.map(bi => bi.id === item.id ? { ...bi, status: 'fetching' } : bi));
      const info = await fetchBatchInfo(item);
      
      if (!info) {
        setBatchItems(prev => prev.map(bi => bi.id === item.id ? { ...bi, status: 'error', error: 'Could not fetch info' } : bi));
        return;
      }
      
      setBatchItems(prev => prev.map(bi => bi.id === item.id ? { ...bi, status: 'downloading', info } : bi));
      
      const ok = await downloadBatchItem(item, info);
      setBatchItems(prev => prev.map(bi => bi.id === item.id 
        ? { ...bi, status: ok ? 'done' : 'error', error: ok ? undefined : 'Download failed', progress: ok ? 100 : bi.progress } 
        : bi
      ));
    };

    // Concurrency control using a worker-like pool
    const activePromises = new Set<Promise<void>>();
    for (const item of queue) {
      if (abortRef.current) break;

      const promise = processItem(item).then(() => {
        activePromises.delete(promise);
      });
      activePromises.add(promise);

      if (activePromises.size >= concurrencyLimit) {
        await Promise.race(activePromises);
      }
    }

    await Promise.all(activePromises);

    await refreshSongs();
    analyzeAll();
    setIsBatchDownloading(false);
    
    const doneCount = batchItems.filter(i => i.status === 'done').length;
    const errorCount = batchItems.filter(i => i.status === 'error').length;
    
    if (errorCount > 0) {
      const msg = `${errorCount} song(s) failed to download. Check the list below for details.`;
      setBatchError(msg);
      showToast('error', msg);
    }
    
    showToast('success', `Batch download complete (${doneCount} songs)`);
  };

  const batchDoneCount = batchItems.filter(i => i.status === 'done').length;
  const batchTotalCount = batchItems.length;

  return (
    <div className="w-full md:p-20 p-8">
      <div className="">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <Video className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">YouTube to Library</h2>
              <p className="text-sm text-text-secondary">Download audio directly to your library</p>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 p-1 bg-surface rounded-xl border border-border">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'single' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Link className="w-4 h-4" />
            Single Link
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'batch' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <List className="w-4 h-4" />
            Batch Download
          </button>
        </div>

        {/* ── Single Mode ── */}
        {mode === 'single' && (
          <>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (videoInfo) handleDownload();
                      else fetchInfo();
                    }
                  }}
                  placeholder="Paste YouTube URL here..."
                  className="w-full pl-4 pr-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  disabled={isDownloading}
                />
              </div>
              <button
                onClick={fetchInfo}
                disabled={!url || isLoadingInfo || isDownloading}
                className="px-6 py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-primary font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoadingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Info
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">Download complete and added to library!</p>
              </div>
            )}

            {videoInfo && !success && (
              <div className="p-4 rounded-2xl bg-surface border border-border animate-fade-in">
                <div className="flex gap-4">
                  <div className="w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-black">
                    <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 py-1 flex flex-col">
                    <h3 className="font-medium text-text-primary line-clamp-2 mb-1" title={videoInfo.title}>
                      {videoInfo.title}
                    </h3>
                    <p className="text-sm text-text-muted mt-auto">
                      Duration: {Math.floor(videoInfo.duration / 60)}:{String(videoInfo.duration % 60).padStart(2, '0')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload()}
                  disabled={isDownloading}
                  className="w-full mt-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Downloading... {progress > 0 ? `${progress.toFixed(1)}%` : ''}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Audio
                    </>
                  )}
                </button>
                
                {isDownloading && progress > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Downloading & Converting</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-accent h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Batch Mode ── */}
        {mode === 'batch' && (
          <>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <textarea
                  value={batchUrl}
                  onChange={(e) => {
                    setBatchUrl(e.target.value);
                    if (batchError) setBatchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addBatchUrl();
                    }
                  }}
                  placeholder="Paste one or more YouTube URLs here..."
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none h-[80px]"
                  disabled={isBatchDownloading}
                />
              </div>
            </div>

            {batchError && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{batchError}</p>
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-6 px-1">
               <span className="text-xs font-bold text-text-secondary whitespace-nowrap min-w-[70px]">Parallel: {concurrencyLimit}</span>
               <div className="relative flex-1 flex flex-col gap-2">
                 <input
                   type="range"
                   min="1"
                   max="12"
                   step="1"
                   value={concurrencyLimit}
                   onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                   disabled={isBatchDownloading}
                   className="w-full h-1.5 bg-surface-hover border border-border rounded-full appearance-none cursor-pointer accent-accent transition-all disabled:opacity-50 z-10"
                 />
                 <div className="flex justify-between px-1.5">
                   {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                     <div 
                       key={n} 
                       className={`w-0.5 h-0.5 rounded-full transition-colors ${n <= concurrencyLimit ? 'bg-accent' : 'bg-text-muted/30'}`} 
                     />
                   ))}
                 </div>
               </div>
               <span className="text-[10px] font-bold text-text-muted w-4">12</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
               <button
                onClick={addBatchUrl}
                disabled={!batchUrl.trim() || isBatchDownloading}
                className="w-full py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-primary text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Add to Queue
              </button>
            </div>

            {/* Queue List */}
            {batchItems.length > 0 && (
              <div className="space-y-2 mb-6 max-h-[350px] overflow-y-auto no-scrollbar">
                {batchItems.map((item, idx) => (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    item.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    item.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                    item.status === 'downloading' ? 'bg-accent/5 border-accent/20' :
                    'bg-surface border-border'
                  }`}>
                    {/* Index */}
                    <span className="text-xs font-bold text-text-muted w-6 text-center flex-shrink-0">{idx + 1}</span>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {item.info ? (
                        <p className="text-sm text-text-primary truncate">{item.info.title}</p>
                      ) : (
                        <p className="text-xs text-text-muted truncate">{item.url}</p>
                      )}
                      
                      {item.error && (
                        <div className="flex items-center gap-2 mt-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 animate-fade-in w-fit">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <p className="text-[10px] font-medium">{item.error}</p>
                        </div>
                      )}
                      
                      {/* Per-item progress bar */}
                      {item.status === 'downloading' && item.progress > 0 && (
                        <div className="w-full bg-surface-hover rounded-full h-1 mt-1.5 overflow-hidden">
                          <div className="bg-accent h-1 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>

                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                      {(item.status === 'downloading' || item.status === 'fetching') && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                      {item.status === 'pending' && (
                        <button onClick={() => removeBatchItem(item.id)} disabled={isBatchDownloading} className="p-1 text-text-muted hover:text-red-400 transition-colors disabled:opacity-30">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Batch Overall Progress */}
            {isBatchDownloading && (
              <div className="mb-4 p-3 rounded-xl bg-accent/5 border border-accent/20">
                <div className="flex justify-between text-xs text-text-muted mb-1.5">
                  <span>Overall Progress</span>
                  <span>{batchDoneCount} / {batchTotalCount} songs</span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${batchTotalCount > 0 ? (batchDoneCount / batchTotalCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Start / Clear buttons */}
            <div className="flex gap-3">
              <button
                onClick={startBatchDownload}
                disabled={batchItems.length === 0 || isBatchDownloading}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isBatchDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Downloading {batchDoneCount}/{batchTotalCount}...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download All ({batchItems.length})
                  </>
                )}
              </button>
              {!isBatchDownloading && batchItems.length > 0 && (
                <button
                  onClick={() => setBatchItems([])}
                  className="px-5 py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-muted hover:text-text-primary font-medium transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            {batchItems.length === 0 && !isBatchDownloading && (
              <div className="text-center py-10 text-text-muted/60">
                <List className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Add YouTube links above to start a batch download</p>
              </div>
            )}
          </>
        )}
        
        <div className="mt-8 p-4 rounded-xl bg-surface/50 border border-border/50">
           <p className="text-xs text-text-muted flex items-start gap-2">
             <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
             <span>Note: The Next.js server must be running locally for the downloader to work, as it relies on the `yt-dlp` system binary. Downloads are processed server-side and then saved directly to your browser&apos;s IndexedDB offline storage.</span>
           </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOverwrite.isOpen}
        title="Song Already Exists"
        message={`A song titled "${confirmOverwrite.title}" already exists in your library. Do you want to download and overwrite it?`}
        confirmLabel="Overwrite"
        isDestructive={true}
        onConfirm={() => handleDownload(confirmOverwrite.existingSongId)}
        onCancel={() => setConfirmOverwrite({ isOpen: false })}
      />
    </div>
  );
}