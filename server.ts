import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import ytSearch from 'yt-search';

const app = express();
const PORT = 3000;

app.use(express.json());

// Last.fm API Key configuration: loaded securely from process.env.LASTFM_API_KEY
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

// In-memory persistent store for listen memories (per user)
interface ListenRecord {
  userId: string;
  songId: string;
  title: string;
  artist: string;
  coverUrl: string;
  playedAt: number;
  duration?: number;
}

const listenMemoryStore: Map<string, ListenRecord[]> = new Map();

// Helper: Extract best image from Last.fm image array
// Primary Check: If Last.fm provides a valid non-empty image URL (not ending in 2a96cbd8b46e442fc41c2b86b821562f.png), use it.
function extractLastFmImage(images: any[] | undefined): string | null {
  if (Array.isArray(images) && images.length > 0) {
    const extralarge = images.find((i: any) => i.size === 'extralarge' || i.size === 'mega');
    const large = images.find((i: any) => i.size === 'large');
    const medium = images.find((i: any) => i.size === 'medium');
    const url = extralarge?.['#text'] || large?.['#text'] || medium?.['#text'] || images[images.length - 1]?.['#text'] || '';
    if (
      url &&
      typeof url === 'string' &&
      url.trim().length > 0 &&
      !url.includes('2a96cbd8b46e442fc41c2b86b821562f') &&
      url.startsWith('http')
    ) {
      return url.trim();
    }
  }
  return null;
}

// iTunes Artwork Fallback Cache
const itunesCoverCache = new Map<string, string>();

// iTunes Artwork Fallback: For search results with missing covers, fetch high-res artwork via iTunes Search API
async function getItunesArtwork(artist: string, title: string): Promise<string> {
  const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = artist.split(',')[0].split('&')[0].trim();
  const cacheKey = `${cleanArtist.toLowerCase()}:::${cleanTitle.toLowerCase()}`;
  if (itunesCoverCache.has(cacheKey)) {
    return itunesCoverCache.get(cacheKey)!;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}&entity=song&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      const first = data.results?.[0];
      if (first?.artworkUrl100) {
        const upgraded = first.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb', '600x600bb');
        itunesCoverCache.set(cacheKey, upgraded);
        return upgraded;
      }
    }
  } catch {
    // Ignore timeout / network error
  }
  return '';
}

// Helper: Make Last.fm API Call
async function callLastFm(method: string, params: Record<string, string>): Promise<any> {
  const queryParams = new URLSearchParams({
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params,
  });

  const response = await fetch(`${LASTFM_BASE}?${queryParams.toString()}`, {
    headers: { 'User-Agent': 'WaveMusicApp/2.0' },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`Last.fm API returned HTTP ${response.status}`);
  }
  return await response.json();
}

// Generate clean song ID
function makeSongId(artist: string, title: string): string {
  const clean = `${artist.trim().toLowerCase()}:::${title.trim().toLowerCase()}`;
  return `lastfm_${Buffer.from(clean).toString('base64url')}`;
}

// Decode song ID back to artist & title
function decodeSongId(id: string): { artist: string; title: string } | null {
  if (!id.startsWith('lastfm_')) return null;
  try {
    const raw = Buffer.from(id.slice(7), 'base64url').toString('utf8');
    const [artist, title] = raw.split(':::');
    if (artist && title) return { artist, title };
  } catch {}
  return null;
}

// Helper: Format Last.fm track into app's Song model
async function formatLastFmTrack(track: any): Promise<any> {
  if (!track || (!track.name && !track.title)) return null;

  const title = track.name || track.title || 'Unknown Title';
  const artist =
    typeof track.artist === 'string'
      ? track.artist
      : track.artist?.name || 'Unknown Artist';
  const duration = track.duration ? Number(track.duration) : 210;

  // 1. Primary Check: If Last.fm provides a valid non-empty image URL (not ending in 2a96cbd8b46e442fc41c2b86b821562f.png), use it.
  let coverUrl = extractLastFmImage(track.image) || '';

  // 3. iTunes Artwork Fallback: For search results with missing covers, fetch high-res artwork via iTunes Search API
  if (!coverUrl) {
    coverUrl = await getItunesArtwork(artist, title);
  }

  const id = makeSongId(artist, title);

  return {
    id,
    title,
    artist,
    album: track.album?.title || track.album?.['#text'] || 'Single',
    duration,
    coverUrl, // will be resolved or empty (enabling YouTube fallback or sleek purple glass placeholder)
    streamUrl: `youtube:${encodeURIComponent(`${artist} ${title} audio`)}`,
    quality: 'Full Track',
    source: 'lastfm',
    listeners: track.listeners ? String(track.listeners) : undefined,
    playcount: track.playcount ? String(track.playcount) : undefined,
  };
}

