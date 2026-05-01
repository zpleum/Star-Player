import { useLibrary } from '@/contexts/LibraryContext';
import { X, Plus, Check, Search, Music2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import type { Playlist } from '@/lib/types';

interface AddSongsModalProps {
  playlist: Playlist;
  onClose: () => void;
}

export default function AddSongsModal({ playlist, onClose }: AddSongsModalProps) {
  const { songs, addSongsToPlaylist, getCoverArtUrl } = useLibrary();
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [coverArts, setCoverArts] = useState<Map<string, string>>(new Map());

  // Filter out songs already in the playlist
  const availableSongs = useMemo(() => {
    return songs.filter(song => !playlist.songIds.includes(song.id));
  }, [songs, playlist.songIds]);

  // Apply search query
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return availableSongs;
    const lowerQuery = searchQuery.toLowerCase();
    return availableSongs.filter(
      song => 
        song.title.toLowerCase().includes(lowerQuery) || 
        song.artist.toLowerCase().includes(lowerQuery)
    );
  }, [availableSongs, searchQuery]);

  // Load cover arts for visible songs
  useEffect(() => {
    const loadCovers = async () => {
      const newCovers = new Map(coverArts);
      for (const song of filteredSongs.slice(0, 50)) {
        if (!newCovers.has(song.id) && song.hasCoverArt) {
          const url = await getCoverArtUrl(song.id);
          if (url) newCovers.set(song.id, url);
        }
      }
      setCoverArts(newCovers);
    };
    loadCovers();
  }, [filteredSongs, getCoverArtUrl]);

  const handleAddSong = async (songId: string) => {
    if (addedIds.has(songId)) return;
    
    // Optimistic UI update
    setAddedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(songId);
      return newSet;
    });

    await addSongsToPlaylist(playlist.id, [songId]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[85vh] bg-surface border border-border shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/50">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Add Songs</h2>
            <p className="text-sm text-text-muted mt-1">Add songs to "{playlist.name}"</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-background">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search by title or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-text-muted">
              <Music2 className="w-12 h-12 mb-4 opacity-30" />
              <p>No more songs available to add.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredSongs.map((song) => {
                const isAdded = addedIds.has(song.id);
                const coverUrl = coverArts.get(song.id);
                
                return (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-background flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {coverUrl ? (
                          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music2 className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{song.title}</p>
                        <p className="text-xs text-text-secondary truncate">{song.artist}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAddSong(song.id)}
                      disabled={isAdded}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors flex-shrink-0 ${
                        isAdded 
                          ? 'bg-accent/20 text-accent' 
                          : 'bg-surface hover:bg-accent text-text-primary hover:text-white border border-border group-hover:border-accent'
                      }`}
                      title={isAdded ? "Added" : "Add to playlist"}
                    >
                      {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
