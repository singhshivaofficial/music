import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface TrackArtworkProps {
  coverUrl?: string;
  title: string;
  artist?: string;
  youtubeId?: string;
  streamUrl?: string;
  className?: string;
  containerClassName?: string;
  iconClassName?: string;
  alt?: string;
  loading?: 'lazy' | 'eager';
}

const DEFAULT_UNSPLASH =
  'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80';

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  coverUrl,
  title,
  artist,
  youtubeId,
  streamUrl,
  className = 'w-full h-full object-cover',
  containerClassName = '',
  iconClassName = 'w-6 h-6',
  alt,
  loading = 'lazy',
}) => {
  // Extract candidate YouTube ID from youtubeId or streamUrl (e.g. youtube:dQw4w9WgXcQ)
  let candidateYtId = youtubeId;
  if (!candidateYtId && streamUrl?.startsWith('youtube:')) {
    const raw = streamUrl.replace('youtube:', '');
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
      candidateYtId = raw;
    }
  }

  // 1. Primary check: If Last.fm provides a valid image URL
  const isValidCover =
    coverUrl &&
    typeof coverUrl === 'string' &&
    coverUrl.trim().length > 0 &&
    !coverUrl.includes('2a96cbd8b46e442fc41c2b86b821562f');

  // 2. YouTube Fallback: If playing or resolving via YouTube
  const ytArtwork = candidateYtId ? `https://img.youtube.com/vi/${candidateYtId}/hqdefault.jpg` : '';

  const initialSrc = isValidCover ? coverUrl : (ytArtwork || '');
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const currentValid =
      coverUrl &&
      typeof coverUrl === 'string' &&
      coverUrl.trim().length > 0 &&
      !coverUrl.includes('2a96cbd8b46e442fc41c2b86b821562f');

    if (currentValid) {
      setImgSrc(coverUrl);
      setHasError(false);
    } else if (candidateYtId) {
      setImgSrc(`https://img.youtube.com/vi/${candidateYtId}/hqdefault.jpg`);
      setHasError(false);
    } else if (artist && title) {
      // 3. iTunes Artwork Fallback
      let isMounted = true;
      const cleanArtist = artist.split(',')[0].split('&')[0].trim();
      const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          `${cleanArtist} ${cleanTitle}`
        )}&entity=song&limit=1`
      )
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data?.results?.[0]?.artworkUrl100) {
            const upgraded = data.results[0].artworkUrl100
              .replace('100x100bb.jpg', '600x600bb.jpg')
              .replace('100x100bb', '600x600bb');
            setImgSrc(upgraded);
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    } else {
      setImgSrc('');
    }
  }, [coverUrl, candidateYtId, artist, title]);

  // 4. Glass Placeholder: If all fail, display an elegant purple glassmorphic placeholder with sleek <Music />
  if (!imgSrc || hasError) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#60519b]/30 via-[#1e202c] to-[#0a0a0f] backdrop-blur-md ${containerClassName}`}
      >
        <Music className={`${iconClassName} text-[#bfc0d1]/80`} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt || `${title} - ${artist || ''}`}
      className={className}
      loading={loading}
      onError={(e) => {
        // Fallback to Unsplash placeholder as requested
        e.currentTarget.src = DEFAULT_UNSPLASH;
      }}
    />
  );
};
