import React, { useEffect, useState } from 'react';
import { ArtistMedia, Song } from '../types';
import { getArtistMedia, searchSongs } from '../services/api';
import { X, Play, Music, Sparkles } from 'lucide-react';
import { TrackArtwork } from './TrackArtwork';

interface ArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  artistName: string;
  onPlaySong: (song: Song) => void;
  currentSongId?: string;
}

export const ArtistModal: React.FC<ArtistModalProps> = ({
  isOpen,
  onClose,
  artistName,
  onPlaySong,
  currentSongId,
}) => {
  const [artistMedia, setArtistMedia] = useState<ArtistMedia | null>(null);
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !artistName) return;

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [media, songs] = await Promise.all([
          getArtistMedia(artistName),
          searchSongs(artistName),
        ]);

        if (isMounted) {
          setArtistMedia(media);
          setTopSongs(songs.slice(0, 10));
        }
      } catch (err) {
        console.error('Failed to load artist details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, artistName]);

  if (!isOpen || !artistName) return null;

  return (
    <div
      id="artist-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="artist-modal-card"
        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl glass border border-[rgba(191,192,209,0.15)] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner with Fanart Backdrop from TheAudioDB */}
        <div className="relative w-full h-48 sm:h-64 bg-[#0a0a0f] overflow-hidden flex items-end p-6">
          {artistMedia?.banner || artistMedia?.fanart ? (
            <img
              src={artistMedia.banner || artistMedia.fanart}
              alt={artistName}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80';
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0f] via-[#1e202c] to-[#60519b]/30" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e202c] via-[#1e202c]/60 to-transparent" />

          {/* Close button */}
          <button
            id="artist-modal-close"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Artist Identity */}
          <div className="relative z-10 flex items-center gap-4">
            {artistMedia?.logo ? (
              <img
                src={artistMedia.logo}
                alt={artistName}
                className="max-h-16 max-w-[200px] object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {artistName}
              </h2>
            )}

            {artistMedia?.genre && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#60519b]/30 text-[#bfc0d1] border border-[#60519b]/50">
                <Sparkles className="w-3 h-3 text-[#bfc0d1]" />
                {artistMedia.genre}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#bfc0d1]/70">
              <div className="w-8 h-8 rounded-full border-2 border-[#60519b] border-t-transparent animate-spin" />
              <p className="text-sm">Fetching artist data from TheAudioDB...</p>
            </div>
          ) : (
            <>
              {/* Biography Section */}
              {artistMedia?.bio && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold tracking-wider uppercase opacity-60">
                    Biography
                  </h4>
                  <p className="text-sm text-[#bfc0d1]/90 leading-relaxed max-h-32 overflow-y-auto pr-2 glass p-3.5 rounded-xl border border-[rgba(191,192,209,0.1)]">
                    {artistMedia.bio}
                  </p>
                </div>
              )}

              {/* Top Tracks by Artist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold tracking-wider uppercase opacity-60">
                    Popular Tracks
                  </h4>
                  <span className="text-xs opacity-50">{topSongs.length} songs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topSongs.map((song) => {
                    const isCurrent = currentSongId === song.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => onPlaySong(song)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                          isCurrent
                            ? 'bg-[#60519b]/25 border-[#60519b] shadow-[0_0_15px_rgba(96,81,155,0.4)]'
                            : 'glass border-[rgba(191,192,209,0.1)] hover:border-[#31323e] hover:bg-[#31323e]/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[#31323e]">
                            <TrackArtwork
                              coverUrl={song.coverUrl}
                              title={song.title}
                              artist={song.artist}
                              youtubeId={song.youtubeId}
                              streamUrl={song.streamUrl}
                              className="w-full h-full object-cover"
                              iconClassName="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-bold line-clamp-1 ${
                                isCurrent ? 'text-white' : 'text-[#bfc0d1] group-hover:text-white'
                              }`}
                            >
                              {song.title}
                            </p>
                            <p className="text-xs opacity-60 line-clamp-1">{song.album}</p>
                          </div>
                        </div>

                        <button
                          id={`play-artist-song-${song.id}`}
                          className={`p-2 rounded-full transition-all flex-shrink-0 ${
                            isCurrent
                              ? 'bg-[#60519b] text-white shadow-md'
                              : 'bg-white/10 text-white group-hover:bg-[#60519b] group-hover:scale-105'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
