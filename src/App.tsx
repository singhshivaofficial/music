import React, { useState, useEffect, useRef } from 'react';
import {
  Song,
  LyricsData,
  ListenMemoryEntry,
  UserProfile,
  VisualizerMode,
  RepeatMode,
  ViewTab,
} from './types';
import {
  searchSongs,
  getSongDetails,
  getLyrics,
  getListenHistory,
  logListenMemory,
  getCuratedSongs,
  getSongSuggestions,
  resolveFullTrack,
  getRegionalSongs,
} from './services/api';
import { generateRecommendations, RecommendationSection } from './services/recommendations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomPlayer } from './components/BottomPlayer';
import { TrackCard } from './components/TrackCard';
import { AudioVisualizer } from './components/AudioVisualizer';
import { YouTubeAudioPlayer } from './components/YouTubeAudioPlayer';
import { LyricsModal } from './components/LyricsModal';
import { ArtistModal } from './components/ArtistModal';
import { AuthModal } from './components/AuthModal';
import { QueueDrawer } from './components/QueueDrawer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { Toast } from './components/Toast';
import {
  Sparkles,
  Flame,
  History,
  Heart,
  Music2,
  Trash2,
  Play,
  Share2,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Audio playback states
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState(false);
  const [seekCommand, setSeekCommand] = useState<{ time: number; timestamp: number } | null>(null);

  // Playback queue & Autoplay states
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [userQueue, setUserQueue] = useState<Song[]>([]);
  const [autoplayQueue, setAutoplayQueue] = useState<Song[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [playedHistory, setPlayedHistory] = useState<Song[]>([]);

  // Visualizer states
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(true);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');

  // UI Modals & Panels
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active view tab & search
  const [currentTab, setCurrentTab] = useState<ViewTab>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Playlists and shelves
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [curatedTracks, setCuratedTracks] = useState<Song[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Song[]>([]);
  const [regionalTracks, setRegionalTracks] = useState<Song[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('united states');
  const [recommendationSections, setRecommendationSections] = useState<RecommendationSection[]>([]);
  const [listenHistory, setListenHistory] = useState<ListenMemoryEntry[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);

  // User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('aethersound_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'guest_listener',
      name: 'Guest Explorer',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest_aether',
      isGuest: true,
    };
  });

  const loggedSongIdRef = useRef<string | null>(null);

  // Stable state refs to prevent audio listener stale closures
  const currentSongRef = useRef<Song | null>(null);
  currentSongRef.current = currentSong;

  const currentUserRef = useRef<UserProfile>(currentUser);
  currentUserRef.current = currentUser;

  const playlistRef = useRef<Song[]>(playlist);
  playlistRef.current = playlist;

  const userQueueRef = useRef<Song[]>(userQueue);
  userQueueRef.current = userQueue;

  const autoplayQueueRef = useRef<Song[]>(autoplayQueue);
  autoplayQueueRef.current = autoplayQueue;

  const isAutoplayRef = useRef<boolean>(isAutoplay);
  isAutoplayRef.current = isAutoplay;

  const playedHistoryRef = useRef<Song[]>(playedHistory);
  playedHistoryRef.current = playedHistory;

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;

  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;

  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  const handleSongEndedRef = useRef<() => void>(() => {});
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingSuggestionsRef = useRef(false);
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  // Show toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handle song ended with repeat/shuffle logic using stable refs
  const handleSongEnded = () => {
    const repeat = repeatModeRef.current;
    if (repeat === 'one') {
      handleSeek(0);
      setIsPlaying(true);
      return;
    }
    handleNextRef.current();
  };
  handleSongEndedRef.current = handleSongEnded;

  // Sync OS MediaSession API with track metadata and controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: [
          { src: currentSong.coverUrl, sizes: '500x500', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '150x150', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('pause', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handleSeek(details.seekTime);
        }
      });
    }
  }, [currentSong]);

  // Load initial content, history, favorites, recommendations, and deep-link
  useEffect(() => {
    const initApp = async () => {
      // 1. Load favorites from localStorage
      try {
        const savedFavs = localStorage.getItem('aethersound_favorites');
        if (savedFavs) setFavoriteSongs(JSON.parse(savedFavs));
      } catch {}

      // 2. Load listen history
      const history = await getListenHistory(currentUser.id);
      setListenHistory(history);

      // 3. Load curated discovery tracks
      const curated = await getCuratedSongs();
      setCuratedTracks(curated);
      setPlaylist(curated);

      // 4. Load trending charts
      const trending = await searchSongs('Top Hits Global');
      setTrendingTracks(trending.slice(0, 12));

      // 5. Generate initial recommendation feed based on listen history
      const recs = await generateRecommendations(history);
      setRecommendationSections(recs);

      // 6. Deep-linking: Read ?track={id} from URL on page load
      const params = new URLSearchParams(window.location.search);
      const deepLinkTrackId = params.get('track');
      if (deepLinkTrackId) {
        const linkedSong = await getSongDetails(deepLinkTrackId);
        if (linkedSong) {
          playSong(linkedSong);
          showToast(`Now playing shared link: "${linkedSong.title}"`);
        }
      } else if (curated.length > 0) {
        // Prepare first song in dock
        setCurrentSong(curated[0]);
      }
    };

    initApp();
  }, [currentUser.id]);

  // Re-generate recommendations when listen history updates
  useEffect(() => {
    if (listenHistory.length > 0) {
      generateRecommendations(listenHistory).then((recs) => {
        setRecommendationSections(recs);
      });
    }
  }, [listenHistory.length]);

  // Fetch regional tracks when region changes
  useEffect(() => {
    getRegionalSongs(selectedRegion).then((songs) => {
      setRegionalTracks(songs);
    });
  }, [selectedRegion]);

  // Live Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchSongs(searchQuery);
        if (!abortController.signal.aborted) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error(err);
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchQuery]);

  // Fetch lyrics whenever currentSong changes
  useEffect(() => {
    if (!currentSong) return;

    let isMounted = true;
    setIsLyricsLoading(true);

    getLyrics(currentSong.artist, currentSong.title)
      .then((data) => {
        if (isMounted) setLyricsData(data);
      })
      .catch(() => {
        if (isMounted) setLyricsData(null);
      })
      .finally(() => {
        if (isMounted) setIsLyricsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentSong?.id]);

  // Fetch recommendations dynamically for Autoplay Radio Mode
  const fetchAutoplaySuggestions = async (seedSong: Song) => {
    if (isFetchingSuggestionsRef.current) return;
    isFetchingSuggestionsRef.current = true;
    try {
      const suggestions = await getSongSuggestions(seedSong.id, seedSong.artist);
      const knownIds = new Set<string>([
        seedSong.id,
        ...playedHistoryRef.current.map((s) => s.id),
        ...userQueueRef.current.map((s) => s.id),
        ...autoplayQueueRef.current.map((s) => s.id),
        ...playlistRef.current.map((s) => s.id),
      ]);
      const fresh = suggestions.filter((s) => !knownIds.has(s.id));
      if (fresh.length > 0) {
        setAutoplayQueue((prev) => [...prev, ...fresh.slice(0, 10)]);
      }
    } catch (err) {
      console.error('Failed to fetch autoplay suggestions:', err);
    } finally {
      isFetchingSuggestionsRef.current = false;
    }
  };

  // Play a specific song with comprehensive queue & history handling
  const playSong = async (
    song: Song,
    options?: { newPlaylist?: Song[]; isUserQueued?: boolean }
  ) => {
    // Clear any pending error-skip timeout
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }

    // Save previous song to playback history if different
    if (currentSongRef.current && currentSongRef.current.id !== song.id) {
      setPlayedHistory((prev) => [
        currentSongRef.current!,
        ...prev.filter((p) => p.id !== currentSongRef.current!.id),
      ].slice(0, 50));
    }

    // Remove song from userQueue or autoplayQueue if it was queued
    setUserQueue((prev) => prev.filter((s) => s.id !== song.id));
    setAutoplayQueue((prev) => prev.filter((s) => s.id !== song.id));

    // Reset 15s memory tracker for new song
    loggedSongIdRef.current = null;

    let trackToPlay = song;
    try {
      const resolution = await resolveFullTrack(song);
      if (resolution.updatedTrack) {
        trackToPlay = resolution.updatedTrack;
      }
    } catch (e) {
      console.warn('Full track resolution notice:', e);
    }

    setCurrentSong(trackToPlay);
    if (trackToPlay.duration && trackToPlay.duration > 0) {
      setDuration(trackToPlay.duration);
    }
    setCurrentTime(0);
    setIsPlaying(true);

    // Update active playlist context
    if (options?.newPlaylist) {
      setPlaylist(options.newPlaylist);
    } else if (!playlistRef.current.some((p) => p.id === trackToPlay.id)) {
      setPlaylist((prev) => [trackToPlay, ...prev]);
    }

    // Pre-fetch suggestions if Autoplay is enabled and queue is low
    if (isAutoplayRef.current && autoplayQueueRef.current.length < 3) {
      fetchAutoplaySuggestions(trackToPlay);
    }
  };

  const handleTogglePlay = () => {
    if (!currentSong) return;
    setIsPlaying((prev) => !prev);
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(duration || 9999, time));
    setCurrentTime(clamped);
    setSeekCommand({ time: clamped, timestamp: Date.now() });
  };

  // Next / Previous Button Handlers
  const handlePrev = () => {
    if (!currentSongRef.current) return;

    // Rule: If track played > 3 seconds, restart current track
    if (currentTimeRef.current > 3) {
      handleSeek(0);
      setIsPlaying(true);
      return;
    }

    // Rule: Otherwise, go to previous track in history
    if (playedHistoryRef.current.length > 0) {
      const prevSong = playedHistoryRef.current[0];
      setPlayedHistory((prev) => prev.slice(1));
      playSong(prevSong);
      return;
    }

    // Fallback: previous in playlist context
    const pl = playlistRef.current;
    if (pl.length > 0) {
      const currentIndex = pl.findIndex((s) => s.id === currentSongRef.current?.id);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : pl.length - 1;
      playSong(pl[prevIndex]);
    }
  };
  handlePrevRef.current = handlePrev;

  const handleNext = () => {
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }

    // 1. Priority: User's explicitly queued tracks
    if (userQueueRef.current.length > 0) {
      const nextQueuedSong = userQueueRef.current[0];
      setUserQueue((prev) => prev.slice(1));
      playSong(nextQueuedSong);
      return;
    }

    const pl = playlistRef.current;
    const curr = currentSongRef.current;

    // 2. Shuffle mode within playlist
    if (isShuffleRef.current && pl.length > 1) {
      const remaining = pl.filter((s) => s.id !== curr?.id);
      const randomSong = remaining[Math.floor(Math.random() * remaining.length)] || pl[0];
      playSong(randomSong);
      return;
    }

    // 3. Sequential playlist progression
    if (pl.length > 0 && curr) {
      const currentIndex = pl.findIndex((s) => s.id === curr.id);
      if (currentIndex !== -1 && currentIndex < pl.length - 1) {
        playSong(pl[currentIndex + 1]);
        return;
      }
    }

    // 4. Reached end of playlist: Repeat All?
    if (repeatModeRef.current === 'all' && pl.length > 0) {
      playSong(pl[0]);
      return;
    }

    // 5. Infinite Autoplay & Dynamic Radio Mode
    if (isAutoplayRef.current) {
      if (autoplayQueueRef.current.length > 0) {
        const nextRadioSong = autoplayQueueRef.current[0];
        setAutoplayQueue((prev) => prev.slice(1));
        playSong(nextRadioSong);

        // Preload next batch if running low
        if (autoplayQueueRef.current.length <= 3) {
          fetchAutoplaySuggestions(nextRadioSong);
        }
        return;
      } else if (curr) {
        showToast('Autoplay: Finding next track...');
        getSongSuggestions(curr.id, curr.artist).then((suggestions) => {
          const fresh = suggestions.filter((s) => s.id !== curr.id);
          if (fresh.length > 0) {
            setAutoplayQueue(fresh.slice(1));
            playSong(fresh[0]);
          } else {
            setIsPlaying(false);
          }
        });
        return;
      }
    }

    // End of queue and autoplay is off
    setIsPlaying(false);
  };
  handleNextRef.current = handleNext;

  // Queue actions
  const handleAddToQueue = (song: Song) => {
    setUserQueue((prev) => [...prev, song]);
    showToast(`Added to Up Next: ${song.title}`);
  };

  const handlePlayNext = (song: Song) => {
    setUserQueue((prev) => [song, ...prev]);
    showToast(`Playing next: ${song.title}`);
  };

  const handleRemoveFromQueue = (index: number) => {
    setUserQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveInQueue = (index: number, direction: 'up' | 'down') => {
    setUserQueue((prev) => {
      const updated = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const handleReorderQueue = (fromIndex: number, toIndex: number) => {
    setUserQueue((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleClearQueue = () => {
    setUserQueue([]);
    showToast('Up Next queue cleared');
  };

  const handleToggleAutoplay = () => {
    const next = !isAutoplay;
    setIsAutoplay(next);
    showToast(next ? 'Autoplay enabled (Infinity Radio)' : 'Autoplay disabled');
    if (next && currentSongRef.current && autoplayQueueRef.current.length < 3) {
      fetchAutoplaySuggestions(currentSongRef.current);
    }
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Toggle favorite
  const handleToggleFavorite = (song: Song) => {
    const exists = favoriteSongs.some((s) => s.id === song.id);
    let updated: Song[];
    if (exists) {
      updated = favoriteSongs.filter((s) => s.id !== song.id);
      showToast(`Removed from Favorites: "${song.title}"`);
    } else {
      updated = [song, ...favoriteSongs];
      showToast(`Saved to Favorites: "${song.title}"`);
    }
    setFavoriteSongs(updated);
    localStorage.setItem('aethersound_favorites', JSON.stringify(updated));
  };

  // Share track deep-link
  const handleShare = async (song: Song) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?track=${song.id}`;
    const shareData = {
      title: `${song.title} - ${song.artist}`,
      text: `Listen to "${song.title}" by ${song.artist} in 320kbps HD on AetherSound!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Deep-link shared successfully!');
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Deep-link copied to clipboard!');
    } catch {
      showToast(`Shared URL: ${shareUrl}`);
    }
  };

  // Search execution
  const handleSearchSubmit = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchQuery(query);
    const results = await searchSongs(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleUserSelect = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('aethersound_user', JSON.stringify(user));
    showToast(`Active account: ${user.name}`);
    getListenHistory(user.id).then(setListenHistory);
  };

  const clearHistory = () => {
    setListenHistory([]);
    localStorage.removeItem(`aethersound_history_${currentUser.id}`);
    showToast('Listening memory cleared');
  };

  // Global Keyboard Shortcuts (Space, J/K, N/P, Arrow keys, L, Q, V, M, R, S, /, ?, Esc)
  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onNext: handleNext,
    onPrevious: handlePrev,
    onSeekForward: (secs = 5) => {
      const nextTime = Math.min(duration, currentTimeRef.current + secs);
      handleSeek(nextTime);
    },
    onSeekBackward: (secs = 5) => {
      const prevTime = Math.max(0, currentTimeRef.current - secs);
      handleSeek(prevTime);
    },
    onVolumeUp: () => {
      const newVol = Math.min(1, Math.round((volume + 0.05) * 100) / 100);
      handleVolumeChange(newVol);
      showToast(`Volume: ${Math.round(newVol * 100)}%`);
    },
    onVolumeDown: () => {
      const newVol = Math.max(0, Math.round((volume - 0.05) * 100) / 100);
      handleVolumeChange(newVol);
      showToast(`Volume: ${Math.round(newVol * 100)}%`);
    },
    onToggleMute: handleToggleMute,
    onToggleLyrics: () => setIsLyricsOpen((prev) => !prev),
    onToggleQueue: () => setIsQueueOpen((prev) => !prev),
    onCycleRepeat: () => {
      setRepeatMode((prev) => {
        const nextMode = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
        showToast(`Repeat: ${nextMode.toUpperCase()}`);
        return nextMode;
      });
    },
    onToggleShuffle: () => {
      setIsShuffle((prev) => {
        const next = !prev;
        showToast(next ? 'Shuffle Enabled' : 'Shuffle Disabled');
        return next;
      });
    },
    onToggleVisualizer: () => setIsVisualizerOpen((prev) => !prev),
    onFocusSearch: () => {
      const input = document.getElementById('aether-search-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    },
    onCloseModals: () => {
      setIsQueueOpen(false);
      setIsLyricsOpen(false);
      setIsVisualizerOpen(false);
      setIsShortcutsOpen(false);
      setSelectedArtist(null);
      setIsAuthOpen(false);
    },
    onToggleShortcutsModal: () => setIsShortcutsOpen((prev) => !prev),
  });

  return (
    <div
      id="aethersound-app"
      className="min-h-screen flex flex-col relative overflow-hidden"
    >
      
      {/* Decorative Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--primary-neon)] opacity-[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[450px] h-[450px] bg-[var(--tertiary-neon)] opacity-[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* Toast Alert */}
      <Toast message={toastMessage} />

      {/* Top Navigation Bar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        isVisualizerOpen={isVisualizerOpen}
        onToggleVisualizer={() => setIsVisualizerOpen(!isVisualizerOpen)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onGoHome={() => {
          setSearchQuery('');
          setCurrentTab('discover');
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSearchQuery('');
          }}
          historyCount={listenHistory.length}
          favoritesCount={favoriteSongs.length}
        />

        {/* Primary Content View */}
        <main
          id="aether-main-content"
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-36 space-y-8 relative"
        >
          {/* Audio Visualizer Stage */}
          {isVisualizerOpen && (
            <section id="audio-visualizer-section" className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#60519b] animate-ping" />
                  <h3 className="text-xs font-bold tracking-wider uppercase text-white/90">
                    Real-Time Audio Visualizer
                  </h3>
                </div>
                <span className="text-[11px] text-[#bfc0d1]/60">
                  {isPlaying ? 'Live Audio Stream' : 'Ready / Paused'}
                </span>
              </div>

              <AudioVisualizer
                isPlaying={isPlaying}
                mode={visualizerMode}
                onModeChange={setVisualizerMode}
                height={120}
              />
            </section>
          )}

          {/* Search Results Display */}
          {searchQuery ? (
            <section id="search-results-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--primary-neon)] flex items-center gap-2">
                  <span>&gt; RESULTS: "{searchQuery}"<span className="animate-blink">_</span></span>
                </h2>
                <span className="text-xs text-[var(--tertiary-neon)] font-mono">
                  [ {searchResults.length} RECORDS ]
                </span>
              </div>

              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--primary-neon)] font-mono">
                  <div className="w-full max-w-[200px] h-[1px] bg-[var(--primary-neon)] shadow-[0_0_10px_var(--primary-neon)] animate-pulse" />
                  <p className="text-sm tracking-widest uppercase">&gt; SCANNING DATABASE...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {searchResults.map((song) => (
                    <TrackCard
                      key={song.id}
                      song={song}
                      isPlaying={isPlaying}
                      isCurrentSong={currentSong?.id === song.id}
                      isFavorite={favoriteSongs.some((f) => f.id === song.id)}
                      onPlay={playSong}
                      onToggleFavorite={handleToggleFavorite}
                      onOpenArtist={setSelectedArtist}
                      onShare={handleShare}
                      onPlayNext={handlePlayNext}
                      onAddToQueue={handleAddToQueue}
                      onToast={showToast}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-[var(--secondary-neon)] font-mono">
                  <div className="w-16 h-16 border border-[var(--secondary-neon)] flex items-center justify-center mb-4 transform rotate-45">
                    <Music2 className="w-8 h-8 -rotate-45" />
                  </div>
                  <p className="text-sm uppercase tracking-widest">&gt; QUERY RETURNED 0 RESULTS</p>
                  <p className="text-xs text-[var(--tertiary-neon)] mt-2">TRY ANOTHER SEARCH TERM_</p>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* TAB 1: DISCOVER */}
              {currentTab === 'discover' && (
                <div className="space-y-10">
                  {/* Hero Showcase Billboard with Artistic Flair Styling */}
                  <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent p-6 sm:p-10 border border-[#31323e] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3.5 max-w-xl text-center md:text-left z-20">
                      <div className="inline-flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-[#60519b] text-[10px] font-bold rounded-sm text-white tracking-wider uppercase">
                          FEATURED TRACK
                        </span>
                        <span className="text-[10px] opacity-60 tracking-wider">
                          • 320KBPS HD AUDIO
                        </span>
                      </div>
                      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                        Experience Sound in Ultra-Modern Obsidian Glass
                      </h1>
                      <p className="text-sm opacity-70 leading-relaxed max-w-lg">
                        Full-track 320kbps streaming, instant synchronized karaoke lyrics, reactive audio visualizers, and intelligent listening memory that adapts to your taste.
                      </p>

                      <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                        {curatedTracks[0] && (
                          <button
                            id="hero-play-featured-btn"
                            onClick={() => playSong(curatedTracks[0])}
                            className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:scale-105 shadow-xl transition-all"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Play Now</span>
                          </button>
                        )}
                        <button
                          onClick={() => setCurrentTab('recommended')}
                          className="px-7 py-2.5 rounded-full glass text-white font-bold text-xs sm:text-sm hover:bg-[#31323e] transition-colors"
                        >
                          Explore Mix
                        </button>
                      </div>
                    </div>

                    {/* Ambient Glow CD Showcase */}
                    {curatedTracks[0] && (
                      <div className="relative group cursor-pointer flex-shrink-0" onClick={() => playSong(curatedTracks[0])}>
                        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform relative">
                          <img
                            src={curatedTracks[0].coverUrl}
                            alt={curatedTracks[0].title}
                            className="w-full h-full object-cover"
                          />
                          {/* Dancing mini visualizer bars */}
                          <div className="absolute bottom-2 right-2 flex items-end gap-1 h-6 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md">
                            <div className="viz-bar h-3 animate-pulse" />
                            <div className="viz-bar h-5 animate-pulse" />
                            <div className="viz-bar h-2 animate-pulse" />
                            <div className="viz-bar h-4 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Personalization or Regional Access */}
                  {listenHistory.length > 0 ? (
                    <div className="space-y-8 mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#60519b]" />
                          <h2 className="text-xl font-bold text-white">Inspired by your listening</h2>
                        </div>
                        <button
                          onClick={() => setCurrentTab('recommended')}
                          className="text-xs text-[#60519b] hover:text-white font-medium transition-colors"
                        >
                          View all
                        </button>
                      </div>
                      
                      {recommendationSections.slice(0, 2).map((sec, idx) => (
                        <section key={idx} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-white">{sec.title}</h3>
                              <p className="text-xs text-[#bfc0d1]/60">{sec.reason}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {sec.songs.slice(0, 6).map((song) => (
                              <TrackCard
                                key={song.id}
                                song={song}
                                isPlaying={isPlaying}
                                isCurrentSong={currentSong?.id === song.id}
                                isFavorite={favoriteSongs.some((f) => f.id === song.id)}
                                onPlay={playSong}
                                onToggleFavorite={handleToggleFavorite}
                                onOpenArtist={setSelectedArtist}
                                onShare={handleShare}
                                onPlayNext={handlePlayNext}
                                onAddToQueue={handleAddToQueue}
                                onToast={showToast}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <section className="space-y-4 mt-8">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#60519b]" />
                            <h2 className="text-xl font-bold text-white">Start Your Journey</h2>
                          </div>
                          <span className="text-xs text-[#bfc0d1]/60">Select your region to explore local styles</span>
                        </div>
                        <select
                          value={selectedRegion}
                          onChange={(e) => setSelectedRegion(e.target.value)}
                          className="bg-[#1e202c] border border-[#31323e] text-white text-sm rounded-lg px-3 py-1.5 focus:ring-[#60519b] focus:border-[#60519b] outline-none"
                        >
                          <option value="united states">United States</option>
                          <option value="united kingdom">United Kingdom</option>
                          <option value="japan">Japan</option>
                          <option value="brazil">Brazil</option>
                          <option value="spain">Spain</option>
                          <option value="india">India</option>
                          <option value="south korea">South Korea</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {regionalTracks.slice(0, 6).map((song) => (
                          <TrackCard
                            key={song.id}
                            song={song}
                            isPlaying={isPlaying}
                            isCurrentSong={currentSong?.id === song.id}
                            isFavorite={favoriteSongs.some((f) => f.id === song.id)}
                            onPlay={playSong}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenArtist={setSelectedArtist}
                            onShare={handleShare}
                            onPlayNext={handlePlayNext}
                            onAddToQueue={handleAddToQueue}
                            onToast={showToast}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Global Trending Shelf */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <h2 className="text-xl font-bold text-white">Trending Charts</h2>
                      </div>
                      <button
                        onClick={() => setCurrentTab('trending')}
                        className="text-xs text-[#60519b] hover:text-white font-medium transition-colors"
                      >
                        View all
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {trendingTracks.slice(0, 6).map((song) => (
                        <TrackCard
                          key={song.id}
                          song={song}
                          isPlaying={isPlaying}
                          isCurrentSong={currentSong?.id === song.id}
                          isFavorite={favoriteSongs.some((f) => f.id === song.id)}
                          onPlay={playSong}
                          onToggleFavorite={handleToggleFavorite}
                          onOpenArtist={setSelectedArtist}
                          onShare={handleShare}
                          onPlayNext={handlePlayNext}
                          onAddToQueue={handleAddToQueue}
                          onToast={showToast}
                        />
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 2: RECOMMENDED FOR YOU (Listen Memory Engine) */}
              {currentTab === 'recommended' && (
                <div className="space-y-8">
                  <div className="p-6 rounded-3xl glass border border-[rgba(191,192,209,0.1)] space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#60519b]" />
                      <h2 className="text-xl font-bold text-white">Recommended For You</h2>
                    </div>
                    <p className="text-xs text-[#bfc0d1]/80 max-w-2xl leading-relaxed">
                      Our memory engine analyzes the last 10 tracks you played for &gt;15 seconds to uncover recurring artists, genres, and acoustics tailored uniquely to your listening pattern.
                    </p>
                  </div>

                  {recommendationSections.map((sec, idx) => (
                    <section key={idx} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">{sec.title}</h3>
                          <p className="text-xs text-[#bfc0d1]/60">{sec.reason}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {sec.songs.map((song) => (
                          <TrackCard
                            key={song.id}
                            song={song}
                            isPlaying={isPlaying}
                            isCurrentSong={currentSong?.id === song.id}
                            isFavorite={favoriteSongs.some((f) => f.id === song.id)}
                            onPlay={playSong}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenArtist={setSelectedArtist}
                            onShare={handleShare}
                            onPlayNext={handlePlayNext}
                            onAddToQueue={handleAddToQueue}
                            onToast={showToast}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {/* TAB 3: TRENDING */}
              {currentTab === 'trending' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-amber-400" />
                      <h2 className="text-xl font-bold text-white">Global Trending Charts</h2>
                    </div>
                    <span className="text-xs text-[#bfc0d1]/60">Live worldwide stream numbers</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {trendingTracks.map((song) => (
                      <TrackCard
                        key={song.id}
                        song={song}
                        isPlaying={isPlaying}
                        isCurrentSong={currentSong?.id === song.id}
                        isFavorite={favoriteSongs.some((f) => f.id === song.id)}
                        onPlay={playSong}
                        onToggleFavorite={handleToggleFavorite}
                        onOpenArtist={setSelectedArtist}
                        onShare={handleShare}
                        onPlayNext={handlePlayNext}
                        onAddToQueue={handleAddToQueue}
                        onToast={showToast}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* TAB 4: LISTENING MEMORY HISTORY */}
              {currentTab === 'history' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-[#60519b]" />
                      <div>
                        <h2 className="text-xl font-bold text-white">Listening Memory</h2>
                        <p className="text-xs text-[#bfc0d1]/60">
                          Tracks played continuously for more than 15 seconds
                        </p>
                      </div>
                    </div>

                    {listenHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e202c] hover:bg-red-500/20 text-[#bfc0d1] hover:text-red-400 text-xs border border-[#bfc0d1]/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear History</span>
                      </button>
                    )}
                  </div>

                  {listenHistory.length > 0 ? (
                    <div className="space-y-2">
                      {listenHistory.map((item, idx) => (
                        <div
                          key={`${item.songId}-${idx}`}
                          className="flex items-center justify-between p-3.5 rounded-2xl glass hover:bg-[#31323e] transition-all group border-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="font-mono text-xs opacity-50 w-6">
                              {idx + 1}
                            </span>
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white line-clamp-1">
                                {item.title}
                              </h4>
                              <p
                                onClick={() => setSelectedArtist(item.artist)}
                                className="text-xs opacity-60 hover:opacity-100 hover:text-white cursor-pointer line-clamp-1 transition-opacity"
                              >
                                {item.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs opacity-50 hidden sm:inline font-mono">
                              {new Date(item.playedAt).toLocaleDateString()}{' '}
                              {new Date(item.playedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            <button
                              onClick={() => {
                                getSongDetails(item.songId).then((song) => {
                                  if (song) playSong(song);
                                });
                              }}
                              className="p-2.5 rounded-full bg-[#60519b] text-white hover:scale-105 accent-glow transition-transform"
                              title="Play song again"
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#bfc0d1]/60 space-y-2">
                      <History className="w-12 h-12 mx-auto opacity-40 text-[#60519b]" />
                      <p className="text-sm font-medium">Your listening memory is pristine.</p>
                      <p className="text-xs text-[#bfc0d1]/40">
                        Play any track for over 15 seconds to begin recording memory logs.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* TAB 5: FAVORITES */}
              {currentTab === 'favorites' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                      <h2 className="text-xl font-bold text-white">Saved Favorites</h2>
                    </div>
                    <span className="text-xs text-[#bfc0d1]/60">
                      {favoriteSongs.length} starred songs
                    </span>
                  </div>

                  {favoriteSongs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {favoriteSongs.map((song) => (
                        <TrackCard
                          key={song.id}
                          song={song}
                          isPlaying={isPlaying}
                          isCurrentSong={currentSong?.id === song.id}
                          isFavorite={true}
                          onPlay={playSong}
                          onToggleFavorite={handleToggleFavorite}
                          onOpenArtist={setSelectedArtist}
                          onShare={handleShare}
                          onPlayNext={handlePlayNext}
                          onAddToQueue={handleAddToQueue}
                          onToast={showToast}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#bfc0d1]/60 space-y-2">
                      <Heart className="w-12 h-12 mx-auto opacity-40 text-red-400" />
                      <p className="text-sm font-medium">No saved favorite tracks yet.</p>
                      <p className="text-xs text-[#bfc0d1]/40">
                        Click the heart icon on any track to pin it to your favorites.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Offscreen YouTube Audio IFrame Engine */}
      <YouTubeAudioPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        seekCommand={seekCommand}
        onPlayStateChange={(playing) => setIsPlaying(playing)}
        onTimeUpdate={(cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0 && dur !== duration) {
            setDuration(dur);
          }
          // 15-second listening memory requirement
          const song = currentSongRef.current;
          const user = currentUserRef.current;
          if (cur >= 15 && song && loggedSongIdRef.current !== song.id) {
            loggedSongIdRef.current = song.id;
            const entry: ListenMemoryEntry = {
              userId: user.id,
              songId: song.id,
              title: song.title,
              artist: song.artist,
              coverUrl: song.coverUrl,
              playedAt: Date.now(),
              duration: song.duration || Math.round(dur),
            };

            logListenMemory(entry).then(() => {
              setListenHistory((prev) => [entry, ...prev.filter((p) => p.songId !== entry.songId)]);
              showToast(`Logged to Listening Memory: ${song.title}`);
            });
          }
        }}
        onSongEnded={() => handleSongEndedRef.current()}
        onError={(err) => {
          console.warn('YouTube playback error:', err);
          showToast('Track unavailable, skipping to next track...');
          if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
          skipTimeoutRef.current = setTimeout(() => {
            handleNextRef.current();
          }, 1200);
        }}
      />

      {/* Persistent Glass Bottom Player Dock */}
      <BottomPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        isAutoplay={isAutoplay}
        isLyricsOpen={isLyricsOpen}
        isVisualizerOpen={isVisualizerOpen}
        isQueueOpen={isQueueOpen}
        queueCount={userQueue.length}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleRepeat={handleToggleRepeat}
        onToggleShuffle={handleToggleShuffle}
        onToggleAutoplay={handleToggleAutoplay}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
        onToggleVisualizer={() => setIsVisualizerOpen(!isVisualizerOpen)}
        onOpenArtist={(artist) => setSelectedArtist(artist)}
        onShare={handleShare}
        onToast={showToast}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Up Next & Autoplay Dynamic Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        currentSong={currentSong}
        isPlaying={isPlaying}
        userQueue={userQueue}
        autoplayQueue={autoplayQueue}
        isAutoplay={isAutoplay}
        onToggleAutoplay={handleToggleAutoplay}
        onPlaySong={playSong}
        onRemoveFromQueue={handleRemoveFromQueue}
        onMoveInQueue={handleMoveInQueue}
        onReorderQueue={handleReorderQueue}
        onClearQueue={handleClearQueue}
        onAddToQueue={handleAddToQueue}
        onOpenArtist={(artist) => setSelectedArtist(artist)}
      />

      {/* Karaoke Synchronized Lyrics Modal */}
      <LyricsModal
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        song={currentSong}
        lyricsData={lyricsData}
        currentTime={currentTime}
        onSeek={handleSeek}
        isLoading={isLyricsLoading}
      />

      {/* Artist Profile & Fanart Modal */}
      <ArtistModal
        isOpen={Boolean(selectedArtist)}
        onClose={() => setSelectedArtist(null)}
        artistName={selectedArtist || ''}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
      />

      {/* Authentication & Profile Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleUserSelect}
      />

      {/* Keyboard Shortcuts Cheatsheet Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
