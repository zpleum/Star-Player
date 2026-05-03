'use client';
// ============================================================
// Star Player — Sidebar Navigation
// ============================================================
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Music,
  ListMusic,
  Heart,
  ListOrdered,
  Brain,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Disc3,
} from 'lucide-react';
import { useState } from 'react';
import { MOOD_CONFIG, ALL_MOODS } from '@/lib/types';
import { useLibrary } from '@/contexts/LibraryContext';
import SidebarPlaylistItem from './SidebarPlaylistItem';

const NAV_ITEMS = [
  { href: '/', label: 'Library', icon: Music },
  { href: '/playlists', label: 'Playlists', icon: ListMusic },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/queue', label: 'Queue', icon: ListOrdered },
  { href: '/moods', label: 'Smart Moods', icon: Brain },
  { href: '/youtube', label: 'YouTube to Lib', icon: Download },
  { href: '/youtube-to-mp3', label: 'YouTube to MP3', icon: Disc3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { playlists, songs } = useLibrary();

  return (
    <aside
      className={`h-full flex flex-col glass-strong transition-all duration-300 relative overflow-hidden ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-24 h-24 bg-accent/5 rounded-full blur-[50px] pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border/50 relative z-10">
        <div className="relative flex-shrink-0">
          <img src="/icon.png" alt="Star Player" className="w-7 h-7" style={{ imageRendering: 'pixelated' }} />
          <div className="absolute inset-0 w-7 h-7 bg-accent/20 rounded-full blur-md" />
        </div>
        {!collapsed && (
          <h1 className="text-lg font-bold bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent transition-all duration-1000">
            Star Player
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-surface-hover transition-all text-text-muted hover:text-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 relative z-10">
        <p className={`text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.2em] px-3 mb-3 ${collapsed ? 'sr-only' : ''}`}>
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-1000 group
                ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/15 to-accent/5 text-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                  isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Mood Shortcuts */}
        {!collapsed && (
          <>
            <div className="pt-5 pb-1">
              <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.2em] px-3 mb-3">
                Moods
              </p>
            </div>
            {ALL_MOODS.map((mood) => {
              const config = MOOD_CONFIG[mood];
              const count = songs.filter((s) => s.mood === mood).length;
              return (
                <Link
                  key={mood}
                  href={`/moods/${encodeURIComponent(mood)}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
                >
                  <span className="text-base">{config.emoji}</span>
                  <span className="truncate">{mood}</span>
                  {count > 0 && (
                    <span className="ml-auto text-[10px] text-text-muted font-medium bg-surface px-2 py-0.5 rounded-full">{count}</span>
                  )}
                </Link>
              );
            })}
          </>
        )}

        {/* Playlist shortcuts */}
        {!collapsed && playlists.length > 0 && (
          <>
            <div className="pt-5 pb-1">
              <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.2em] px-3 mb-3">
                Playlists
              </p>
            </div>
            {playlists.slice(0, 5).map((pl) => (
              <SidebarPlaylistItem key={pl.id} playlist={pl} />
            ))}
          </>
        )}
      </nav>

      {/* Storage indicator */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border/50 relative z-10">
          <p className="text-[10px] text-text-muted/60 font-medium uppercase tracking-wider">
            {songs.length} song{songs.length !== 1 ? 's' : ''} • {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </aside>
  );
}