// API: Health check
app.get(['/api/health', '/health', '/healthz', '/_ah/health'], (req, res) => {
  res.json({
    status: 'ok',
    engine: 'lastfm + youtube',
    hasLastFmKey: Boolean(process.env.LASTFM_API_KEY),
  });
});

// API 1: Last.fm Search Engine
// Route user queries to track.search
app.get(['/api/music/search', '/music/search', '/api/search/songs', '/search/songs'], async (req, res) => {
  const query = (req.query.query as string) || (req.query.q as string) || '';
  if (!query.trim()) {
    return res.json({ success: true, data: { total: 0, results: [] } });
  }

  try {
    const data = await callLastFm('track.search', {
      track: query.trim(),
      limit: '30',
    });

    const rawTracks = data?.results?.trackmatches?.track || [];
    const tracksArray = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

    const results = (
      await Promise.all(tracksArray.map((t: any) => formatLastFmTrack(t)))
    ).filter(Boolean);

    // If Last.fm found matches, return immediately
    if (results.length > 0) {
      return res.json({
        success: true,
        data: {
          total: results.length,
          results,
        },
      });
    }

    // Fallback: iTunes Search if Last.fm yields no results
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&entity=song&limit=25`;
    const itunesRes = await fetch(itunesUrl, { signal: AbortSignal.timeout(4000) });
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      const itunesSongs = (itunesData.results || []).map((t: any) => ({
        id: makeSongId(t.artistName, t.trackName),
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName || 'Single',
        duration: Math.round(t.trackTimeMillis / 1000) || 210,
        coverUrl: t.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        streamUrl: `youtube:${encodeURIComponent(`${t.artistName} ${t.trackName} audio`)}`,
        quality: 'Full Track',
        source: 'lastfm',
      }));

      return res.json({
        success: true,
        data: {
          total: itunesSongs.length,
          results: itunesSongs,
        },
      });
    }

    res.json({ success: true, data: { total: 0, results: [] } });
  } catch (err: any) {
    console.error('Last.fm search error:', err.message);
    res.json({ success: true, data: { total: 0, results: [] } });
  }
});

// API 2: Trending & Discovery (chart.gettoptracks & chart.gettopartists)
app.get(['/api/curated', '/curated', '/api/charts/tracks', '/charts/tracks'], async (req, res) => {
  try {
    const data = await callLastFm('chart.gettoptracks', { limit: '30' });
    const rawTracks = data?.tracks?.track || [];
    const tracksArray = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

    const results = (
      await Promise.all(tracksArray.map((t: any) => formatLastFmTrack(t)))
    ).filter(Boolean);

    if (results.length > 0) {
      return res.json({ success: true, results });
    }
  } catch (err: any) {
    console.warn('Last.fm top tracks notice:', err.message);
  }

  // Fallback: iTunes Top Songs RSS
  try {
    const itunesRes = await fetch('https://itunes.apple.com/us/rss/topsongs/limit=30/json', {
      signal: AbortSignal.timeout(4000),
    });
    if (itunesRes.ok) {
      const itunesData = await itunesRes.json();
      const entries = itunesData.feed?.entry || [];
      const fallbackTracks = entries.map((e: any) => {
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
      return res.json({ success: true, results: fallbackTracks });
    }
  } catch (e: any) {
    console.error('Curated fallback error:', e.message);
  }

  res.json({ success: true, results: [] });
});

app.get(['/api/charts/regional', '/charts/regional'], async (req, res) => {
  const country = (req.query.country as string) || 'united states';
  try {
    const data = await callLastFm('geo.gettoptracks', { country, limit: '20' });
    const rawTracks = data?.tracks?.track || [];
    const tracksArray = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

    const results = (
      await Promise.all(tracksArray.map((t: any) => formatLastFmTrack(t)))
    ).filter(Boolean);

    res.json({ success: true, results });
  } catch (err: any) {
    console.error(`Last.fm regional tracks error [${country}]:`, err.message);
    res.status(500).json({ success: false, error: err.message, results: [] });
  }
});

app.get(['/api/charts/artists', '/charts/artists'], async (req, res) => {
  try {
    const data = await callLastFm('chart.gettopartists', { limit: '15' });
    const rawArtists = data?.artists?.artist || [];
    const artists = (Array.isArray(rawArtists) ? rawArtists : [rawArtists]).map((a: any) => ({
      name: a.name,
      listeners: a.listeners,
      playcount: a.playcount,
      imageUrl: extractLastFmImage(a.image) || '',
      url: a.url,
    }));

    res.json({ success: true, artists });
  } catch (err: any) {
    console.error('Last.fm top artists error:', err.message);
    res.status(500).json({ success: false, error: err.message, artists: [] });
  }
});

// API 3: Smart "Up Next" Autoplay Recommendations (track.getsimilar)
app.get(['/api/songs/:id/suggestions', '/songs/:id/suggestions', '/api/suggestions', '/suggestions'], async (req, res) => {
  const songId = (req.params.id as string) || (req.query.id as string) || '';
  let artist = (req.query.artist as string) || '';
  let title = (req.query.title as string) || (req.query.track as string) || '';

  // If artist or title not provided in query, attempt decoding from songId
  if ((!artist || !title) && songId) {
    const decoded = decodeSongId(songId);
    if (decoded) {
      artist = decoded.artist;
      title = decoded.title;
    }
  }

  try {
    let similarTracks: any[] = [];

    if (artist && title) {
      try {
        const data = await callLastFm('track.getsimilar', {
          artist,
          track: title,
          limit: '15',
        });
        const raw = data?.similartracks?.track || [];
        similarTracks = Array.isArray(raw) ? raw : [raw];
      } catch (err: any) {
        console.warn('Last.fm track.getsimilar notice:', err.message);
      }
    }

    // Fallback: If track.getsimilar is empty or lacks results, use artist's top tracks
    if (similarTracks.length < 5 && artist) {
      try {
        const cleanArtist = artist.split(',')[0].split('&')[0].replace(/feat\..*/i, '').trim();
        const artistTracks = await callLastFm('artist.gettoptracks', {
          artist: cleanArtist,
          limit: '15',
        });
        const raw = artistTracks?.toptracks?.track || [];
        const extra = (Array.isArray(raw) ? raw : [raw]).filter(
          (t: any) => t.name?.toLowerCase() !== title.toLowerCase()
        );
        similarTracks = [...similarTracks, ...extra];
      } catch (e: any) {
        console.warn('Artist top tracks fallback notice:', e.message);
      }
    }

    // Deduplicate and format
    const seen = new Set<string>();
    const formattedRaw = (
      await Promise.all(similarTracks.map((t: any) => formatLastFmTrack(t)))
    ).filter((s: any) => {
      if (!s || !s.title || seen.has(s.id)) return false;
      if (s.title.toLowerCase() === title.toLowerCase() && s.artist.toLowerCase() === artist.toLowerCase()) {
        return false;
      }
      seen.add(s.id);
      return true;
    }).slice(0, 15);

    res.json({ success: true, data: formattedRaw });
  } catch (err: any) {
    console.error('Last.fm suggestions error:', err.message);
    res.json({ success: true, data: [] });
  }
});

// API: Song Details
app.get(['/api/songs', '/songs', '/api/songs/:id', '/songs/:id'], async (req, res) => {
  const songId = (req.params.id as string) || (req.query.id as string) || '';
  if (!songId) {
    return res.status(400).json({ success: false, error: 'Missing song id parameter' });
  }

  const decoded = decodeSongId(songId);
  if (!decoded) {
    return res.status(404).json({ success: false, error: 'Track not found' });
  }

  try {
    const data = await callLastFm('track.getInfo', {
      artist: decoded.artist,
      track: decoded.title,
    });
    const track = data?.track;
    if (track) {
      const formatted = await formatLastFmTrack(track);
      return res.json({ success: true, data: formatted });
    }
  } catch (err: any) {
    console.warn('Last.fm getInfo notice:', err.message);
  }

  // Fallback to iTunes artwork if Last.fm getInfo has no artwork
  const fallbackCover = await getItunesArtwork(decoded.artist, decoded.title);

  res.json({
    success: true,
    data: {
      id: songId,
      title: decoded.title,
      artist: decoded.artist,
      album: 'Single',
      duration: 210,
      coverUrl: fallbackCover,
      streamUrl: `youtube:${encodeURIComponent(`${decoded.artist} ${decoded.title} audio`)}`,
      quality: 'Full Track',
      source: 'lastfm',
    },
  });
});

// API: YouTube Video ID Resolver (yt-search + direct scrape fallback)
app.get(['/api/music/youtube-id', '/music/youtube-id', '/api/youtube-id', '/youtube-id'], async (req, res) => {
  const query = req.query.query as string;
  if (!query) return res.status(400).json({ error: 'Query required' });
  
  // Strategy 1: yt-search
  try {
    const searchTerms = query.includes('audio') || query.includes('official') ? query : `${query} official audio`;
    const r = await ytSearch(searchTerms);
    if (r && r.videos && r.videos.length > 0) {
      const topVideo = r.videos[0];
      const youtubeId = topVideo.videoId;
      return res.json({
        success: true,
        youtubeId,
        title: topVideo.title,
        duration: topVideo.seconds,
        coverUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      });
    }
  } catch (err: any) {
    console.warn('yt-search notice, trying direct search fallback:', err.message);
  }

  // Strategy 2: Direct YouTube search scrape fallback
  try {
    const cleanQ = query.replace(/[^\w\s]/gi, ' ').trim();
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanQ} audio`)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (ytRes.ok) {
      const html = await ytRes.text();
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        const youtubeId = match[1];
        return res.json({
          success: true,
          youtubeId,
          title: query,
          duration: 210,
          coverUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        });
      }
    }
  } catch (e: any) {
    console.error('Direct YouTube search fallback error:', e.message);
  }

  return res.status(404).json({ error: 'No video found' });
});

