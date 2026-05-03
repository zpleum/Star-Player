'use client';
import { useLibrary } from '@/contexts/LibraryContext';
import ConfirmDialog from './ConfirmDialog';

export default function GlobalErrorModal() {
  const { errorModal, closeErrorPopup } = useLibrary();

  return (
    <ConfirmDialog
      isOpen={errorModal.isOpen}
      title={errorModal.title}
      message={errorModal.message}
      confirmLabel="I Understand"
      cancelLabel=""
      isDestructive={true}
      onConfirm={closeErrorPopup}
      onCancel={() => {}}
    />
  );
}
