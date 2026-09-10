import React, { useState } from 'react';
import { Song, RepeatMode } from '../types';
import { TrackArtwork } from './TrackArtwork';
import {
  X,
  Trash2,
  Play,
  Music2,
  Sparkles,
  Infinity as InfinityIcon,
  ChevronUp,
  ChevronDown,
  Plus,
  ListMusic,
  Radio,
  GripVertical,
} from 'lucide-react';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  isPlaying: boolean;
  userQueue: Song[];
  autoplayQueue: Song[];
  isAutoplay: boolean;
  onToggleAutoplay: () => void;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveInQueue: (index: number, direction: 'up' | 'down') => void;
  onReorderQueue?: (fromIndex: number, toIndex: number) => void;
  onClearQueue: () => void;
  onAddToQueue: (song: Song) => void;
  onOpenArtist: (artist: string) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  userQueue,
  autoplayQueue,
  isAutoplay,
  onToggleAutoplay,
  onPlaySong,
  onRemoveFromQueue,
  onMoveInQueue,
  onReorderQueue,
  onClearQueue,
  onAddToQueue,
  onOpenArtist,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const formatDuration = (sec?: number) => {
    if (!sec || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIndex) {
      if (onReorderQueue) {
        onReorderQueue(draggedIdx, targetIndex);
      } else {
        const direction = targetIndex < draggedIdx ? 'up' : 'down';
        onMoveInQueue(draggedIdx, direction);
      }
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div
      id="queue-drawer-overlay"
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        id="queue-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[440px] max-w-full h-full bg-[#13141f]/95 backdrop-blur-2xl border-l border-[#31323e] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#31323e]/80 bg-[#1e202c]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#60519b]/20 border border-[#60519b]/40 flex items-center justify-center text-[#bfc0d1]">
              <ListMusic className="w-4 h-4 text-[#60519b]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Up Next Queue
                <span className="text-xs font-normal text-[#bfc0d1]/60">
                  ({userQueue.length + (isAutoplay ? autoplayQueue.length : 0)} tracks)
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {userQueue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="px-2.5 py-1 text-xs text-[#bfc0d1]/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                title="Clear custom queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#bfc0d1]/70 hover:text-white hover:bg-[#31323e]/60 transition-colors"
              title="Close queue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-32">
          {/* Section 1: Now Playing */}
          {currentSong && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#bfc0d1]/60 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Now Playing
                </span>
                <span className="text-[10px] font-mono text-[#bfc0d1]/50">
                  {formatDuration(currentSong.duration)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#60519b]/20 to-[#31323e]/40 border border-[#60519b]/40 backdrop-blur-md flex items-center gap-3.5 group">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-[#31323e]">
                  <TrackArtwork
                    coverUrl={currentSong.coverUrl}
                    title={currentSong.title}
                    artist={currentSong.artist}
                    youtubeId={currentSong.youtubeId}
                    streamUrl={currentSong.streamUrl}
                    className="w-full h-full object-cover"
                    iconClassName="w-5 h-5"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                      <span className="w-1 h-3 bg-white rounded-full animate-bounce" />
                      <span className="w-1 h-5 bg-white rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate group-hover:text-[#bfc0d1] transition-colors">
                    {currentSong.title}
                  </h4>
                  <p
                    onClick={() => onOpenArtist(currentSong.artist)}
                    className="text-xs text-[#bfc0d1]/70 truncate hover:text-white cursor-pointer transition-colors"
                  >
                    {currentSong.artist}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {currentSong.album && (
                      <span className="text-[10px] text-[#bfc0d1]/50 truncate max-w-[150px]">
                        {currentSong.album}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Next in Queue (User Custom Queue) */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#bfc0d1]/60 flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-[#60519b]" />
                Next in Queue ({userQueue.length})
              </span>
              {userQueue.length > 0 && (
                <span className="text-[11px] text-[#bfc0d1]/50">Plays priority next</span>
              )}
            </div>

            {userQueue.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#31323e] text-center bg-[#1e202c]/20">
                <Music2 className="w-6 h-6 text-[#bfc0d1]/30 mx-auto mb-1.5" />
                <p className="text-xs text-[#bfc0d1]/60 font-medium">No tracks added to queue.</p>
                <p className="text-[11px] text-[#bfc0d1]/40 mt-0.5">
                  Click &ldquo;Add to Queue&rdquo; on any track, or let Autoplay discover music.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {userQueue.map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`group flex items-center gap-2 p-2 rounded-xl border transition-all select-none cursor-grab active:cursor-grabbing ${
                      draggedIdx === index
                        ? 'opacity-40 bg-[#60519b]/20 border-dashed border-[#60519b]'
                        : dragOverIdx === index
                        ? 'bg-[#60519b]/30 border-[#60519b] scale-[1.01]'
                        : 'bg-[#1e202c]/40 hover:bg-[#31323e]/60 border-transparent hover:border-[#31323e]'
                    }`}
                  >
                    {/* Drag Handle & Rank */}
                    <div className="flex items-center gap-1 text-[#bfc0d1]/40 flex-shrink-0">
                      <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[10px] font-mono w-3 text-center text-[#bfc0d1]/50">
                        {index + 1}
                      </span>
                    </div>

                    {/* Reorder Up/Down Buttons */}
                    <div className="flex flex-col items-center justify-center gap-0.5 text-[#bfc0d1]/40 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveInQueue(index, 'up');
                        }}
                        disabled={index === 0}
                        className="p-0.5 hover:text-white disabled:opacity-20 disabled:hover:text-inherit transition-colors"
                        title="Move Up in queue"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveInQueue(index, 'down');
                        }}
                        disabled={index === userQueue.length - 1}
                        className="p-0.5 hover:text-white disabled:opacity-20 disabled:hover:text-inherit transition-colors"
                        title="Move Down in queue"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Thumbnail with Play Hover */}
                    <div
                      onClick={() => onPlaySong(song)}
                      className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border border-[#31323e]"
                    >
                      <TrackArtwork
                        coverUrl={song.coverUrl}
                        title={song.title}
                        artist={song.artist}
                        youtubeId={song.youtubeId}
                        streamUrl={song.streamUrl}
                        className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                        iconClassName="w-4 h-4"
                      />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/40 transition-opacity">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        onClick={() => onPlaySong(song)}
                        className="text-xs font-semibold text-white truncate cursor-pointer hover:text-[#bfc0d1]"
                      >
                        {song.title}
                      </p>
                      <p
                        onClick={() => onOpenArtist(song.artist)}
                        className="text-[11px] text-[#bfc0d1]/60 truncate cursor-pointer hover:text-white"
                      >
                        {song.artist}
                      </p>
                    </div>

                    {/* Duration & Remove */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono text-[#bfc0d1]/50">
                        {formatDuration(song.duration)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromQueue(index);
                        }}
                        className="p-1 rounded-md text-[#bfc0d1]/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove from queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Autoplay Recommendations (Infinity Mode) */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#bfc0d1]/60 flex items-center gap-1.5">
                  <InfinityIcon className="w-3.5 h-3.5 text-[#60519b]" />
                  Autoplay Recommendations
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#60519b]/25 text-[#bfc0d1] border border-[#60519b]/40">
                  Dynamic Radio
                </span>
              </div>

              {/* Autoplay Toggle */}
              <button
                onClick={onToggleAutoplay}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                  isAutoplay
                    ? 'bg-[#60519b] border-[#60519b] text-white shadow-[0_0_10px_rgba(96,81,155,0.5)]'
                    : 'bg-[#1e202c] border-[#31323e] text-[#bfc0d1]/60 hover:text-white'
                }`}
                title="Toggle Infinite Autoplay"
              >
                <InfinityIcon className="w-3 h-3" />
                <span>{isAutoplay ? 'Active' : 'Off'}</span>
              </button>
            </div>

            {!isAutoplay ? (
              <div className="p-4 rounded-xl border border-[#31323e] bg-[#1e202c]/20 text-center">
                <Radio className="w-5 h-5 text-[#bfc0d1]/40 mx-auto mb-1" />
                <p className="text-xs text-[#bfc0d1]/70 font-medium">Autoplay is turned off</p>
                <p className="text-[11px] text-[#bfc0d1]/40 mt-0.5">
                  Enable Autoplay to continuously stream similar songs when queue finishes.
                </p>
                <button
                  onClick={onToggleAutoplay}
                  className="mt-2.5 px-3 py-1 text-xs font-semibold rounded-lg bg-[#60519b] text-white hover:bg-[#7262b3] transition-colors"
                >
                  Enable Autoplay
                </button>
              </div>
            ) : autoplayQueue.length === 0 ? (
              <div className="p-4 rounded-xl border border-[#31323e] bg-[#1e202c]/20 text-center">
                <Sparkles className="w-5 h-5 text-[#60519b] mx-auto mb-1 animate-pulse" />
                <p className="text-xs text-[#bfc0d1]/70 font-medium">Generating radio station...</p>
                <p className="text-[11px] text-[#bfc0d1]/40 mt-0.5">
                  Fetching personalized tracks matching the current genre and artist vibe.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {autoplayQueue.map((song, index) => (
                  <div
                    key={`reco-${song.id}-${index}`}
                    className="group flex items-center gap-2.5 p-2 rounded-xl bg-[#1e202c]/30 hover:bg-[#31323e]/50 border border-transparent hover:border-[#31323e] transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => onPlaySong(song)}
                      className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border border-[#31323e]"
                    >
                      <TrackArtwork
                        coverUrl={song.coverUrl}
                        title={song.title}
                        artist={song.artist}
                        youtubeId={song.youtubeId}
                        streamUrl={song.streamUrl}
                        className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                        iconClassName="w-4 h-4"
                      />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/40 transition-opacity">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          onClick={() => onPlaySong(song)}
                          className="text-xs font-semibold text-white truncate cursor-pointer hover:text-[#bfc0d1]"
                        >
                          {song.title}
                        </p>
                      </div>
                      <p
                        onClick={() => onOpenArtist(song.artist)}
                        className="text-[11px] text-[#bfc0d1]/60 truncate cursor-pointer hover:text-white"
                      >
                        {song.artist}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] font-mono text-[#bfc0d1]/50 mr-1">
                        {formatDuration(song.duration)}
                      </span>
                      <button
                        onClick={() => onAddToQueue(song)}
                        className="p-1.5 rounded-lg text-[#bfc0d1]/60 hover:text-white hover:bg-[#60519b]/30 transition-colors"
                        title="Add to Priority Queue"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 border-t border-[#31323e]/80 bg-[#0a0a0f]/80 flex items-center justify-between text-[11px] text-[#bfc0d1]/60">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#60519b]" />
            Seamless Crossfade Engine
          </span>
        </div>
      </div>
    </div>
  );
};
