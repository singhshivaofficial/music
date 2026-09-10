import { Song, LyricsData, ArtistMedia, ListenMemoryEntry } from '../types';

// Helper: Generate clean song ID
function makeSongId(artist: string, title: string): string {
  const clean = `${artist.trim().toLowerCase()}:::${title.trim().toLowerCase()}`;
  try {
    return `lastfm_${btoa(unescape(encodeURIComponent(clean))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  } catch {
    return `lastfm_${encodeURIComponent(clean)}`;
  }
}

// Country code map for regional charts
const countryMap: Record<string, string> = {
  'united states': 'us',
  'united kingdom': 'gb',
  'india': 'in',
  'canada': 'ca',
  'australia': 'au',
  'germany': 'de',
  'france': 'fr',
  'japan': 'jp',
  'brazil': 'br',
  'mexico': 'mx',
  'south korea': 'kr',
  'global': 'us',
};

// Client-side fallback: iTunes Search API
async function fallbackItunesSearch(query: string): Promise<Song[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=30`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((t: any) => ({
      id: makeSongId(t.artistName || 'Unknown', t.trackName || 'Unknown'),
      title: t.trackName || 'Unknown Title',
      artist: t.artistName || 'Unknown Artist',
      album: t.collectionName || 'Single',
      duration: Math.round((t.trackTimeMillis || 210000) / 1000),
      coverUrl: t.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
      streamUrl: `youtube:${encodeURIComponent(`${t.artistName} ${t.trackName} audio`)}`,
      quality: 'Full Track',
      source: 'lastfm',
    }));
  } catch (e) {
    console.warn('Fallback iTunes search failed:', e);
    return [];
  }
}

// Client-side fallback: iTunes RSS Top Songs
async function fallbackItunesTopSongs(country: string = 'us', limit: number = 30): Promise<Song[]> {
  try {
    const code = countryMap[country.toLowerCase()] || country.toLowerCase().slice(0, 2) || 'us';
    const url = `https://itunes.apple.com/${code}/rss/topsongs/limit=${limit}/json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const entries = data.feed?.entry || [];
    return entries.map((e: any) => {
      const title = e['im:name']?.label || 'Unknown Track';
      const artist = e['im:artist']?.label || 'Unknown Artist';
      const rawCover = e['im:image']?.[e['im:image']?.length - 1]?.label || '';
      const coverUrl = rawCover.replace(/\/\d+x\d+bb/, '/600x600bb');
      return {
        id: makeSongId(artist, title),
        title,
        artist,
        album: e['im:collection']?.['im:name']?.label || 'Single',
        duration: 210,
        coverUrl,
        streamUrl: `youtube:${encodeURIComponent(`${artist} ${title} audio`)}`,
        quality: 'Full Track',
        source: 'lastfm',
      };
    });
  } catch (e) {
    console.warn('Fallback iTunes Top Songs RSS failed:', e);
    return [];
  }
}

export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.data?.results && data.data.results.length > 0) {
        return data.data.results;
      }
    }
  } catch (err) {
    console.warn('API searchSongs error, trying client fallback:', err);
  }

  // Resilient Client Fallback via iTunes API
  return await fallbackItunesSearch(query);
}

export async function getSongDetails(id: string): Promise<Song | null> {
  try {
    const res = await fetch(`/api/songs?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.data) return data.data;
    }
  } catch (err) {
    console.warn('API getSongDetails error:', err);
  }
  return null;
}

export async function getLyrics(artist: string, title: string): Promise<LyricsData> {
  try {
    const res = await fetch(
      `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const lines = parseLrc(data.syncedLyrics || '');
        return {
          synced: data.synced && lines.length > 0,
          lines,
          plain: data.plainLyrics || (lines.map((l) => l.text).join('\n') || 'No lyrics available.'),
        };
      }
    }
  } catch (err) {
    console.warn('API getLyrics error, trying direct LRCLIB fetch:', err);
  }

  // Direct client-side LRCLIB fallback
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].split('&')[0].trim();
    const lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
      cleanArtist
    )}&track_name=${encodeURIComponent(cleanTitle)}`;
    const lrcRes = await fetch(lrcUrl);
    if (lrcRes.ok) {
      const data = await lrcRes.json();
      const lines = parseLrc(data.syncedLyrics || '');
      return {
        synced: Boolean(data.syncedLyrics) && lines.length > 0,
        lines,
        plain: data.plainLyrics || (lines.map((l) => l.text).join('\n') || 'No lyrics available.'),
      };
    }
  } catch (e) {
    console.warn('LRCLIB direct fetch error:', e);
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
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.artist) {
        return data.artist;
      }
    }
  } catch (err) {
    console.warn('API getArtistMedia error:', err);
  }
  return null;
}

export async function getListenHistory(userId: string): Promise<ListenMemoryEntry[]> {
  try {
    const res = await fetch(`/api/listen-memory?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (err) {
    console.warn('API getListenHistory error:', err);
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
  } catch (err) {}

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
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.results?.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('API getCuratedSongs error, falling back to iTunes RSS:', err);
  }

  return await fallbackItunesTopSongs('us', 30);
}

export async function getRegionalSongs(country: string): Promise<Song[]> {
  try {
    const res = await fetch(`/api/charts/regional?country=${encodeURIComponent(country)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.results?.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn(`API getRegionalSongs error [${country}], falling back to regional RSS:`, err);
  }

  return await fallbackItunesTopSongs(country, 25);
}

export async function getTrendingArtists(): Promise<{ name: string; imageUrl: string; listeners?: string }[]> {
  try {
    const res = await fetch('/api/charts/artists');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.artists?.length > 0) {
        return data.artists;
      }
    }
  } catch (err) {
    console.warn('API getTrendingArtists error:', err);
  }

  // Fallback: extract artists from curated songs
  const songs = await getCuratedSongs();
  const artistMap = new Map<string, string>();
  for (const s of songs) {
    if (s.artist && !artistMap.has(s.artist)) {
      artistMap.set(s.artist, s.coverUrl);
    }
    if (artistMap.size >= 12) break;
  }

  return Array.from(artistMap.entries()).map(([name, imageUrl]) => ({
    name,
    imageUrl,
    listeners: 'Top Charted',
  }));
}

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
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) return data.data;
    }
  } catch (err) {
    console.warn('API getSongSuggestions error:', err);
  }

  if (artist) {
    return await searchSongs(artist);
  }
  return await getCuratedSongs();
}