// API: Synchronized & Plain Lyrics (via LRCLIB)
app.get(['/api/lyrics', '/lyrics'], async (req, res) => {
  const artist = (req.query.artist as string) || '';
  const title = (req.query.title as string) || '';

  if (!title) {
    return res.json({ success: false, lyrics: null });
  }

  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const cleanArtist = artist.split(',')[0].split('&')[0].trim();
    const lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
      cleanArtist
    )}&track_name=${encodeURIComponent(cleanTitle)}`;

    const lrcRes = await fetch(lrcUrl, {
      headers: { 'User-Agent': 'WaveMusicApp/2.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (lrcRes.ok) {
      const data = await lrcRes.json();
      if (data.syncedLyrics || data.plainLyrics) {
        return res.json({
          success: true,
          synced: Boolean(data.syncedLyrics),
          syncedLyrics: data.syncedLyrics || '',
          plainLyrics: data.plainLyrics || '',
        });
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  res.json({
    success: false,
    synced: false,
    plainLyrics: 'No synchronized lyrics found for this track.',
  });
});

// API: Artist Media (TheAudioDB + Last.fm)
app.get(['/api/artist', '/artist'], async (req, res) => {
  const name = (req.query.name as string) || '';
  if (!name.trim()) {
    return res.json({ success: false, artist: null });
  }

  try {
    const primaryName = name.split(',')[0].split('&')[0].split('feat.')[0].trim();
    const audiodbUrl = `https://www.theaudiodb.com/api/v1/json/123/search.php?s=${encodeURIComponent(
      primaryName
    )}`;
    const response = await fetch(audiodbUrl, { signal: AbortSignal.timeout(4000) });

    if (response.ok) {
      const data = await response.json();
      const artistData = data.artists?.[0];
      if (artistData) {
        return res.json({
          success: true,
          artist: {
            name: artistData.strArtist,
            bio: artistData.strBiographyEN,
            banner: artistData.strArtistBanner || artistData.strArtistFanart,
            fanart: artistData.strArtistFanart,
            logo: artistData.strArtistLogo,
            genre: artistData.strGenre,
          },
        });
      }
    }
  } catch (err) {}

  // Last.fm artist info fallback
  try {
    const lfmData = await callLastFm('artist.getinfo', { artist: name });
    const a = lfmData?.artist;
    if (a) {
      return res.json({
        success: true,
        artist: {
          name: a.name,
          bio: a.bio?.summary || a.bio?.content,
          banner: extractLastFmImage(a.image),
          fanart: extractLastFmImage(a.image),
          genre: a.tags?.tag?.[0]?.name,
        },
      });
    }
  } catch (err) {}

  res.json({ success: false, artist: null });
});

// API: Listen Memory
app.get(['/api/listen-memory', '/listen-memory'], (req, res) => {
  const userId = (req.query.userId as string) || 'guest';
  const history = listenMemoryStore.get(userId) || [];
  res.json({ success: true, data: history });
});

app.post(['/api/listen-memory', '/listen-memory'], (req, res) => {
  const { userId, songId, title, artist, coverUrl, duration } = req.body;
  if (!userId || !songId) {
    return res.status(400).json({ success: false, error: 'Missing userId or songId' });
  }

  let list = listenMemoryStore.get(userId) || [];
  list = list.filter((item) => item.songId !== songId);
  list.unshift({
    userId,
    songId,
    title: title || 'Unknown Title',
    artist: artist || 'Unknown Artist',
    coverUrl: coverUrl || '',
    playedAt: Date.now(),
    duration,
  });

  if (list.length > 200) list = list.slice(0, 200);
  listenMemoryStore.set(userId, list);

  res.json({ success: true, count: list.length });
});

// Vite middleware & Production static serving
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(indexHtmlPath);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(404).send('Application build not found. Please run npm run build.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wave] Server listening on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: gracefully shutting down HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[Wave] Failed to start server:', err);
    process.exit(1);
  });
}

