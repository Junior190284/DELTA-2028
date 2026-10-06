/**
 * Centralized Media Configuration & Helpers
 * Uses local high-quality walkout videos located in /media/walkouts/
 * with fallback support for remote cloud storage (Supabase Storage).
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
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/media/')) {
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
    tunnel: '/media/walkouts/gemini_generated_video_0cb968a2.mp4',
    bgGold: '/media/walkouts/gemini_generated_video_15f3538b.mp4',
    bgInferno: '/media/walkouts/inferno-bg.mp4',
    bgLegend: '/media/walkouts/gemini_generated_video_f8c08d08.mp4',
    bgMatchday: '/media/walkouts/gemini_generated_video_dd3ce74b.mp4',
    bgEpicPortal: '/media/walkouts/gemini_generated_video_ca0c0f50.mp4',
    bgDiamondMVP: '/media/walkouts/gemini_generated_video_f3975be6.mp4',
    bgFlamesHero: '/media/walkouts/gemini_generated_video_37e13dfb.mp4',
  },
} as const;

/**
 * Returns background video URL based on card rarity tier and card type
 */
export function getCardTierBackgroundVideo(tier?: string | null, cardType?: string | null): string {
  const normalizedTier = tier?.toLowerCase() || '';
  const normalizedType = cardType?.toLowerCase() || '';

  // 1. Check card type specific videos
  if (normalizedType === 'hat_trick_hero' || normalizedType === 'goal_hunter') {
    return MEDIA.packOpening.bgFlamesHero;
  }
  if (normalizedType === 'mvp' || normalizedType === 'special_event') {
    return MEDIA.packOpening.bgDiamondMVP;
  }
  if (normalizedType === 'matchday') {
    return MEDIA.packOpening.bgMatchday;
  }

  // 2. Check rarity tier
  switch (normalizedTier) {
    case 'inferno':
      return MEDIA.packOpening.bgInferno;
    case 'legendary':
    case 'legend':
      return MEDIA.packOpening.bgLegend;
    case 'epic':
      return MEDIA.packOpening.bgEpicPortal;
    case 'matchday':
      return MEDIA.packOpening.bgMatchday;
    case 'rare':
    case 'gold':
    default:
      return MEDIA.packOpening.bgGold;
  }
}
