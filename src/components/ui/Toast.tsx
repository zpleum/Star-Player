'use client';
// ============================================================
// Star Player — Enhanced Toast Notification System
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X, Heart, Music2, Sparkles, Download } from 'lucide-react';
import { type Toast } from '@/lib/types';

export default function ToastContainer() {
  const { toasts, dismissToast } = useLibrary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  let Icon = Info;
  let colorClass = 'text-blue-400';
  let bgClass = 'border-blue-500/20';
  let progressColor = 'bg-blue-500';

  switch (toast.type) {
    case 'success':
      Icon = CheckCircle2;
      colorClass = 'text-emerald-400';
      bgClass = 'border-emerald-500/20';
      progressColor = 'bg-emerald-500';
      break;
    case 'error':
      Icon = XCircle;
      colorClass = 'text-red-400';
      bgClass = 'border-red-500/20';
      progressColor = 'bg-red-500';
      break;
    case 'warning':
      Icon = AlertCircle;
      colorClass = 'text-orange-400';
      bgClass = 'border-orange-500/20';
      progressColor = 'bg-orange-500';
      break;
    case 'favorite':
      Icon = Heart;
      colorClass = 'text-pink-400';
      bgClass = 'border-pink-500/20';
      progressColor = 'bg-pink-500';
      break;
    case 'playlist':
      Icon = Music2;
      colorClass = 'text-purple-400';
      bgClass = 'border-purple-500/20';
      progressColor = 'bg-purple-500';
      break;
    case 'mood':
      Icon = Sparkles;
      colorClass = 'text-teal-400';
      bgClass = 'border-teal-500/20';
      progressColor = 'bg-teal-500';
      break;
    case 'download':
      Icon = Download;
      colorClass = 'text-cyan-400';
      bgClass = 'border-cyan-500/20';
      progressColor = 'bg-cyan-500';
      break;
  }

  return (
    <div
      className={`pointer-events-auto relative group flex items-start gap-4 px-5 py-4 bg-surface/85 backdrop-blur-2xl border ${bgClass} rounded-2xl animate-slide-down overflow-hidden ring-1 ring-white/5`}
      style={{ '--toast-duration': `${toast.duration || 3000}ms` } as any}
    >
      {/* Background Glow Overlay */}
      <div className={`absolute -left-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-3xl opacity-10 ${progressColor} pointer-events-none`} />
      
      {/* Icon with background */}
      <div className={`flex-shrink-0 p-2.5 rounded-xl bg-white/5 border border-white/5`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h4 className="text-[13px] font-bold text-text-primary uppercase tracking-wider mb-1 opacity-90">{toast.type}</h4>
        <p className="text-sm text-text-secondary leading-relaxed font-medium">{toast.message}</p>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 mt-0.5 p-1.5 text-text-muted hover:text-text-primary hover:bg-white/10 rounded-lg transition-all duration-200"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar Loader */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
        <div 
          className={`h-full ${progressColor} animate-shrink opacity-60`} 
        />
      </div>
    </div>
  );
}
