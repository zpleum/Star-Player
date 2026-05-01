'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import * as db from '@/lib/db';
import { Settings as SettingsIcon, Brain, HardDrive, Trash2, Database, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function SettingsPage() {
  const { songs, refreshSongs, showToast } = useLibrary();
  const { analyzeAll } = useAudioAnalysis();
  const [storage, setStorage] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    db.getStorageEstimate().then(setStorage);
  }, []);

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

  const analyzedCount = songs.filter((s) => s.analyzed).length;
  const usagePct = storage.quota > 0 ? (storage.usage / storage.quota) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-accent" />
            Settings
          </h1>
          <p className="text-text-secondary">Manage your library and preferences.</p>
        </div>

        <div className="space-y-8">
          {/* Storage Section */}
          <section className="p-6 glass-strong rounded-3xl border border-border">
            <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-accent" />
              Storage
            </h2>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Used: {formatBytes(storage.usage)}</span>
                <span className="text-text-muted">Total available: {formatBytes(storage.quota)}</span>
              </div>
              <div className="h-3 w-full bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-surface rounded-2xl border border-border">
                <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Total Songs</p>
                <p className="text-2xl font-bold text-text-primary">{songs.length}</p>
              </div>
              <div className="p-4 bg-surface rounded-2xl border border-border">
                <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Analyzed</p>
                <p className="text-2xl font-bold text-text-primary">{analyzedCount}</p>
              </div>
            </div>
          </section>

          {/* Audio Intelligence */}
          <section className="p-6 glass-strong rounded-3xl border border-border">
            <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent" />
              Audio Intelligence
            </h2>
            
            <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border mb-4">
              <div>
                <p className="font-medium text-text-primary">Re-analyze Library</p>
                <p className="text-sm text-text-secondary">Force re-analysis of all songs for BPM and mood.</p>
              </div>
              <button
                onClick={analyzeAll}
                className="px-4 py-2 bg-surface-hover hover:bg-border border border-border rounded-xl text-text-primary transition-colors text-sm font-medium"
              >
                Analyze All
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="p-6 rounded-3xl border border-red-500/20 bg-red-500/5">
            <h2 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>
            
            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
              <div>
                <p className="font-medium text-red-400">Clear All Data</p>
                <p className="text-sm text-red-400/70">Deletes all songs, playlists, and settings from IndexedDB.</p>
              </div>
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Data
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Clear All Data"
        message="Are you sure you want to delete all songs, playlists, and settings? This cannot be undone."
        confirmLabel="Clear Everything"
        isDestructive={true}
        onConfirm={handleClearData}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
