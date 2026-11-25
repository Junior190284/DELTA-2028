import * as THREE from "three";
import type { PackOpeningResult, CardDefinition } from "@/lib/cards/types";
import { resolveWalkoutPresentation } from "@/lib/cards/walkout-config";
import { resolveSafePlayerImageUrl } from "@/lib/cards/playerVisuals";

export interface InfernoCardPresentationItem {
  id: string;
  cardDefinitionId: string;
  name: string;
  surname: string;
  fullDisplayName: string;
  ovr: number;
  position: string;
  shirtNumber: string;
  rarity: string;
  theme: string;
  priority: number;
  imageUrl: string | null;
  isDuplicate: boolean;
  duplicatePoints: number;
  isHero: boolean;
  stats?: {
    pac?: number;
    sho?: number;
    pas?: number;
    dri?: number;
    def?: number;
    phy?: number;
  };
}

export interface Inferno3DPackPresentation {
  cards: InfernoCardPresentationItem[];
  heroCard: InfernoCardPresentationItem;
  totalCount: number;
  originalSummaryOrder: InfernoCardPresentationItem[];
}

/**
 * Maps production PackOpeningResult into strictly-typed presentation items for InfernoPackCanvas.
 * Identifies the Hero card using official resolveWalkoutPresentation() priority.
 * Preserves the exact original server order for SUMMARY display.
 */
export function mapPackResultToInferno3D(
  result: PackOpeningResult
): Inferno3DPackPresentation {
  const rawCards = result.cards || [];

  const mappedItems: InfernoCardPresentationItem[] = rawCards.map((item, idx) => {
    const card = item.card;
    const { theme, priority } = resolveWalkoutPresentation(card);

    const safeImageUrl = resolveSafePlayerImageUrl({
      playerName: card.player?.display_name,
      cardName: card.card_name,
      artworkUrl: card.artwork_url,
      photoPath: (card.player as any)?.photo_path,
    });

    // Derive surname and display name
    const rawName = card.player?.display_name || card.card_name || "Zawodnik";
    const nameParts = rawName.trim().split(/\s+/);
    const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : rawName;

    // Derive OVR deterministically from card data or default based on rarity
    let baseOvr = 75;
    const normRarity = (card.rarity || "").toLowerCase();
    if (normRarity === "inferno") baseOvr = 99;
    else if (normRarity === "legendary") baseOvr = 93;
    else if (normRarity === "epic") baseOvr = 87;
    else if (normRarity === "rare") baseOvr = 81;
    else baseOvr = 74;

    return {
      id: `${card.id}-${idx}`,
      cardDefinitionId: card.id,
      name: rawName,
      surname: surname.toUpperCase(),
      fullDisplayName: rawName,
      ovr: baseOvr,
      position: card.player?.position || "NAP",
      shirtNumber: card.player?.shirt_number ? `#${card.player.shirt_number}` : "",
      rarity: normRarity,
      theme,
      priority,
      imageUrl: safeImageUrl,
      isDuplicate: !!item.is_duplicate,
      duplicatePoints: item.duplicate_points || 0,
      isHero: false,
      stats: {
        pac: Math.min(99, baseOvr + 2),
        sho: Math.min(99, baseOvr - 1),
        pas: Math.min(99, baseOvr),
        dri: Math.min(99, baseOvr + 1),
        def: Math.max(50, baseOvr - 8),
        phy: Math.min(99, baseOvr + 3),
      },
    };
  });

  // Preserve the exact original server order for SUMMARY
  const originalSummaryOrder = [...mappedItems];

  // HERO SELECTION:
  // 1. Highest walkout priority from resolveWalkoutPresentation()
  // 2. Tie-break: highest OVR
  // 3. Fallback tie-break: highest duplicatePoints or first drawn
  let highestPriorityIndex = 0;
  let maxPriority = -1;
  let maxOvr = -1;

  mappedItems.forEach((item, idx) => {
    if (item.priority > maxPriority) {
      maxPriority = item.priority;
      maxOvr = item.ovr;
      highestPriorityIndex = idx;
    } else if (item.priority === maxPriority) {
      if (item.ovr > maxOvr) {
        maxOvr = item.ovr;
        highestPriorityIndex = idx;
      }
    }
  });

  // Designate the hero card
  mappedItems[highestPriorityIndex].isHero = true;
  const heroCard = mappedItems[highestPriorityIndex];

  // Reorder for 3D Presentation Fan & Climax Reveal:
  // The background cards are slots 0..N-2
  // The Hero card is ALWAYS placed in the final slot N-1 so it swoops to center stage in Phase 6/7
  const backgroundCards = mappedItems.filter((_, idx) => idx !== highestPriorityIndex);
  const presentation3DOrder = [...backgroundCards, heroCard];

  return {
    cards: presentation3DOrder,
    heroCard,
    totalCount: presentation3DOrder.length,
    originalSummaryOrder,
  };
}

