'use client';
// ============================================================
// Star Player — Global Search Bar
// ============================================================
import { useLibrary } from '@/contexts/LibraryContext';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useLibrary();

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-text-muted group-focus-within:text-accent transition-colors" />
      </div>
      <input
        type="text"
        placeholder="Search songs, artists, albums..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="block w-full pl-10 pr-10 py-2.5 border border-border rounded-full leading-5 bg-surface/50 text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-all"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <X className="h-4 w-4 text-text-muted hover:text-text-primary transition-colors" />
        </button>
      )}
    </div>
  );
}
