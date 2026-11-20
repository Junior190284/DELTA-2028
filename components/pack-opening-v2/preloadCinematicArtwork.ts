const CINEMATIC_THEMES = ["inferno", "legend", "gold", "matchday", "standard"] as const;
const artworkCache = new Map<string, HTMLImageElement>();

/** Warm browser image cache before the user switches to another pack theme. */
export function preloadCinematicArtwork() {
  if (typeof window === "undefined") return;
  for (const theme of CINEMATIC_THEMES) {
    for (const asset of [
      `/media/walkouts/delta-${theme}-pack-cutout.webp`,
      `/media/walkouts/delta-${theme === "inferno" ? "inferno-red" : theme}-stadium.webp`,
    ]) {
      if (artworkCache.has(asset)) continue;
      const image = new window.Image();
      image.src = asset;
      artworkCache.set(asset, image);
    }
  }
}
