import React, { useState } from 'react';
import { Song, RepeatMode } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Mic2,
  Share2,
  BarChart2,
  Maximize2,
  Sparkles,
  Infinity as InfinityIcon,
  ListMusic,
} from 'lucide-react';
import { TrackArtwork } from './TrackArtwork';

interface BottomPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isAutoplay: boolean;
  isLyricsOpen: boolean;
  isVisualizerOpen: boolean;
  isQueueOpen: boolean;
  queueCount: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleAutoplay: () => void;
  onToggleQueue: () => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleLyrics: () => void;
  onToggleVisualizer: () => void;
  onOpenArtist: (artist: string) => void;
  onShare: (song: Song) => void;
  onToast?: (message: string) => void;
  onOpenShortcuts?: () => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  repeatMode,
  isShuffle,
  isAutoplay,
  isLyricsOpen,
  isVisualizerOpen,
  isQueueOpen,
  queueCount,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onToggleRepeat,
  onToggleShuffle,
  onToggleAutoplay,
  onToggleQueue,
  onVolumeChange,
  onToggleMute,
  onToggleLyrics,
  onToggleVisualizer,
  onOpenArtist,
  onShare,
  onToast,
  onOpenShortcuts,
}) => {
  if (!currentSong) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <footer
      id="aether-bottom-player-dock"
      className="fixed bottom-0 left-0 right-0 z-40 h-24 glass border-t border-[#31323e] flex items-center px-4 sm:px-8 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] transition-all"
    >
      {/* Top Seekable Glowing Progress Bar Line */}
      <div
        id="player-progress-bar-track"
        className="absolute top-0 left-0 w-full h-[3px] bg-[#31323e] group cursor-pointer hover:h-[5px] transition-all"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          onSeek(ratio * duration);
        }}
      >
        <div
          className="h-full bg-[#60519b] accent-glow relative transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Song details & Cover thumbnail */}
        <div className="flex items-center gap-3.5 min-w-0 w-1/4 sm:w-1/3">
          <div className="relative group flex-shrink-0">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-[#31323e] shadow-md transition-all ${
                isPlaying ? 'ring-2 ring-[#60519b] accent-glow' : ''
              }`}
            >
              <TrackArtwork
                coverUrl={currentSong.coverUrl}
                title={currentSong.title}
                artist={currentSong.artist}
                youtubeId={currentSong.youtubeId}
                streamUrl={currentSong.streamUrl}
                className="w-full h-full object-cover"
                iconClassName="w-5 h-5"
              />
            </div>
            <button
              onClick={onToggleLyrics}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center text-white transition-opacity"
              title="View lyrics"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4
                title={currentSong.title}
                className="text-sm font-bold text-white line-clamp-1 hover:text-[#bfc0d1] cursor-pointer"
                onClick={onToggleLyrics}
              >
                {currentSong.title}
              </h4>
              <div className="flex items-center gap-1.5">
                <span className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#1e202c] text-[9px] font-semibold text-[#bfc0d1]/90 border border-[#31323e]">
                  <Sparkles className="w-2.5 h-2.5 text-[#60519b]" />
                  Full Audio
                </span>
                {/* Mini Live Equalizer Indicator */}
                <div className="flex items-end gap-0.5 h-3 px-1" title={isPlaying ? 'Playing' : 'Paused'}>
                  <div
                    className={`w-0.5 bg-[#60519b] rounded-full transition-all duration-200 ${
                      isPlaying ? 'h-3 animate-pulse' : 'h-1'
                    }`}
                  />
                  <div
                    className={`w-0.5 bg-white rounded-full transition-all duration-300 ${
                      isPlaying ? 'h-2 animate-bounce' : 'h-1.5'
                    }`}
                  />
                  <div
                    className={`w-0.5 bg-[#60519b] rounded-full transition-all duration-250 ${
                      isPlaying ? 'h-3.5 animate-pulse' : 'h-1'
                    }`}
                  />
                  <div
                    className={`w-0.5 bg-[#bfc0d1] rounded-full transition-all duration-200 ${
                      isPlaying ? 'h-2 animate-bounce' : 'h-1.5'
                    }`}
                  />
                </div>
              </div>
            </div>

            <p
              onClick={() => onOpenArtist(currentSong.artist)}
              className="text-xs opacity-60 hover:opacity-100 hover:text-white cursor-pointer line-clamp-1 transition-opacity"
              title={`Explore ${currentSong.artist}`}
            >
              {currentSong.artist}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls & Timestamp */}
        <div className="flex flex-col items-center justify-center gap-1.5 flex-1 max-w-sm">
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {/* Shuffle */}
            <button
              id="player-shuffle-btn"
              onClick={onToggleShuffle}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
              className={`p-1.5 rounded-full transition-colors ${
                isShuffle
                  ? 'text-[#60519b] drop-shadow-[0_0_8px_rgba(96,81,155,0.8)]'
                  : 'opacity-50 hover:opacity-100 text-[#bfc0d1]'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              id="player-prev-btn"
              onClick={onPrev}
              title="Previous Track (P / K)"
              className="p-1.5 text-white opacity-80 hover:opacity-100 hover:scale-110 transition-all"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              id="player-play-btn"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl hover:scale-105 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              id="player-next-btn"
              onClick={onNext}
              title="Next Track (N / J)"
              className="p-1.5 text-white opacity-80 hover:opacity-100 hover:scale-110 transition-all"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* Repeat */}
            <button
              id="player-repeat-btn"
              onClick={onToggleRepeat}
              title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One'}`}
              className={`p-1.5 rounded-full transition-colors ${
                repeatMode !== 'off'
                  ? 'text-[#60519b] drop-shadow-[0_0_8px_rgba(96,81,155,0.8)]'
                  : 'opacity-50 hover:opacity-100 text-[#bfc0d1]'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>

            {/* Autoplay Infinity Mode Toggle */}
            <button
              id="player-autoplay-btn"
              onClick={onToggleAutoplay}
              title={isAutoplay ? 'Autoplay: Infinity Radio On (Continuous Recommendations)' : 'Autoplay: Off'}
              className={`p-1.5 rounded-full transition-all ${
                isAutoplay
                  ? 'text-[#60519b] drop-shadow-[0_0_8px_rgba(96,81,155,0.9)] bg-[#60519b]/15'
                  : 'opacity-40 hover:opacity-90 text-[#bfc0d1]'
              }`}
            >
              <InfinityIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Time indicator */}
          <div className="text-[10px] font-mono tracking-wider opacity-60 flex items-center gap-1">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume, Lyrics, Visualizer, Download & Share */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-3 w-1/4 sm:w-1/3">
          {/* Visualizer Toggle */}
          <button
            id="player-visualizer-toggle"
            onClick={onToggleVisualizer}
            title={isVisualizerOpen ? 'Hide Visualizer (V)' : 'Show Visualizer (V)'}
            className={`p-2 rounded-full border transition-all ${
              isVisualizerOpen
                ? 'bg-[#60519b] border-[#60519b] text-white accent-glow'
                : 'glass text-[#bfc0d1] hover:text-white hover:bg-[#31323e]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          {/* Up Next Queue Toggle */}
          <button
            id="player-queue-toggle"
            onClick={onToggleQueue}
            title="Up Next Queue (Q)"
            className={`relative p-2 rounded-full border transition-all ${
              isQueueOpen
                ? 'bg-[#60519b] border-[#60519b] text-white accent-glow'
                : 'glass text-[#bfc0d1] hover:text-white hover:bg-[#31323e]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-white text-black text-[9px] font-extrabold flex items-center justify-center shadow-md">
                {queueCount > 99 ? '99+' : queueCount}
              </span>
            )}
          </button>

          {/* Share Deep-Link */}
          <button
            id="player-share-btn"
            onClick={() => onShare(currentSong)}
            title="Share Track Deep-Link"
            className="p-2 rounded-full glass hover:text-white hover:bg-[#31323e] transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <button
              id="player-mute-btn"
              onClick={onToggleMute}
              className="text-[#bfc0d1]/70 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              id="player-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 md:w-20 h-1.5 cursor-pointer accent-[#60519b]"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
