'use client';
// ============================================================
// Star Player — Import Songs Component
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { Upload, FileAudio, Loader2 } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';

export default function ImportSongs() {
  const { importFiles, importing, importProgress } = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        importFiles(e.dataTransfer.files);
      }
    },
    [importFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      importFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragOver
          ? 'border-accent bg-accent/5 drop-zone-active'
          : 'border-border hover:border-text-muted'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center py-12 px-6">
        {importing ? (
          <>
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className="text-sm font-medium text-text-primary">Importing songs...</p>
            <div className="w-48 h-1.5 rounded-full bg-surface mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-pink-500 transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">{importProgress}%</p>
          </>
        ) : (
          <>
            <div className="p-4 rounded-2xl bg-surface mb-4">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              Drop audio files here
            </p>
            <p className="text-xs text-text-muted mb-4">
              Supports MP3, WAV, OGG, FLAC, M4A, AAC
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-95"
            >
              <span className="flex items-center gap-2">
                <FileAudio className="w-4 h-4" />
                Browse files
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
