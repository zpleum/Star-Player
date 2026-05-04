'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListMusic } from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';
import { Playlist } from '@/lib/types';

interface SidebarPlaylistItemProps {
  playlist: Playlist;
}

export default function SidebarPlaylistItem({ playlist }: SidebarPlaylistItemProps) {
  const { getCoverArtUrl } = useLibrary();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (playlist.songIds.length > 0) {
      getCoverArtUrl(playlist.songIds[0]).then(url => setCoverUrl(url));
    } else {
      setCoverUrl(null);
    }
  }, [playlist.songIds, getCoverArtUrl]);

  return (
    <Link
      href={`/playlists/view?id=${playlist.id}`}
      data-playlist-id={playlist.id}
      data-custom-context="true"
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all truncate group"
    >
      <div className="w-5 h-5 rounded-md overflow-hidden bg-surface border border-border/50 flex-shrink-0 flex items-center justify-center transition-all group-hover:scale-105">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ListMusic className="w-3 h-3 text-text-muted opacity-50" />
        )}
      </div>
      <span className="truncate">{playlist.name}</span>
      <span className="ml-auto text-[10px] text-text-muted font-medium bg-surface px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        {playlist.songIds.length}
      </span>
    </Link>
  );
}
