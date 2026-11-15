import { Menu, Search, X, Plus, Sun, Moon } from 'lucide-react';
import type { Channel } from '../types';
import { MonochromeImage } from './MonochromeImage';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onToggleSidebar: () => void;
  onNavigateHome: () => void;
  onOpenUpload: () => void;
  onOpenPilotChannel: () => void;
  pilotChannel: Channel | undefined;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  onToggleSidebar,
  onNavigateHome,
  onOpenUpload,
  onOpenPilotChannel,
  pilotChannel,
  isDark,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white/95 dark:bg-[#090909]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 flex items-center justify-between gap-4">
      {/* Left: Menu + Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900 dark:focus-visible:outline-white rounded-md"
        >
          <span className="w-8 h-6 rounded-md bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="18" cy="18" r="2.5" />
              <path d="M8 8l8 8M16 8l-8 8" />
              <rect x="10" y="10" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="font-display font-bold text-lg tracking-tight text-neutral-950 dark:text-white">
            Droner.cloud
          </span>
        </button>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-xl hidden sm:flex items-center">
        <div className="relative flex w-full items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search flights, airframes, locations..."
            aria-label="Search flights"
            className="w-full h-10 pl-4 pr-20 rounded-full bg-neutral-100 dark:bg-[#141414] border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-950 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-12 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Search"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('input[aria-label="Search flights"]');
              input?.focus();
            }}
            className="absolute right-0 h-10 w-12 rounded-r-full border-l border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 transition-colors"
          >
            <Search className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Right: Upload + Theme + Pilot Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenUpload}
          className="h-9 px-3.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={2.2} />
          <span>Upload</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to Light Monochrome' : 'Switch to Dark Monochrome'}
          title={isDark ? 'Light Monochrome' : 'Dark Monochrome'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" strokeWidth={1.75} /> : <Moon className="w-4 h-4" strokeWidth={1.75} />}
        </button>

        <button
          type="button"
          onClick={onOpenPilotChannel}
          aria-label="Open my pilot channel"
          className="w-9 h-9 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 hover:border-neutral-950 dark:hover:border-white transition-colors shrink-0 cursor-pointer"
        >
          <MonochromeImage
            src={pilotChannel?.avatarUrl || ''}
            alt={pilotChannel?.name || 'Pilot channel'}
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}
