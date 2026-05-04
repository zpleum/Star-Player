'use client';
// ============================================================
// Star Player — Enhanced Toast Notification System
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X, Heart, Music2, Sparkles, Download } from 'lucide-react';
import { type Toast } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function ToastContainer() {
  const { toasts, dismissToast } = useLibrary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[110px] md:bottom-28 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none w-max max-w-[90vw]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 3000;
    // Trigger the exit animation 300ms before it actually gets removed from the DOM
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(0, duration - 300));
    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  let Icon = Info;
  let colorClass = 'text-blue-400';
  let bgClass = 'border-blue-500/10';

  switch (toast.type) {
    case 'success':
      Icon = CheckCircle2;
      colorClass = 'text-emerald-400';
      bgClass = 'border-emerald-500/10';
      break;
    case 'error':
      Icon = XCircle;
      colorClass = 'text-red-400';
      bgClass = 'border-red-500/10';
      break;
    case 'warning':
      Icon = AlertCircle;
      colorClass = 'text-orange-400';
      bgClass = 'border-orange-500/10';
      break;
    case 'favorite':
      Icon = Heart;
      colorClass = 'text-pink-400';
      bgClass = 'border-pink-500/10';
      break;
    case 'playlist':
      Icon = Music2;
      colorClass = 'text-purple-400';
      bgClass = 'border-purple-500/10';
      break;
    case 'mood':
      Icon = Sparkles;
      colorClass = 'text-teal-400';
      bgClass = 'border-teal-500/10';
      break;
    case 'download':
      Icon = Download;
      colorClass = 'text-cyan-400';
      bgClass = 'border-cyan-500/10';
      break;
  }

  return (
    <div
      onClick={handleDismiss}
      className={`pointer-events-auto cursor-pointer flex items-center gap-3 px-4 py-3 bg-surface/90 backdrop-blur-xl border ${bgClass} rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] ring-1 ring-white/5 overflow-hidden relative transition-all duration-300 ease-in-out ${
        isExiting ? 'opacity-0 translate-y-4 scale-95' : 'animate-slide-up opacity-100'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />
      <p className="text-[13px] font-medium text-text-primary pr-2 leading-none">{toast.message}</p>
    </div>
  );
}
