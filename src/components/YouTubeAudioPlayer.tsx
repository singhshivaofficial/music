import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { resolveYouTubeId } from '../services/api';

interface YouTubeAudioPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number; // 0 to 1
  isMuted: boolean;
  seekCommand: { time: number; timestamp: number } | null;
  onPlayStateChange: (playing: boolean) => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onSongEnded: () => void;
  onError?: (err: any) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubeAudioPlayer: React.FC<YouTubeAudioPlayerProps> = ({
  currentSong,
  isPlaying,
  volume,
  isMuted,
  seekCommand,
  onPlayStateChange,
  onTimeUpdate,
  onSongEnded,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const isReadyRef = useRef<boolean>(false);
  const currentSongRef = useRef<Song | null>(currentSong);
  currentSongRef.current = currentSong;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let checkTimer: any = null;

    const initPlayer = () => {
      if (playerRef.current) return;
      if (!window.YT || !window.YT.Player) return;

      const playerDiv = document.getElementById('wave-yt-player-target');
      if (!playerDiv) return;

      try {
        playerRef.current = new window.YT.Player('wave-yt-player-target', {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              isReadyRef.current = true;
              event.target.setVolume(Math.round(volume * 100));
              if (isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }

              // If a song was already selected before player was ready, load it now
              if (currentSongRef.current) {
                loadAndPlaySong(currentSongRef.current);
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
              if (event.data === 1) {
                onPlayStateChange(true);
              } else if (event.data === 2) {
                onPlayStateChange(false);
              } else if (event.data === 0) {
                onSongEnded();
              }
            },
            onError: (event: any) => {
              console.warn('YouTube Player notice code:', event.data);
              onError?.(event.data);
            },
          },
        });
      } catch (err) {
        console.error('Failed to instantiate YouTube player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Ensure API script is loaded
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };

      // Poll as fallback if event already fired
      checkTimer = setInterval(() => {
        if (window.YT && window.YT.Player && !playerRef.current) {
          initPlayer();
          clearInterval(checkTimer);
        }
      }, 300);
    }

    return () => {
      if (checkTimer) clearInterval(checkTimer);
    };
  }, []);

  // Song loading helper
  const loadAndPlaySong = async (song: Song) => {
    if (!playerRef.current || !isReadyRef.current) return;

    
    let videoId = song.youtubeId;

    if (!videoId) {
      videoId = await resolveYouTubeId(`${song.artist} ${song.title}`);
    }

    

    if (videoId) {
      setCurrentVideoId(videoId);
      try {
        if (isPlayingRef.current) {
          playerRef.current.loadVideoById({
            videoId,
            startSeconds: 0,
          });
        } else {
          playerRef.current.cueVideoById({
            videoId,
            startSeconds: 0,
          });
        }
      } catch (e) {
        console.warn('loadVideoById notice:', e);
      }
    } else {
      // Fallback: YouTube Search Playlist
      try {
        const searchQuery = `${song.artist} ${song.title} audio`;
        if (isPlayingRef.current) {
          playerRef.current.loadPlaylist({
            listType: 'search',
            list: searchQuery,
            index: 0,
            startSeconds: 0,
          });
        } else {
          playerRef.current.cuePlaylist({
            listType: 'search',
            list: searchQuery,
            index: 0,
            startSeconds: 0,
          });
        }
      } catch (e) {
        console.warn('loadPlaylist fallback notice:', e);
      }
    }
  };

  // Watch currentSong changes
  useEffect(() => {
    if (!currentSong) return;
    if (isReadyRef.current && playerRef.current) {
      loadAndPlaySong(currentSong);
    }
  }, [currentSong?.id]);

  // Watch isPlaying changes
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;

    try {
      const state = playerRef.current.getPlayerState?.();
      if (isPlaying) {
        if (state !== 1 && state !== 3) {
          playerRef.current.playVideo();
        }
      } else {
        if (state === 1 || state === 3) {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {}
  }, [isPlaying]);

  // Watch volume and mute changes
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      playerRef.current.setVolume(Math.round(volume * 100));
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch (e) {}
  }, [volume, isMuted]);

  // Watch seek commands
  useEffect(() => {
    if (!seekCommand || !playerRef.current || !isReadyRef.current) return;
    try {
      playerRef.current.seekTo(seekCommand.time, true);
    } catch (e) {}
  }, [seekCommand?.timestamp]);

  // Smooth polling for currentTime & duration
  useEffect(() => {
    let interval: any = null;

    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && isReadyRef.current) {
          try {
            const cur = playerRef.current.getCurrentTime?.() || 0;
            const dur = playerRef.current.getDuration?.() || 0;
            if (dur > 0) {
              onTimeUpdate(cur, dur);
            }
          } catch (e) {}
        }
      }, 250);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="fixed -bottom-[1000px] left-0 w-0 h-0 opacity-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div className="w-full h-full bg-black">
        {/* YouTube IFrame target element */}
        <div id="wave-yt-player-target" className="w-full h-full" />
      </div>
    </div>
  );
};
