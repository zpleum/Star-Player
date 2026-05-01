'use client';
// ============================================================
// Star Player — Toast Notification System
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, dismissToast } = useLibrary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClass = 'text-blue-400';
        let bgClass = 'border-blue-500/30';

        switch (toast.type) {
          case 'success':
            Icon = CheckCircle2;
            colorClass = 'text-emerald-400';
            bgClass = 'border-emerald-500/30';
            break;
          case 'error':
            Icon = XCircle;
            colorClass = 'text-red-400';
            bgClass = 'border-red-500/30';
            break;
          case 'warning':
            Icon = AlertCircle;
            colorClass = 'text-orange-400';
            bgClass = 'border-orange-500/30';
            break;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-surface/95 backdrop-blur-md border ${bgClass} rounded-xl shadow-lg animate-slide-up min-w-[280px] max-w-sm`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${colorClass}`} />
            <p className="text-sm font-medium text-text-primary flex-1">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface-hover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
