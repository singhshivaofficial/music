import React from 'react';
import { ViewTab } from '../types';
import {
  Compass,
  Sparkles,
  Flame,
  History,
  Heart,
  Music4,
  Clock,
} from 'lucide-react';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  historyCount: number;
  favoritesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  historyCount,
  favoritesCount,
}) => {
  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
    {
      id: 'recommended',
      label: 'Recommended For You',
      icon: <Sparkles className="w-4 h-4 text-[#60519b]" />,
    },
    { id: 'trending', label: 'Trending Charts', icon: <Flame className="w-4 h-4 text-amber-400" /> },
    {
      id: 'history',
      label: 'Listening Memory',
      icon: <History className="w-4 h-4" />,
      badge: historyCount,
    },
    {
      id: 'favorites',
      label: 'Saved Favorites',
      icon: <Heart className="w-4 h-4 text-red-400" />,
      badge: favoritesCount,
    },
  ];

  return (
    <aside
      id="aether-sidebar"
      className="hidden md:flex flex-col w-64 bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-[#31323e] py-6 space-y-6 flex-shrink-0"
    >
      {/* Navigation Sections */}
      <div className="space-y-1">
        <p className="px-6 text-[10px] uppercase tracking-[0.2em] opacity-40 mb-3 font-semibold">
          Browse Library
        </p>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between py-2.5 px-6 text-xs sm:text-sm transition-all text-left ${
                isActive
                  ? 'sidebar-active text-white font-medium drop-shadow-[0_0_8px_rgba(96,81,155,0.4)]'
                  : 'opacity-60 hover:opacity-100 hover:text-white text-[#bfc0d1]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#bfc0d1]' : 'opacity-80'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-[#60519b] text-white font-bold' : 'bg-[#31323e] text-[#bfc0d1]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Listening Memory Feature Callout */}
      <div className="mt-auto px-6">
        <div className="glass rounded-2xl p-4 text-center border border-[rgba(191,192,209,0.1)] space-y-2.5">
          <div className="w-8 h-8 rounded-full bg-[#60519b]/20 flex items-center justify-center mx-auto text-[#60519b] mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white">15s Listening Memory</h4>
          <p className="text-[10px] opacity-60 leading-relaxed">
            Full-track listening history is logged continuously to fuel your personalized recommendation feed.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#bfc0d1] font-bold py-1.5 bg-[#1e202c] rounded-lg border border-[#31323e]">
            <Music4 className="w-3 h-3 text-[#60519b]" />
            <span>High-Fidelity 320k</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
