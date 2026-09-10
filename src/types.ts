export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: string;
  duration: number; // in seconds
  coverUrl: string;
  streamUrl: string;
  quality: string; // e.g. '320kbps'
  language?: string;
  source?: 'lastfm' | 'youtube' | 'saavn' | 'piped' | 'itunes';
  youtubeId?: string;
  listeners?: string;
  playcount?: string;
}

export interface LyricsLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricsLine[];
  plain: string;
}

export interface ArtistMedia {
  name: string;
  bio?: string;
  banner?: string;
  fanart?: string;
  logo?: string;
  genre?: string;
}

export interface ListenMemoryEntry {
  userId: string;
  songId: string;
  title: string;
  artist: string;
  coverUrl: string;
  playedAt: number; // epoch timestamp
  duration?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isGuest: boolean;
}

export type VisualizerMode = 'bars' | 'circle' | 'wave' | 'aura';
export type RepeatMode = 'off' | 'all' | 'one';
export type ViewTab = 'discover' | 'recommended' | 'trending' | 'history' | 'favorites';
