import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { LibraryProvider } from '@/contexts/LibraryContext';
import Sidebar from '@/components/layout/Sidebar';
import BottomPlayer from '@/components/player/BottomPlayer';
import FullPlayer from '@/components/player/FullPlayer';
import ToastContainer from '@/components/ui/Toast';
import GlobalContextMenu from '@/components/ui/GlobalContextMenu';
import PlaylistContextMenu from '@/components/ui/PlaylistContextMenu';
import GlobalErrorModal from '@/components/ui/GlobalErrorModal';
import AmbientBackground from '@/components/layout/ambient-background';
import CreatePlaylistModalWrapper from '@/components/library/CreatePlaylistModalWrapper';
import CapacitorBackButton from '@/components/layout/CapacitorBackButton';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Star Player',
  description: 'A premium, fully offline music player',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased dark`}>
      <body className="h-full flex flex-col overflow-hidden bg-background text-foreground">
        <LibraryProvider>
          <PlayerProvider>
            <AmbientBackground />
            <CreatePlaylistModalWrapper />
            <CapacitorBackButton />
            <GlobalContextMenu />
            <PlaylistContextMenu />
            {/* Main App Layout */}
            <div className="flex-1 flex overflow-hidden relative">
              <Sidebar />
              <main className="flex-1 overflow-hidden relative flex flex-col">
                {children}
              </main>
            </div>
            
            {/* Persistent Bottom Player */}
            <BottomPlayer />
            
            {/* Full Screen Player Overlay */}
            <FullPlayer />
            
            {/* Global Toasts */}
            <ToastContainer />

            {/* Global Error Modals */}
            <GlobalErrorModal />
          </PlayerProvider>
        </LibraryProvider>
      </body>
    </html>
  );
}
