import { Song, ListenMemoryEntry } from '../types';
import { searchSongs } from './api';

export interface RecommendationSection {
  title: string;
  reason: string;
  songs: Song[];
}

export async function generateRecommendations(
  history: ListenMemoryEntry[]
): Promise<RecommendationSection[]> {
  const sections: RecommendationSection[] = [];
  const last10 = history.slice(0, 10);

  if (last10.length === 0) {
    // Default discovery recommendations for new listeners
    const defaultQueries = [
      { q: 'The Weeknd', reason: 'Global synthwave and R&B sensations' },
      { q: 'Daft Punk', reason: 'Iconic electronic and cosmic disco' },
      { q: 'Lofi Chill Beats', reason: 'Atmospheric relax and focus rhythms' },
    ];

    for (const item of defaultQueries) {
      const results = await searchSongs(item.q);
      if (results.length > 0) {
        sections.push({
          title: item.q,
          reason: item.reason,
          songs: results.slice(0, 6),
        });
      }
    }
    return sections;
  }

  // Count artist occurrences from last 10 played songs
  const artistCounts: { [artist: string]: number } = {};
  for (const item of last10) {
    const primaryArtist = item.artist.split(',')[0].split('&')[0].trim();
    if (primaryArtist) {
      artistCounts[primaryArtist] = (artistCounts[primaryArtist] || 0) + 1;
    }
  }

  // Sort artists by frequency
  const sortedArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([artist]) => artist);

  const topArtists = sortedArtists.slice(0, 3);

  for (const artist of topArtists) {
    const songs = await searchSongs(artist);
    // Exclude exact duplicates already played
    const playedSongIds = new Set(last10.map((i) => i.songId));
    const filtered = songs.filter((s) => !playedSongIds.has(s.id));

    if (filtered.length > 0) {
      sections.push({
        title: `More from ${artist}`,
        reason: `Based on your recent listening memory`,
        songs: filtered.slice(0, 6),
      });
    }
  }

  // Also recommend similar vibes if possible
  const latestTrack = last10[0];
  if (latestTrack && sections.length < 3) {
    const relatedQuery = latestTrack.title.split(' ')[0] || 'Synthwave';
    const relatedSongs = await searchSongs(relatedQuery);
    if (relatedSongs.length > 0) {
      sections.push({
        title: `Mix for "${latestTrack.title}"`,
        reason: `Echoes inspired by your latest stream`,
        songs: relatedSongs.slice(0, 6),
      });
    }
  }

  return sections;
}