/**
 * Creates a high-fidelity 2D Canvas texture for card front (AWERS)
 * Matches genuine DELTA card layout with safe photo / silhouette fallback.
 */
export function createCardFrontCanvasTexture(
  item: InfernoCardPresentationItem
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    return fallbackTex;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // GLTF mesh has UV v=0 at top (+Y) and v=1 at bottom (-Y), and u=0 at left (-X).
  // Standard Three.js CanvasTexture has flipY=true which inverted the card.
  // Setting flipY=false aligns canvas (0,0) directly with GLTF mesh top-left.
  texture.flipY = false;

  // Determine theme color palette
  const theme = (item.theme || item.rarity || "STANDARD").toUpperCase();
  let primaryColor = "#ff4511";
  let secondaryColor = "#ffaa00";
  let bgGradStart = "#16090c";
  let bgGradMid = "#290c12";
  let bgGradEnd = "#080406";
  let badgeLabel = "INFERNO ULTRA";

  if (theme.includes("INFERNO")) {
    primaryColor = "#ff3311";
    secondaryColor = "#ffaa11";
    bgGradStart = "#1c0709";
    bgGradMid = "#320b12";
    bgGradEnd = "#0c0305";
    badgeLabel = "INFERNO ULTRA";
  } else if (theme.includes("ICON") || theme.includes("LEGEND")) {
    primaryColor = "#ffd700";
    secondaryColor = "#c59b27";
    bgGradStart = "#120e18";
    bgGradMid = "#241832";
    bgGradEnd = "#07050a";
    badgeLabel = "DELTA ICON";
  } else if (theme.includes("GOLD") || theme.includes("EPIC")) {
    primaryColor = "#e6a817";
    secondaryColor = "#ffcc33";
    bgGradStart = "#1a1408";
    bgGradMid = "#2d220b";
    bgGradEnd = "#090703";
    badgeLabel = "GOLD MASTER";
  } else if (theme.includes("MATCHDAY") || theme.includes("RARE")) {
    primaryColor = "#00c3ff";
    secondaryColor = "#0077ff";
    bgGradStart = "#07121c";
    bgGradMid = "#0c2438";
    bgGradEnd = "#04090f";
    badgeLabel = "MATCHDAY HERO";
  } else {
    // STANDARD / COMMON
    primaryColor = "#a0aab8";
    secondaryColor = "#6b7280";
    bgGradStart = "#12141a";
    bgGradMid = "#1e222d";
    bgGradEnd = "#08090c";
    badgeLabel = "DELTA BASE";
  }

  function renderCard(loadedImage: HTMLImageElement | null) {
    if (!ctx) return;
    ctx.clearRect(0, 0, 1024, 1440);

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1440);
    bgGrad.addColorStop(0, bgGradStart);
    bgGrad.addColorStop(0.45, bgGradMid);
    bgGrad.addColorStop(1, bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 1440);

    // 2. Subtle background geometric pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 2;
    for (let x = -200; x < 1200; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 300, 1440);
      ctx.stroke();
    }

    // 3. Double Metallic Border
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 16;
    ctx.strokeRect(32, 32, 960, 1376);

    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, 928, 1344);

    // 4. Header Bar: Club and Theme Pill
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(60, 60, 904, 76);
    ctx.fillStyle = secondaryColor;
    ctx.font = "900 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`DELTA WARSZAWA • ${badgeLabel}`, 512, 110);

    // 5. OVR Rating Badge (Top Left)
    ctx.fillStyle = primaryColor;
    ctx.font = "900 132px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${item.ovr}`, 80, 275);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("OVR", 84, 315);

    ctx.fillStyle = secondaryColor;
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(item.position, 84, 360);

    if (item.shirtNumber) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(item.shirtNumber, 84, 400);
    }

    // 6. Duplicate Badge (Top Right)
    if (item.isDuplicate) {
      ctx.fillStyle = "rgba(255, 170, 0, 0.25)";
      ctx.fillRect(720, 160, 220, 50);
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 2;
      ctx.strokeRect(720, 160, 220, 50);
      ctx.fillStyle = "#ffaa00";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`+${item.duplicatePoints} DP DUPLIKAT`, 830, 193);
    }

    // 7. Player Cutout or Neutral Silhouette Fallback
    const photoBoxX = 220;
    const photoBoxY = 220;
    const photoBoxW = 584;
    const photoBoxH = 680;

    if (loadedImage) {
      // Draw actual player cutout centered
      ctx.save();
      ctx.beginPath();
      ctx.rect(80, 160, 864, 760);
      ctx.clip();

      const aspect = loadedImage.width / loadedImage.height;
      let drawW = photoBoxW;
      let drawH = photoBoxW / aspect;
      if (drawH < photoBoxH) {
        drawH = photoBoxH;
        drawW = photoBoxH * aspect;
      }
      const drawX = photoBoxX + (photoBoxW - drawW) / 2;
      const drawY = photoBoxY + (photoBoxH - drawH) / 2;
      ctx.drawImage(loadedImage, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Neutral Stylized Silhouette (Anti-leak Safe Fallback)
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.arc(512, 540, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Stylized head & shoulders silhouette
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.beginPath();
      ctx.arc(512, 450, 90, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(512, 690, 180, 140, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Club initials / emblem watermark
      ctx.fillStyle = secondaryColor;
      ctx.font = "900 72px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DELTA", 512, 580);
      ctx.restore();
    }

    // 8. Player Nameplate Banner
    const nameplateY = 960;
    ctx.fillStyle = "rgba(10, 8, 14, 0.90)";
    ctx.fillRect(70, nameplateY, 884, 150);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(70, nameplateY, 884, 150);

    // Surname
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 68px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.surname, 512, nameplateY + 80);

    // Full name
    ctx.fillStyle = secondaryColor;
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(item.fullDisplayName, 512, nameplateY + 124);

    // 9. Stats Grid
    const statsY = 1140;
    ctx.fillStyle = "rgba(15, 12, 20, 0.85)";
    ctx.fillRect(70, statsY, 884, 180);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, statsY, 884, 180);

    const statLabels = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
    const statValues = [
      item.stats?.pac || 80,
      item.stats?.sho || 78,
      item.stats?.pas || 82,
      item.stats?.dri || 84,
      item.stats?.def || 68,
      item.stats?.phy || 79,
    ];

    const colWidth = 884 / 6;
    statLabels.forEach((label, i) => {
      const colX = 70 + i * colWidth + colWidth / 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, colX, statsY + 60);

      ctx.fillStyle = primaryColor;
      ctx.font = "900 52px sans-serif";
      ctx.fillText(`${statValues[i]}`, colX, statsY + 130);
    });

    // 10. Bottom series watermark
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `K.S. DELTA WARSZAWA • OFFICIAL DIGITAL CARD #${item.cardDefinitionId.slice(0, 8)}`,
      512,
      1385
    );

    texture.needsUpdate = true;
  }

  // Initial render with fallback silhouette
  renderCard(null);

  // If imageUrl exists, load safely without blocking synchronous setup
  if (item.imageUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      renderCard(img);
    };
    img.onerror = () => {
      // Graceful fallback to neutral silhouette
      renderCard(null);
    };
    img.src = item.imageUrl;
  }

  return texture;
}

/**
 * Disposes array of Three.js textures cleanly to prevent GPU VRAM leaks.
 */
export function disposeInfernoCardTextures(textures: THREE.Texture[]) {
  if (!textures || !Array.isArray(textures)) return;
  textures.forEach((tex) => {
    if (tex && typeof tex.dispose === "function") {
      tex.dispose();
    }
  });
}
