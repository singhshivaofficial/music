import { Song, LyricsData, ArtistMedia, ListenMemoryEntry } from '../types';

export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.data?.results || [];
  } catch (err) {
    console.error('API searchSongs error:', err);
    return [];
  }
}

export async function getSongDetails(id: string): Promise<Song | null> {
  try {
    const res = await fetch(`/api/songs?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to get song details');
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    console.error('API getSongDetails error:', err);
    return null;
  }
}

export async function getLyrics(artist: string, title: string): Promise<LyricsData> {
  try {
    const res = await fetch(
      `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
    );
    const data = await res.json();
    if (data.success) {
      const lines = parseLrc(data.syncedLyrics || '');
      return {
        synced: data.synced && lines.length > 0,
        lines,
        plain: data.plainLyrics || (lines.map((l) => l.text).join('\n') || 'No lyrics available.'),
      };
    }
  } catch (err) {
    console.error('API getLyrics error:', err);
  }

  return {
    synced: false,
    lines: [],
    plain: 'No lyrics available for this song.',
  };
}

// Helper to parse LRC lyrics format [mm:ss.xx] Lyric text
function parseLrc(lrcText: string) {
  if (!lrcText) return [];
  const lines: { time: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;

  const rawLines = lrcText.split('\n');
  for (const raw of rawLines) {
    const match = raw.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        lines.push({
          time: minutes * 60 + seconds,
          text,
        });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export async function getArtistMedia(artistName: string): Promise<ArtistMedia | null> {
  try {
    const res = await fetch(`/api/artist?name=${encodeURIComponent(artistName)}`);
    const data = await res.json();
    if (data.success && data.artist) {
      return data.artist;
    }
  } catch (err) {
    console.error('API getArtistMedia error:', err);
  }
  return null;
}

export async function getListenHistory(userId: string): Promise<ListenMemoryEntry[]> {
  try {
    const res = await fetch(`/api/listen-memory?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (data.success) {
      return data.data || [];
    }
  } catch (err) {
    console.error('API getListenHistory error:', err);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(`wave_history_${userId}`);
    if (local) return JSON.parse(local);
  } catch {}
  return [];
}

export async function logListenMemory(entry: ListenMemoryEntry): Promise<void> {
  // 1. Sync to server
  try {
    await fetch('/api/listen-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error('API logListenMemory error:', err);
  }

  // 2. Sync to localStorage for immediate resilience
  try {
    const key = `wave_history_${entry.userId}`;
    const raw = localStorage.getItem(key);
    let list: ListenMemoryEntry[] = raw ? JSON.parse(raw) : [];
    list = list.filter((item) => item.songId !== entry.songId);
    list.unshift(entry);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export async function getCuratedSongs(): Promise<Song[]> {
  try {
    const res = await fetch('/api/curated');
    const data = await res.json();
    if (data.success && data.results?.length > 0) {
      return data.results;
    }
  } catch (err) {
    console.error('API getCuratedSongs error:', err);
  }
  return [];
}

export async function getRegionalSongs(country: string): Promise<Song[]> {
  try {
    const res = await fetch(`/api/charts/regional?country=${encodeURIComponent(country)}`);
    const data = await res.json();
    if (data.success && data.results?.length > 0) {
      return data.results;
    }
  } catch (err) {
    console.error(`API getRegionalSongs error [${country}]:`, err);
  }
  return [];
}

export async function getTrendingArtists(): Promise<{ name: string; imageUrl: string; listeners?: string }[]> {
  try {
    const res = await fetch('/api/charts/artists');
    const data = await res.json();
    if (data.success && data.artists?.length > 0) {
      return data.artists;
    }
  } catch (err) {
    console.error('API getTrendingArtists error:', err);
  }
  return [];
}

/**
 * Resolve YouTube Video ID for full-length YouTube IFrame audio streaming
 */
export async function resolveYouTubeId(query: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/music/youtube-id?query=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.youtubeId) return data.youtubeId;
    }
  } catch (e) {
    console.warn('resolveYouTubeId error:', e);
  }
  return null;
}

/**
 * Resolve Full Track for playback: ensures YouTube streamUrl and artwork fallback are ready
 */
export async function resolveFullTrack(
  track: Song
): Promise<{ streamUrl: string; duration?: number; updatedTrack?: Song; youtubeId?: string }> {
  let ytId = track.youtubeId;
  let ytDuration = track.duration;
  let ytCover = '';

  if (!ytId && track.streamUrl?.startsWith('youtube:')) {
    const candidate = track.streamUrl.replace('youtube:', '');
    if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
      ytId = candidate;
    }
  }

  if (!ytId) {
    try {
      const res = await fetch(`/api/music/youtube-id?query=${encodeURIComponent(`${track.artist} ${track.title}`)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.youtubeId) {
          ytId = data.youtubeId;
          if (data.duration && data.duration > 0) ytDuration = data.duration;
          if (data.coverUrl) ytCover = data.coverUrl;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve YouTube ID for track:', e);
    }
  }

  const ytUrl = ytId
    ? `youtube:${ytId}`
    : track.streamUrl || `youtube:${encodeURIComponent(`${track.artist} ${track.title} audio`)}`;

  // 2. YouTube Fallback: If playing or resolving via YouTube, automatically extract the YouTube Video ID and set artwork
  let coverUrl = track.coverUrl;
  if (!coverUrl || coverUrl.includes('2a96cbd8b46e442fc41c2b86b821562f') || coverUrl.includes('unsplash')) {
    if (ytId) {
      coverUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    } else if (ytCover) {
      coverUrl = ytCover;
    }
  }

  const updated: Song = {
    ...track,
    streamUrl: ytUrl,
    youtubeId: ytId || track.youtubeId,
    duration: ytDuration || track.duration,
    coverUrl: coverUrl || track.coverUrl,
  };

  return {
    streamUrl: ytUrl,
    duration: ytDuration,
    youtubeId: ytId,
    updatedTrack: updated,
  };
}

/**
 * Smart "Up Next" Autoplay Recommendations (Last.fm track.getsimilar)
 */
export async function getSongSuggestions(
  songId: string,
  artist?: string,
  title?: string
): Promise<Song[]> {
  try {
    let url = `/api/songs/${encodeURIComponent(songId)}/suggestions`;
    const params = new URLSearchParams();
    if (artist) params.set('artist', artist);
    if (title) params.set('title', title);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error('API getSongSuggestions error:', err);
    if (artist) {
      return await searchSongs(artist);
    }
    return [];
  }
}
