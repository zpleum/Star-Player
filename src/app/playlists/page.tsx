'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';
import Link from 'next/link';
import { ListMusic, Plus, Music2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PlaylistsPage() {
  const { playlists, songs, getCoverArtUrl, openCreatePlaylistModal } = useLibrary();
  const { setAccentColor, state: playerState } = usePlayer();
  const [coverArts, setCoverArts] = useState<Map<string, string>>(new Map());

  // Dynamic Theme Suggestion (from first playlist's first song)
  useEffect(() => {
    if (playlists.length > 0 && !playerState.currentSong) {
      const firstPlaylist = playlists[0];
      if (firstPlaylist.songIds.length > 0) {
        getCoverArtUrl(firstPlaylist.songIds[0]).then(url => {
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
    }
  }, [playlists, playerState.currentSong, getCoverArtUrl, setAccentColor]);

  // Load cover art for first song of each playlist
  useEffect(() => {
    const loadCovers = async () => {
      const newCovers = new Map<string, string>();
      for (const pl of playlists) {
        if (pl.songIds.length > 0) {
          const url = await getCoverArtUrl(pl.songIds[0]);
          if (url) newCovers.set(pl.id, url);
        }
      }
      setCoverArts(newCovers);
    };
    loadCovers();
  }, [playlists, getCoverArtUrl]);

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

      <div className="flex-1 overflow-y-auto p-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
                <ListMusic className="w-8 h-8 text-accent" />
                Playlists
              </h1>
              <p className="text-text-secondary">Your custom collections.</p>
            </div>
            <button
              onClick={() => openCreatePlaylistModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-full font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Playlist
            </button>
          </div>

          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted h-full border-2 border-dashed border-border rounded-3xl">
              <ListMusic className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No playlists yet</p>
              <p className="text-sm mt-1">Create one to start organizing your music.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {playlists.map((pl) => {
                const coverUrl = coverArts.get(pl.id);
                return (
                  <Link
                    key={pl.id}
                    href={`/playlists/${pl.id}`}
                    data-playlist-id={pl.id}
                    data-custom-context="true"
                    className="group flex flex-col gap-3"
                  >
                    <div className="aspect-square rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden transition-all group-hover:-translate-y-1 relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                      {coverUrl ? (
                        <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Music2 className="w-12 h-12 text-text-muted/50 group-hover:scale-110 transition-transform duration-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                        {pl.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {pl.songIds.length} song{pl.songIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
