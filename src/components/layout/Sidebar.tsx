'use client';
// ============================================================
// Star Player — Sidebar (Desktop) + Mobile Tab Bar + More Sheet
// Premium Spotify / Apple Music inspired mobile navigation
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
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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

// Primary tabs shown in the bottom bar
const MOBILE_PRIMARY = [
  { href: '/', label: 'Library', icon: Music },
  { href: '/moods', label: 'Moods', icon: Brain },
  { href: '/youtube', label: 'Download', icon: Download },
  { href: '/playlists', label: 'Playlists', icon: ListMusic },
];

// Items shown in the "More" bottom sheet
const MOBILE_MORE = [
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/queue', label: 'Queue', icon: ListOrdered },
  { href: '/youtube-to-mp3', label: 'YouTube to MP3', icon: Disc3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { playlists, songs } = useLibrary();

  // Close the "More" sheet on route change
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Check if current path matches a "More" item (to highlight the More tab)
  const isMoreActive = MOBILE_MORE.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
  );

  return (
    <>
      {/* ═══════ Desktop Sidebar — Smoothed ═══════ */}
      <div className="relative h-full flex-shrink-0 z-50">
        <aside
          className={`h-full hidden md:flex flex-col glass-strong transition-all duration-500 ease-in-out relative overflow-hidden ${
            collapsed ? 'w-[72px]' : 'w-[260px]'
          }`}
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-20 right-0 w-24 h-24 bg-accent/5 rounded-full blur-[50px] pointer-events-none" />

          <Link 
            href="/" 
            className="flex items-center gap-3 px-4 py-5 border-b border-border/50 relative z-10 overflow-hidden min-h-[73px] hover:bg-white/5 transition-colors group/logo"
          >
            <div className="relative flex-shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ transform: collapsed ? 'translateX(8px)' : 'none' }}>
              <img src="/icon.png" alt="Star Player" className="w-8 h-8 group-hover/logo:scale-110 transition-transform" style={{ imageRendering: 'pixelated' }} />
              <div className="absolute inset-0 w-8 h-8 bg-accent/20 rounded-full blur-md" />
            </div>
            
            <div className={`flex items-center justify-between flex-1 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              collapsed ? 'opacity-0 invisible -translate-x-10' : 'opacity-100 visible translate-x-0'
            }`}>
              <h1 className="text-lg font-bold bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent whitespace-nowrap">
                Star Player
              </h1>
            </div>
          </Link>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 relative z-10 custom-scrollbar">
            <p className={`text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.2em] px-3 mb-3 transition-all duration-500 ${
              collapsed ? 'opacity-0 translate-x-[-10px]' : 'opacity-100'
            }`}>
              Menu
            </p>

            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-accent/15 to-accent/5 text-accent shadow-sm'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                      isActive ? 'text-accent scale-110' : 'text-text-muted group-hover:text-text-primary group-hover:scale-110'
                    }`}
                  />
                  <span className={`transition-all duration-500 ease-in-out whitespace-nowrap overflow-hidden ${
                    collapsed ? 'opacity-0 w-0 -translate-x-4' : 'opacity-100 w-auto translate-x-0'
                  }`}>
                    {item.label}
                  </span>
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full" />
                  )}
                </Link>
              );
            })}

            <div className={`transition-all duration-500 ${collapsed ? 'opacity-0 translate-x-[-10px]' : 'opacity-100'}`}>
              <div className="pt-6 pb-2">
                <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.2em] px-3">Moods</p>
              </div>
              <div className="space-y-0.5">
                {ALL_MOODS.map((mood) => {
                  const config = MOOD_CONFIG[mood];
                  const count = songs.filter((s) => s.mood === mood).length;
                  return (
                    <Link
                      key={mood}
                      href={`/moods/view?mood=${encodeURIComponent(mood)}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all group overflow-hidden"
                    >
                      <span className="text-base group-hover:scale-125 transition-transform">{config.emoji}</span>
                      <span className={`whitespace-nowrap transition-all duration-500 ${collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                        {mood}
                      </span>
                      {count > 0 && !collapsed && (
                        <span className="ml-auto text-[10px] text-text-muted font-medium bg-surface px-2 py-0.5 rounded-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {playlists.length > 0 && (
              <div className={`transition-all duration-500 ${collapsed ? 'opacity-0 translate-x-[-10px]' : 'opacity-100'}`}>
                <div className="pt-6 pb-2">
                  <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-[0.2em] px-3">Playlists</p>
                </div>
                <div className="space-y-0.5">
                  {playlists.slice(0, 5).map((pl) => (
                    <div key={pl.id} className="overflow-hidden">
                      <SidebarPlaylistItem playlist={pl} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>

          <div className={`px-4 py-4 border-t border-border/50 relative z-10 transition-all duration-500 ${
            collapsed ? 'opacity-0 -translate-y-4 h-0 py-0' : 'opacity-100 h-auto'
          }`}>
            <p className="text-[10px] text-text-muted/60 font-medium uppercase tracking-wider whitespace-nowrap">
              {songs.length} song{songs.length !== 1 ? 's' : ''} • {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </aside>

        {/* Floating Toggle Button — Overlapping the border */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-[-12px] top-7 z-[60] w-6 h-6 bg-surface border border-border/50 rounded-full flex items-center justify-center text-text-muted hover:text-accent hover:border-accent hover:scale-110 transition-all shadow-lg md:flex hidden"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ═══════ Mobile "More" Bottom Sheet Overlay ═══════ */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMoreOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
          
          {/* Sheet */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border/50 rounded-t-2xl animate-slide-up safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-text-muted/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-base font-semibold text-text-primary">More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-hover text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu items */}
            <div className="px-3 pb-5 space-y-0.5">
              {MOBILE_MORE.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary active:bg-surface-hover'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                    <span className="text-[15px] font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Quick stats */}
            <div className="px-5 py-3 border-t border-border/30">
              <p className="text-[11px] text-text-muted/60 font-medium text-center">
                {songs.length} song{songs.length !== 1 ? 's' : ''} • {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Mobile Bottom Tab Bar (Apple Music Style) ═══════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom bg-[#1a1a1a]/80 backdrop-blur-[25px] border-t border-white/[0.08]">
        <div className="relative flex items-end justify-around h-[50px] px-2">
          {MOBILE_PRIMARY.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === '/moods' && pathname?.startsWith('/moods')) ||
              (item.href === '/youtube' && (pathname === '/youtube' || pathname === '/youtube-to-mp3'));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 pb-1 pt-1 group"
              >
                <Icon className={`w-6 h-6 transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-[#8e8e93] group-active:text-accent/70'
                }`} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] leading-tight font-medium transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-[#8e8e93]'
                }`}>{item.label}</span>
              </Link>
            );
          })}

          {/* "More" tab */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center justify-center gap-1 flex-1 pb-1 pt-1 group"
          >
            <MoreHorizontal className={`w-6 h-6 transition-colors duration-200 ${
              isMoreActive || moreOpen ? 'text-accent' : 'text-[#8e8e93] group-active:text-accent/70'
            }`} strokeWidth={isMoreActive || moreOpen ? 2.5 : 2} />
            <span className={`text-[10px] leading-tight font-medium transition-colors duration-200 ${
              isMoreActive || moreOpen ? 'text-accent' : 'text-[#8e8e93]'
            }`}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
