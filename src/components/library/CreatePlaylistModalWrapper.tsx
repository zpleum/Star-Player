'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import CreatePlaylistModal from './CreatePlaylistModal';

export default function CreatePlaylistModalWrapper() {
  const { isCreatePlaylistModalOpen, closeCreatePlaylistModal } = useLibrary();
  
  return (
    <CreatePlaylistModal 
      isOpen={isCreatePlaylistModalOpen} 
      onClose={closeCreatePlaylistModal} 
    />
  );
}
