/**
 * Centralized Media Configuration & Helpers
 * Supports remote cloud storage (Supabase Storage bucket `delta-media` / CDN)
 * to reduce Vercel deployment bundle sizes.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fctgruvciakhohfxkdzp.supabase.co';
const DEFAULT_MEDIA_BASE = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/delta-media`;

export const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE
).replace(/\/+$/, '');

/**
 * Resolves a media path to a full public URL
 */
export function getMediaUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${MEDIA_BASE_URL}/${cleanPath}`;
}

export const MEDIA = {
  intro: {
    inferno: getMediaUrl('intro/inferno.mp4'),
  },
  packOpening: {
    tunnel: getMediaUrl('videos/tunnel.mp4'),
    bgGold: getMediaUrl('videos/bg_gold.mp4'),
    bgInferno: getMediaUrl('videos/bg_inferno.mp4'),
    bgLegend: getMediaUrl('videos/bg_legend.mp4'),
    bgMatchday: getMediaUrl('videos/bg_matchday.mp4'),
  },
} as const;

/**
 * Returns background video URL based on card tier
 */
export function getCardTierBackgroundVideo(tier?: string | null): string {
  const normalizedTier = tier?.toLowerCase();
  switch (normalizedTier) {
    case 'inferno':
      return MEDIA.packOpening.bgInferno;
    case 'legend':
      return MEDIA.packOpening.bgLegend;
    case 'matchday':
      return MEDIA.packOpening.bgMatchday;
    case 'gold':
    default:
      return MEDIA.packOpening.bgGold;
  }
}
