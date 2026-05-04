'use client';
// ============================================================
// Star Player — YouTube to MP3 (Direct Download)
// ============================================================
import { useState, useRef } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { API_BASE_URL } from '@/lib/constants';
import { Download, Video, Loader2, Search, CheckCircle2, AlertCircle, Link, List, X, Plus } from 'lucide-react';

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

export default function YouTubeToMP3() {
  const [mode, setMode] = useState<DownloadMode>('single');
  const [url, setUrl] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchUrl, setBatchUrl] = useState('');
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState(3);
  const [batchError, setBatchError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const { showToast } = useLibrary();

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
      showToast('success', 'Fetched video info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      showToast('error', msg);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownload = async () => {
    if (!url || !videoInfo) return;

    setIsDownloading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);
    
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
      triggerDownload(blob, videoInfo.title);
      
      showToast('success', 'MP3 downloaded successfully');
      setSuccess(true);
      setVideoInfo(null);
      setUrl('');
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

  const addBatchUrl = () => {
    const trimmed = batchUrl.trim();
    if (!trimmed) return;
    
    const urls = trimmed.split(/[\s\n,]+/).filter(u => {
      try { new URL(u.trim()); return true; } catch { return false; }
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
      triggerDownload(blob, info.title);
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
    setBatchError(null);

    const queue = [...batchItems].filter(i => i.status !== 'done' && i.status !== 'downloading');
    
    const processItem = async (item: BatchItem) => {
      if (abortRef.current) return;
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

    const activePromises = new Set<Promise<void>>();
    for (const item of queue) {
      if (abortRef.current) break;
      const promise = processItem(item).then(() => activePromises.delete(promise));
      activePromises.add(promise);
      if (activePromises.size >= concurrencyLimit) await Promise.race(activePromises);
    }
    await Promise.all(activePromises);

    const doneCount = batchItems.filter(i => i.status === 'done').length;
    const errorCount = batchItems.filter(i => i.status === 'error').length;
    if (errorCount > 0) {
      const msg = `${errorCount} song(s) failed. Check the list.`;
      setBatchError(msg);
      showToast('error', msg);
    }
    showToast('success', `Batch download complete (${doneCount} files)`);
    setIsBatchDownloading(false);
  };

  return (
    <div className="w-full md:p-20 p-8">
      <div className="">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">YouTube to MP3</h2>
              <p className="text-sm text-text-secondary">Download audio files directly to your device</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-surface/30 backdrop-blur-md rounded-xl border border-border/50 mb-8">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'single' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary hover:bg-surface/30'
            }`}
          >
            <Link className="w-4 h-4" />
            Single Link
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'batch' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary hover:bg-surface/30'
            }`}
          >
            <List className="w-4 h-4" />
            Batch Download
          </button>
        </div>

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
                  className="w-full pl-4 pr-4 py-3 bg-surface/50 backdrop-blur-md border border-border/50 rounded-xl text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  disabled={isDownloading}
                />
              </div>
              <button
                onClick={fetchInfo}
                disabled={!url || isLoadingInfo || isDownloading}
                className="px-6 py-3 bg-surface/50 hover:bg-surface-hover border border-border/50 backdrop-blur-md rounded-xl text-text-primary font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingInfo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Info
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-fade-in backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-fade-in backdrop-blur-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">MP3 downloaded to your device!</p>
              </div>
            )}

            {videoInfo && !success && (
              <div className="p-6 rounded-3xl bg-surface/40 backdrop-blur-xl border border-white/5 animate-fade-in overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
                <div className="flex gap-6 relative z-10">
                  <div className="w-48 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-black">
                    <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="flex-1 py-1 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-text-primary line-clamp-2 mb-2 leading-snug">{videoInfo.title}</h3>
                    <div className="flex items-center gap-2 text-text-secondary text-sm">
                       <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 font-medium">MP3</span>
                       <span>•</span>
                       <span>{Math.floor(videoInfo.duration / 60)}:{String(videoInfo.duration % 60).padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full mt-6 py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-70 group"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Downloading... {progress > 0 ? `${progress.toFixed(1)}%` : ''}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                      Download to Device (.mp3)
                    </>
                  )}
                </button>

                {isDownloading && progress > 0 && (
                  <div className="mt-5">
                    <div className="flex justify-between text-xs font-bold text-text-secondary mb-2 px-1">
                      <span className="uppercase tracking-wider">Converting to high-quality audio</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5 p-[1px]">
                      <div 
                        className="bg-gradient-to-r from-accent to-purple-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

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
                  placeholder="Paste YouTube URLs here..."
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none h-[80px]"
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
                   type="range" min="1" max="12" step="1"
                   value={concurrencyLimit}
                   onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                   disabled={isBatchDownloading}
                   className="w-full h-1.5 bg-surface-hover border border-border rounded-full appearance-none cursor-pointer accent-accent transition-all disabled:opacity-50 z-10"
                 />
                 <div className="flex justify-between px-1.5">
                   {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                     <div key={n} className={`w-0.5 h-0.5 rounded-full ${n <= concurrencyLimit ? 'bg-accent' : 'bg-text-muted/30'}`} />
                   ))}
                 </div>
               </div>
               <span className="text-[10px] font-bold text-text-muted w-4">12</span>
            </div>

            <button
              onClick={addBatchUrl}
              disabled={!batchUrl.trim() || isBatchDownloading}
              className="w-full mb-6 py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-primary text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add to Queue
            </button>

            {/* Batch Overall Progress */}
            {isBatchDownloading && (
              <div className="mb-4 p-3 rounded-xl bg-accent/5 border border-accent/20">
                <div className="flex justify-between text-xs text-text-muted mb-1.5">
                  <span>Overall Progress</span>
                  <span>{batchItems.filter(i => i.status === 'done').length} / {batchItems.length} files</span>
                </div>
                <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${batchItems.length > 0 ? (batchItems.filter(i => i.status === 'done').length / batchItems.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {batchItems.length > 0 && (
              <div className="space-y-2 mb-6 max-h-[350px] overflow-y-auto no-scrollbar">
                {batchItems.map((item, idx) => (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    item.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    item.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                    item.status === 'downloading' ? 'bg-accent/5 border-accent/20' : 'bg-surface border-border'
                  }`}>
                    <span className="text-xs font-bold text-text-muted w-6 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.info ? 'text-text-primary' : 'text-text-muted'} truncate`}>
                        {item.info ? item.info.title : item.url}
                      </p>
                      {item.error && (
                        <div className="flex items-center gap-2 mt-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 w-fit">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <p className="text-[10px] font-medium">{item.error}</p>
                        </div>
                      )}
                      {item.status === 'downloading' && (
                        <div className="w-full bg-surface-hover rounded-full h-1 mt-1.5 overflow-hidden">
                          <div className="bg-accent h-1 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div>
                      {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                      {(item.status === 'downloading' || item.status === 'fetching') && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                      {item.status === 'pending' && (
                        <button onClick={() => removeBatchItem(item.id)} disabled={isBatchDownloading} className="p-1 text-text-muted hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={startBatchDownload}
                disabled={batchItems.length === 0 || isBatchDownloading}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isBatchDownloading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Downloading {batchItems.filter(i=>i.status==='done').length}/{batchItems.length}...</>
                ) : (
                  <><Download className="w-5 h-5" />Download All (.mp3)</>
                )}
              </button>
              {!isBatchDownloading && batchItems.length > 0 && (
                <button onClick={() => setBatchItems([])} className="px-5 py-3 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text-muted hover:text-text-primary font-medium transition-all">
                  Clear
                </button>
              )}
            </div>
          </>
        )}
        
        <div className="mt-8 p-4 rounded-xl bg-surface/50 border border-border/50">
           <p className="text-xs text-text-muted flex items-start gap-2">
             <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
             <span>Note: Files downloaded here are saved directly to your device's download folder and will NOT be added to the Star Player library.</span>
           </p>
        </div>
      </div>
    </div>
  );
}