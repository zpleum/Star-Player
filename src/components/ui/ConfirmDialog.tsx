import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  verificationChallenge?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  verificationChallenge,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [verifyInput, setVerifyInput] = React.useState('');

  // Reset input when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setVerifyInput('');
    }
  }, [isOpen]);

  const isConfirmDisabled = verificationChallenge ? verifyInput !== verificationChallenge : false;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-2">
            <div className={`p-2 rounded-full flex-shrink-0 ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 mt-0.5">
              <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
            </div>
          </div>

          {verificationChallenge && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-bold">
                Please type the following to confirm:
              </p>
              <p className="text-xs text-red-400 bg-red-400/5 p-3 rounded-xl border border-red-400/10 mb-4 select-none font-medium leading-relaxed italic">
                "{verificationChallenge}"
              </p>
              <input
                type="text"
                autoComplete="off"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-all placeholder:text-text-muted/30"
                placeholder="Type here..."
              />
              <p className="text-[9px] text-text-muted mt-2 text-center">
                Copy/Paste is disabled. You must type the phrase manually.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/5 border-t border-white/5">
          {cancelLabel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          {confirmLabel && (
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
                isDestructive
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-accent hover:bg-accent-hover'
              }`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
