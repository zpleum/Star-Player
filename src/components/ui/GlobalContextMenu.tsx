'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Home, 
  Settings, 
  Music, 
  Heart,
  PlusCircle,
  ExternalLink,
  Sparkles,
  Check
} from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePlayer } from '@/contexts/PlayerContext';

export default function GlobalContextMenu() {
  const router = useRouter();
  const { openCreatePlaylistModal } = useLibrary();
  const { state: playerState, toggleDynamicBackground } = usePlayer();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Don't show if clicking on editable elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // If it's a song row or grid item, they should stop propagation, 
      // but just in case, we check if they clicked something that usually has its own menu
      if (target.closest('[data-custom-context]')) {
        return;
      }

      e.preventDefault();
      
      // Close first to trigger re-open animation
      setVisible(false);
      
      // Set new position and reopen in next tick
      setPos({ x: e.clientX, y: e.clientY });
      setTimeout(() => {
        setVisible(true);
      }, 10);
    };

    const handleClick = () => setVisible(false);
    const handleScroll = () => setVisible(false);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);
    
    // Also listen for contextmenu in capture phase to close global menu when 
    // more specific menus (like song context menu) are triggered.
    const handleGlobalContextMenu = () => setVisible(false);
    window.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    };
  }, []);

  // Ensure menu stays within viewport
  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const padding = 10;

      let newX = pos.x;
      let newY = pos.y;

      if (pos.x + rect.width > window.innerWidth - padding) {
        newX = window.innerWidth - rect.width - padding;
      }
      if (pos.y + rect.height > window.innerHeight - padding) {
        newY = window.innerHeight - rect.height - padding;
      }

      if (newX !== pos.x || newY !== pos.y) {
        setPos({ x: newX, y: newY });
      }
    }
  }, [visible]);

  if (!visible) return null;

  const MenuItem = ({ icon: Icon, label, onClick, danger = false }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg ${
        danger 
          ? 'text-red-400 hover:bg-red-400/10' 
          : 'text-text-primary hover:bg-surface-hover'
      }`}
    >
      <Icon className="w-4 h-4 opacity-70" />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] w-52 py-1.5 rounded-xl glass-strong ring-1 ring-black/10 animate-fade-in border border-white/5"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-0.5">
        <div className="flex items-center justify-between px-3 py-1 mb-1">
          <button 
            onClick={() => { router.back(); setVisible(false); }}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { router.forward(); setVisible(false); }}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { window.location.reload(); }}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-white/5 mx-2 my-1" />

        <MenuItem 
          icon={Home} 
          label="Go to Library" 
          onClick={() => { router.push('/'); setVisible(false); }} 
        />
        <MenuItem 
          icon={Music} 
          label="My Playlists" 
          onClick={() => { router.push('/playlists'); setVisible(false); }} 
        />
        <MenuItem 
          icon={Heart} 
          label="Liked Songs" 
          onClick={() => { router.push('/favorites'); setVisible(false); }} 
        />

        <div className="h-px bg-white/5 mx-2 my-1" />

        <MenuItem 
          icon={PlusCircle} 
          label="Create New Playlist" 
          onClick={() => { openCreatePlaylistModal(); setVisible(false); }} 
        />
        <button
          onClick={() => { toggleDynamicBackground(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors rounded-lg text-text-primary hover:bg-surface-hover"
        >
          <div className="flex items-center gap-3">
            <Sparkles className={`w-4 h-4`} />
            <span>Dynamic BG</span>
          </div>
          {playerState.dynamicBackgroundEnabled && <Check className="w-3.5 h-3.5 text-accent" />}
        </button>
        <MenuItem 
          icon={Settings} 
          label="Settings" 
          onClick={() => { router.push('/settings'); setVisible(false); }} 
        />
        
        <div className="h-px bg-white/5 mx-2 my-1" />
        
        <MenuItem 
          icon={ExternalLink} 
          label="View Source on GitHub" 
          onClick={() => { window.open('https://github.com/zPleum/Star-Player', '_blank'); setVisible(false); }} 
        />
      </div>
    </div>
  );
}
