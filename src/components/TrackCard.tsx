import React, { useState, useRef, useEffect } from 'react';
import { Song } from '../types';
import {
  Play,
  Pause,
  Share2,
  Heart,
  Music,
  Sparkles,
  MoreVertical,
  ListStart,
  ListEnd,
} from 'lucide-react';
import { TrackArtwork } from './TrackArtwork';

interface TrackCardProps {
  song: Song;
  isPlaying: boolean;
  isCurrentSong: boolean;
  isFavorite: boolean;
  onPlay: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onOpenArtist: (artistName: string) => void;
  onShare: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onToast?: (message: string) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  song,
  isPlaying,
  isCurrentSong,
  isFavorite,
  onPlay,
  onToggleFavorite,
  onOpenArtist,
  onShare,
  onPlayNext,
  onAddToQueue,
  onToast,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handlePlayNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onPlayNext) {
      onPlayNext(song);
    }
  };

  const handleAddToBottomClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onAddToQueue) {
      onAddToQueue(song);
    }
  };

  return (
    <div
      id={`track-card-${song.id}`}
      className={`glass-card group relative flex flex-col overflow-visible p-3.5 ${
        isCurrentSong
          ? 'bg-[var(--bg-canvas)] accent-glow scale-[1.01]'
          : ''
      }`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full bg-[var(--bg-canvas)]" style={{ clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))' }}>
        <TrackArtwork
          coverUrl={song.coverUrl}
          title={song.title}
          artist={song.artist}
          youtubeId={song.youtubeId}
          streamUrl={song.streamUrl}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
          containerClassName="w-full h-full"
        />

        {/* Gradient dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-obsidian)] via-transparent to-transparent opacity-80" />

        {/* Favorite button */}
        <button
          id={`fav-btn-${song.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(song);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:scale-110 transition-transform"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-[#bfc0d1]'
            }`}
          />
        </button>

        {/* Play/Pause Button on Hover or when Current Song */}
        <button
          id={`play-btn-${song.id}`}
          onClick={() => onPlay(song)}
          className={`absolute inset-0 m-auto w-12 h-12 flex items-center justify-center transition-all duration-300 bg-[var(--bg-obsidian)] text-[var(--primary-neon)] ${
            isCurrentSong
              ? 'opacity-100 accent-glow scale-100'
              : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--primary-neon)] hover:text-black hover:scale-110 accent-glow'
          }`}
          style={{ clipPath: 'polygon(0 4px, 4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))' }}
          title={isCurrentSong && isPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentSong && isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Info Details */}
      <div className="mt-3 flex flex-col flex-1">
        <h3
          title={song.title}
          className={`font-mono font-bold text-sm line-clamp-1 transition-colors uppercase ${
            isCurrentSong ? 'text-[var(--primary-neon)] drop-shadow-[0_0_8px_var(--primary-neon)]' : 'text-white'
          }`}
        >
          {song.title}
        </h3>

        <p
          onClick={(e) => {
            e.stopPropagation();
            onOpenArtist(song.artist);
          }}
          className="text-xs font-mono text-[var(--secondary-neon)] opacity-80 hover:opacity-100 cursor-pointer line-clamp-1 mt-0.5 transition-opacity uppercase"
          title={`Explore ${song.artist}`}
        >
          {song.artist}
        </p>

        {/* Track Action Utilities */}
        <div className="mt-3 pt-2 flex items-center justify-between text-[10px] text-[var(--tertiary-neon)] font-mono relative">
          <div className="flex items-center gap-1 opacity-70 min-w-0">
            <Music className="w-3 h-3 text-[var(--tertiary-neon)] flex-shrink-0" />
            <span className="line-clamp-1 max-w-[75px] text-[11px]">{song.album || 'Single'}</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Share action */}
            <button
              id={`share-btn-${song.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onShare(song);
              }}
              title="Share track link"
              className="p-1 rounded-full hover:text-white hover:bg-[#31323e] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* 3-Dots Menu for Queue Actions */}
            <div className="relative" ref={menuRef}>
              <button
                id={`track-menu-btn-${song.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                title="Queue options"
                className="p-1 rounded-full text-[#bfc0d1]/70 hover:text-white hover:bg-[#60519b]/30 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Glassmorphic Dropdown Menu */}
              {menuOpen && (
                <div
                  id={`track-menu-dropdown-${song.id}`}
                  className="absolute right-0 bottom-full mb-1.5 w-48 rounded-xl bg-[#1e202c]/95 backdrop-blur-xl border border-[#31323e] shadow-2xl p-1 z-30 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    id={`menu-play-next-${song.id}`}
                    onClick={handlePlayNextClick}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs font-semibold text-[#bfc0d1] hover:text-white hover:bg-[#60519b]/30 rounded-lg transition-colors"
                  >
                    <ListStart className="w-3.5 h-3.5 text-[#60519b]" />
                    <span>Play Next</span>
                  </button>

                  <button
                    id={`menu-add-bottom-${song.id}`}
                    onClick={handleAddToBottomClick}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs font-semibold text-[#bfc0d1] hover:text-white hover:bg-[#60519b]/30 rounded-lg transition-colors"
                  >
                    <ListEnd className="w-3.5 h-3.5 text-[#60519b]" />
                    <span>Add to Bottom of Queue</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
