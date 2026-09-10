import React, { useState } from 'react';
import { UserProfile } from '../types';
import { WaveLogo } from './WaveLogo';
import {
  Search,
  X,
  Disc3,
  BarChart2,
  Sparkles,
  Keyboard,
} from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  currentUser: UserProfile;
  onOpenAuth: () => void;
  isVisualizerOpen: boolean;
  onToggleVisualizer: () => void;
  onOpenShortcuts?: () => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  currentUser,
  onOpenAuth,
  isVisualizerOpen,
  onToggleVisualizer,
  onOpenShortcuts,
  onGoHome,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearchSubmit(localQuery);
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
  };

  const handleHomeClick = () => {
    handleClear();
    if (onGoHome) onGoHome();
  };

  return (
    <header
      id="aether-navbar"
      className="sticky top-0 z-30 w-full bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-[#31323e] px-4 sm:px-8 py-3 transition-all"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand */}
        <div onClick={handleHomeClick} className="flex items-center gap-3 cursor-pointer flex-shrink-0">
          <WaveLogo className="w-10 h-10 sm:w-12 sm:h-12 hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(0,255,136,0.4)]" />

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[var(--primary-neon)] font-mono" style={{ textShadow: '2px 0 var(--secondary-neon), -2px 0 var(--tertiary-neon)' }}>
                wave
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 max-w-lg relative flex items-center"
        >
          <div className="relative w-full flex items-center group">
            <span className="absolute left-3.5 text-[var(--primary-neon)] font-mono font-bold animate-pulse">&gt;</span>
            <input
              id="aether-search-input"
              type="text"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                onSearchChange(e.target.value);
              }}
              placeholder="SEARCH DATABASE_"
              className="w-full pl-8 pr-14 py-2 bg-[var(--bg-canvas)] border border-[var(--border-glass)] focus:border-[var(--primary-neon)] focus:ring-1 focus:ring-[var(--primary-neon)] text-xs sm:text-sm text-[var(--text-lavender)] font-mono placeholder-[var(--tertiary-neon)] placeholder-opacity-50 outline-none transition-all"
              style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
            />
            {localQuery ? (
              <button
                type="button"
                id="search-clear-btn"
                onClick={handleClear}
                className="absolute right-3.5 p-1 text-[var(--secondary-neon)] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:flex items-center absolute right-3 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--primary-neon)] border border-[var(--primary-neon)] bg-[var(--primary-neon)]/10">
                /
              </span>
            )}
          </div>
        </form>

        {/* Right Tools: Shortcuts, Visualizer & User */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Keyboard Shortcuts button */}
          {onOpenShortcuts && (
            <button
              id="nav-shortcuts-btn"
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts Guide (?)"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium glass text-[#bfc0d1] hover:text-white hover:bg-[#31323e] transition-all"
            >
              <Keyboard className="w-4 h-4 text-[#60519b]" />
              <span className="hidden lg:inline text-[11px] font-mono text-[#bfc0d1]/80">?</span>
            </button>
          )}

          {/* Quick Visualizer toggle */}
          <button
            id="nav-visualizer-toggle"
            onClick={onToggleVisualizer}
            title={isVisualizerOpen ? 'Hide Visualizer (V)' : 'Open Audio Visualizer (V)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isVisualizerOpen
                ? 'bg-[#60519b] text-white accent-glow font-semibold border border-[#60519b]'
                : 'glass text-[#bfc0d1] hover:text-white hover:bg-[#31323e]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden md:inline">Visualizer</span>
          </button>

          {/* User Account / Guest Button */}
          <button
            id="nav-auth-btn"
            onClick={onOpenAuth}
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-full glass hover:bg-[#31323e] transition-all"
            title="Manage Identity & Listening Memory"
          >
            <img
              src={currentUser.avatar || 'https://api.dicebear.com/7.x/thumbs/svg?seed=avatar'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border-2 border-[#60519b]"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80';
              }}
            />
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-white line-clamp-1">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[#bfc0d1]/60 uppercase tracking-wider">
                {currentUser.isGuest ? 'Guest' : 'Cloud Sync'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
