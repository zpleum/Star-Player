import Link from 'next/link';
import { ChevronLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
      {/* Subtle Background Detail */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-fade-in">
        {/* Minimal Icon */}
        <div className="mb-10 text-accent/80">
          <Compass className="w-16 h-16" strokeWidth={1} />
        </div>

        {/* 404 Tag */}
        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase mb-6 border border-accent/20">
          Error 404
        </span>

        {/* English Messaging */}
        <div className="text-center space-y-3 mb-12">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Lost in the silence?
          </h1>
          <p className="text-text-secondary text-lg font-medium opacity-70">
            The track or page you are looking for doesn't exist or has been moved to another frequency.
          </p>
        </div>

        {/* Clean Action Button */}
        <Link 
          href="/"
          className="group flex items-center gap-2 px-8 py-3.5 bg-surface border border-border hover:border-accent/40 hover:bg-surface-hover text-text-primary rounded-xl font-semibold transition-all duration-300"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Library
        </Link>
      </div>
    </div>
  );
}
