import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  mapServerUserCardsToCollectionCards,
  mapServerUnopenedPacks
} from "../components/dashboard/ui4/adapter.ts";
import { toDeltaCardModel } from "../components/dashboard/ui4/collection-dashboard.tsx";
import { resolveSafePlayerImageUrl } from "../lib/cards/playerVisuals.ts";
import type { CollectionCard } from "../components/dashboard/ui4/types.ts";

const WORKTREE_ROOT = path.resolve(__dirname, "..");
const COLLECTION_DASHBOARD_PATH = path.join(WORKTREE_ROOT, "components/dashboard/ui4/collection-dashboard.tsx");
const HOME_DASHBOARD_PATH = path.join(WORKTREE_ROOT, "components/dashboard/ui4/home-dashboard.tsx");
const NEUTRAL_SILHOUETTE_PATH = path.join(WORKTREE_ROOT, "components/cards/NeutralPlayerSilhouette.tsx");
const CARD_CUTOUT_PATH = path.join(WORKTREE_ROOT, "components/cards/CardCutout.tsx");

test("DELTA-042C: Mobile compact navigation (<640px) tabs and default state", () => {
  const colSrc = fs.readFileSync(COLLECTION_DASHBOARD_PATH, "utf8");

  // 1. Mobile navigation segmented control container
  assert.ok(colSrc.includes('data-testid="mobile-collection-tabs"'), "Must feature mobile collection tabs container");
  assert.ok(colSrc.includes('role="tablist"'), "Mobile tabs must have role='tablist'");
  assert.ok(colSrc.includes('aria-label="Nawigacja sekcji kolekcji"'), "Must have accessible label for tabs");

  // 2. All 3 tabs defined with role='tab' and minimum 44px touch targets
  assert.ok(colSrc.includes('data-testid="mobile-tab-album"'), "Must have mobile tab for Album");
  assert.ok(colSrc.includes('data-testid="mobile-tab-vault"'), "Must have mobile tab for Skarbiec");
  assert.ok(colSrc.includes('data-testid="mobile-tab-series"'), "Must have mobile tab for Serie");
  assert.ok(colSrc.includes('min-h-[44px]'), "Touch targets must satisfy min-h-[44px] requirement");

  // 3. Default state is 'album'
  assert.ok(
    colSrc.includes('useState<"album" | "vault" | "series">("album")'),
    "Default mobile section must be 'album'"
  );
});

test("DELTA-042C: Responsive section switching on mobile (<640px) and simultaneous display on desktop", () => {
  const colSrc = fs.readFileSync(COLLECTION_DASHBOARD_PATH, "utf8");

  // 1. Row 1 visibility controlled by mobileSection
  assert.ok(
    colSrc.includes('d4-dashboard-row-1 ${mobileSection === "album" ? "d4-hide-mobile" : ""}') ||
    colSrc.includes('mobileSection === "album" ? "d4-hide-mobile" : ""'),
    "Row 1 must be hidden on mobile when viewing album via d4-hide-mobile"
  );

  // 2. Left column (Hero + Vault) visibility
  assert.ok(
    colSrc.includes('mobileSection !== "vault" ? "d4-hide-mobile" : ""'),
    "Left column must show on mobile only when vault is active via d4-hide-mobile"
  );

  // 3. Right column (Series + Recent Drops) visibility
  assert.ok(
    colSrc.includes('mobileSection !== "series" ? "d4-hide-mobile" : ""'),
    "Right column must show on mobile only when series is active via d4-hide-mobile"
  );

  // 4. Full Album section visibility
  assert.ok(
    colSrc.includes('mobileSection !== "album" ? "d4-hide-mobile" : ""'),
    "Full album must show on mobile when album is active via d4-hide-mobile"
  );
});

test("DELTA-042C: Desktop layout tightening (margins, gaps, paddings)", () => {
  const colSrc = fs.readFileSync(COLLECTION_DASHBOARD_PATH, "utf8");

  // Album section margin tightened
  assert.ok(colSrc.includes("mt-3 sm:mt-5"), "Full album section must use tightened mt-3 sm:mt-5");
  // Pack vault list max height tightened
  assert.ok(colSrc.includes("max-h-[190px]"), "Pack vault list max height must be tightened to 190px");
  // Row 1 sections tightened padding
  assert.ok(colSrc.includes("p-3.5 sm:p-4"), "Series and Recent drops must use tightened p-3.5 sm:p-4");
});

test("DELTA-042C: Hero card decupling and active child safe photo resolution", () => {
  const colSrc = fs.readFileSync(COLLECTION_DASHBOARD_PATH, "utf8");

  // Uses resolveSafePlayerImageUrl strictly for active child
  assert.ok(colSrc.includes("resolveSafePlayerImageUrl"), "Must import and use resolveSafePlayerImageUrl");
  assert.ok(colSrc.includes("authorizedActivePhoto"), "Must resolve authorizedActivePhoto");
  assert.ok(colSrc.includes("activePlayerCard"), "Must find activePlayerCard for active child only");

  // Hero card title indicates active child in Inferno visual style
  assert.ok(
    colSrc.includes("GŁÓWNA KARTA ZAWODNIKA · STYL INFERNO"),
    "Hero badge must designate active player card in Inferno style"
  );
  // Card rarity is not hardcoded to inferno
  assert.ok(
    colSrc.includes("rarity: (activePlayerCard?.rarity ? activePlayerCard.rarity.toLowerCase() : \"common\")"),
    "Card rarity must reflect authentic card rarity, not hardcoded inferno"
  );
});

