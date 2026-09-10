import React, { useEffect, useRef } from 'react';
import { Song, LyricsData } from '../types';
import { X, Mic2, Music2 } from 'lucide-react';
import { TrackArtwork } from './TrackArtwork';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  lyricsData: LyricsData | null;
  currentTime: number;
  onSeek: (timeInSeconds: number) => void;
  isLoading: boolean;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  song,
  lyricsData,
  currentTime,
  onSeek,
  isLoading,
}) => {
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Find index of current lyric line
  let activeIndex = -1;
  if (lyricsData?.synced && lyricsData.lines.length > 0) {
    for (let i = lyricsData.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsData.lines[i].time - 0.2) {
        activeIndex = i;
        break;
      }
    }
  }

  // Smooth auto-scroll to active lyric line
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  if (!isOpen || !song) return null;

  return (
    <div
      id="lyrics-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="lyrics-modal-card"
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl glass border border-[rgba(191,192,209,0.15)] shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with track details */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#31323e] bg-[#0a0a0f]/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border border-[#31323e] flex-shrink-0">
              <TrackArtwork
                coverUrl={song.coverUrl}
                title={song.title}
                artist={song.artist}
                youtubeId={song.youtubeId}
                streamUrl={song.streamUrl}
                className="w-full h-full object-cover"
                iconClassName="w-5 h-5"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-[#60519b]" />
                <h3 className="font-bold text-white text-base line-clamp-1">{song.title}</h3>
              </div>
              <p className="text-xs opacity-60">{song.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lyricsData?.synced && (
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full bg-[#60519b]/25 text-[#bfc0d1] border border-[#60519b]/40">
                Synced Lyrics
              </span>
            )}
            <button
              id="lyrics-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#bfc0d1]/70 hover:text-white hover:bg-[#31323e] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-5 text-center min-h-[320px]"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#bfc0d1]/70">
              <div className="w-8 h-8 rounded-full border-2 border-[#60519b] border-t-transparent animate-spin" />
              <p className="text-sm">Fetching lyrics from LRCLIB...</p>
            </div>
          ) : lyricsData?.synced && lyricsData.lines.length > 0 ? (
            lyricsData.lines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPassed = idx < activeIndex;
              return (
                <p
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-xl select-text ${
                    isActive
                      ? 'text-2xl md:text-3xl font-bold text-white scale-105 drop-shadow-[0_0_15px_rgba(96,81,155,0.9)] bg-[#60519b]/20'
                      : isPassed
                      ? 'text-lg text-[#bfc0d1]/40 hover:text-[#bfc0d1]'
                      : 'text-lg text-[#bfc0d1]/70 hover:text-[#bfc0d1] hover:scale-102'
                  }`}
                >
                  {line.text}
                </p>
              );
            })
          ) : lyricsData?.plain ? (
            <div className="whitespace-pre-line text-lg leading-relaxed text-[#bfc0d1]/90 font-medium select-text max-w-lg mx-auto">
              {lyricsData.plain}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#bfc0d1]/60">
              <Music2 className="w-12 h-12 text-[#bfc0d1]/30" />
              <p className="text-sm">No synchronized lyrics found for this title.</p>
              <p className="text-xs text-[#bfc0d1]/40">Try another track or search for official titles.</p>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-6 py-3 border-t border-[#31323e] bg-[#0a0a0f]/40 text-center text-xs opacity-60">
          Tip: Click on any lyric line to jump playback directly to that timestamp.
        </div>
      </div>
    </div>
  );
};