test("DELTA-042C: NeutralPlayerSilhouette athletic presence, aura, and crest medallion", () => {
  const silhouetteSrc = fs.readFileSync(NEUTRAL_SILHOUETTE_PATH, "utf8");

  // 1. Dynamic Radial Aura
  assert.ok(silhouetteSrc.includes("radial-gradient"), "Must render dynamic radial aura");
  assert.ok(silhouetteSrc.includes("blur("), "Aura must have glow blur");

  // 2. Athletic SVG contours (athletic V-neck, chest wash/ribbing, side accents, shoulder seams)
  assert.ok(silhouetteSrc.includes("rib-"), "Must have dynamic athletic chest contour ribbing");
  assert.ok(silhouetteSrc.includes("strokeDasharray"), "Must have dynamic athletic side accent panels");

  // 3. High-contrast medallion with rarity accent rim and jersey number
  assert.ok(silhouetteSrc.includes('data-testid="neutral-silhouette-medallion"'), "Must have medallion container");
  assert.ok(silhouetteSrc.includes("fontWeight: 1000") || silhouetteSrc.includes("1000"), "Must have prominent bold jersey number");
  assert.ok(silhouetteSrc.includes("cleanNumber"), "Must display authentic shirt number or DELTA fallback");
  assert.ok(silhouetteSrc.includes("GM"), "Must have vector GM crest fallback");

  // 4. Zero stock photos, zero synthetic faces
  assert.ok(!silhouetteSrc.includes("unsplash.com"), "Must not use stock photos");
  assert.ok(!silhouetteSrc.includes("thispersondoesnotexist"), "Must not use synthetic face generators");
});

test("DELTA-042C: CardCutout renders NeutralPlayerSilhouette when photoUrl is null or unavailable", () => {
  const cutoutSrc = fs.readFileSync(CARD_CUTOUT_PATH, "utf8");

  assert.ok(cutoutSrc.includes("NeutralPlayerSilhouette"), "CardCutout must render NeutralPlayerSilhouette");
  assert.ok(cutoutSrc.includes("hasValidPhoto"), "CardCutout must check hasValidPhoto");
  assert.ok(cutoutSrc.includes("sanitizePlayerPhotoCandidate"), "Must sanitize photo candidate");
});

test("DELTA-042C: Future photo compatibility - mapping passes authentic playerPhotoUrl & artworkUrl", () => {
  const serverCards = [
    {
      id: "uc-real-1",
      card_id: "def-1",
      card_definition: {
        id: "def-1",
        card_name: "Zawodnik Alfa",
        title: "Karta Meczowa",
        card_type: "matchday",
        rarity: "epic",
        artwork_url: "https://delta-cdn.example.com/art/jan.png",
        player: {
          id: "p-1",
          name: "Zawodnik Alfa",
          display_name: "Zawodnik Alfa",
          shirt_number: 10,
          position: "POM",
          photo_path: "https://delta-cdn.example.com/photos/jan.png"
        }
      }
    }
  ];

  const mapped = mapServerUserCardsToCollectionCards(serverCards);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].playerPhotoUrl, "https://delta-cdn.example.com/photos/jan.png");
  assert.equal(mapped[0].artworkUrl, "https://delta-cdn.example.com/art/jan.png");

  const deltaModel = toDeltaCardModel(mapped[0]);
  assert.equal(deltaModel.playerImage, "https://delta-cdn.example.com/photos/jan.png");
  assert.equal(deltaModel.playerName, "ZAWODNIK ALFA");
  assert.equal(deltaModel.shirtNumber, "10");
  assert.equal(deltaModel.position, "POM");
});

test("DELTA-042C: No fake stats fabricated on cards", () => {
  const dummyCard: CollectionCard = {
    id: "uc-dummy",
    cardId: "def-dummy",
    name: "Karta Testowa",
    title: "Test",
    category: "base",
    rarity: "common",
    cardType: "BASE",
    frameTheme: null,
    artworkPose: null,
    cardNumber: 1,
    playerShirtNumber: 7,
    playerName: "Zawodnik Testowy",
    playerPosition: "NAP",
    playerPhotoUrl: null,
    artworkUrl: null,
    acquiredAt: "2026-09-01T10:00:00Z",
    quantity: 1,
    duplicatesCount: 0,
    isFavorite: false,
    season: "2026/27"
  };

  const model = toDeltaCardModel(dummyCard);
  // Ensure no unconfirmed fabricated stats exist on DeltaCardModel
  assert.equal((model as any).ovr, undefined, "Must not fabricate OVR");
  assert.equal((model as any).att, undefined, "Must not fabricate ATT");
  assert.equal((model as any).def, undefined, "Must not fabricate DEF");
  assert.equal((model as any).matches, undefined, "Must not fabricate matches");
  assert.equal((model as any).goals, undefined, "Must not fabricate goals");
});

test("DELTA-042C: HOME club announcements visually differentiate urgent vs normal with leading-relaxed", () => {
  const homeSrc = fs.readFileSync(HOME_DASHBOARD_PATH, "utf8");

  // Urgent styling
  assert.ok(homeSrc.includes("border-l-4 border-l-amber-500"), "Urgent announcement must have border-l-4 border-l-amber-500");
  assert.ok(homeSrc.includes("from-amber-950/40"), "Urgent announcement must have amber ambient gradient");

  // Normal styling
  assert.ok(homeSrc.includes("border-l-4 border-l-slate-700/80"), "Normal announcement must have border-l-4 border-l-slate-700/80");

  // Typography
  assert.ok(homeSrc.includes("leading-relaxed"), "Announcements must use leading-relaxed for comfortable reading");
});
