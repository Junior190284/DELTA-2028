"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  InfernoCardPresentationItem,
  createCardFrontCanvasTexture,
  disposeInfernoCardTextures,
} from "./infernoCardBridge";

export type CardCount = 3 | 4 | 5 | 6;

export interface InfernoPackCanvasProps {
  cards?: InfernoCardPresentationItem[];
  heroCardId?: string | null;
  cardCount?: CardCount;
  autoPlay?: boolean;
  reducedMotion?: boolean;
  modelUrl?: string;
  onTimeUpdate?: (time: number, maxTime: number) => void;
  onPhaseChange?: (phase: string) => void;
  onComplete?: () => void;
  onError?: (err: string) => void;
  className?: string;
  showDevHud?: boolean;
}

export interface InfernoPackCanvasHandle {
  play: () => void;
  pause: () => void;
  restart: () => void;
  skip: () => void;
  seek: (time: number) => void;
  setCardCount: (n: CardCount) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const ANIM_DURATION = 10.0;

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Generate fallback synthetic texture for Card 6 when in DEMO mode without real cards
function createDemoCard6Texture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1440);
  bgGrad.addColorStop(0, "#0e0814");
  bgGrad.addColorStop(0.4, "#200a12");
  bgGrad.addColorStop(0.7, "#140810");
  bgGrad.addColorStop(1, "#070408");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1440);

  ctx.strokeStyle = "#ff9922";
  ctx.lineWidth = 14;
  ctx.strokeRect(32, 32, 960, 1376);

  ctx.strokeStyle = "#e04411";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 928, 1344);

  ctx.fillStyle = "rgba(255, 60, 20, 0.25)";
  ctx.fillRect(60, 60, 904, 80);
  ctx.fillStyle = "#ffaa44";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DELTA INFERNO • PROTOTYP DEMO", 512, 114);

  ctx.fillStyle = "#ffaa11";
  ctx.font = "bold 130px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("95", 80, 280);

  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = "#ff5522";
  ctx.fillText("OVR", 84, 320);

  ctx.font = "bold 38px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("LEGENDARY", 84, 370);

  ctx.beginPath();
  ctx.arc(512, 700, 220, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(220, 40, 10, 0.15)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ff7711";
  ctx.stroke();

  ctx.fillStyle = "#ffbb33";
  ctx.font = "bold 96px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🐉", 512, 735);

  ctx.fillStyle = "#ff8811";
  ctx.font = "900 64px sans-serif";
  ctx.fillText("OBSIDIAN DRAGON", 512, 1050);

  ctx.fillStyle = "#ff4411";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("INFERNO GUARDIAN", 512, 1110);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

export const InfernoPackCanvas = forwardRef<
  InfernoPackCanvasHandle,
  InfernoPackCanvasProps
>(function InfernoPackCanvas(
  {
    cards: realCards,
    heroCardId,
    cardCount = 5,
    autoPlay = true,
    reducedMotion = false,
    modelUrl = "/assets/3d/INFERNO_PHOENIX_B2B_2_opt.glb",
    onTimeUpdate,
    onPhaseChange,
    onComplete,
    onError,
    className = "",
    showDevHud = false,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js internal state refs (independent of React renders)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const mainActionRef = useRef<THREE.AnimationAction | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Model object references
  const packModelRef = useRef<THREE.Group | null>(null);
  const bodyObjRef = useRef<THREE.Object3D | null>(null);
  const flapObjRef = useRef<THREE.Object3D | null>(null);
  const tsealObjRef = useRef<THREE.Object3D | null>(null);
  const bsealObjRef = useRef<THREE.Object3D | null>(null);

  // 6 Card mesh slots in scene
  const cardMeshesRef = useRef<THREE.Object3D[]>([]);

  // Dynamically generated textures to dispose when changing cards
  const dynamicTexturesRef = useRef<THREE.Texture[]>([]);

  // Real cards ref
  const realCardsRef = useRef<InfernoCardPresentationItem[] | null>(
    realCards || null
  );

  // Lights & Atmosphere
  const heroSpotLightRef = useRef<THREE.SpotLight | null>(null);
  const heroRimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const burstLightRef = useRef<THREE.PointLight | null>(null);

  // Sparks / Ember particle system
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const particleGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMatRef = useRef<THREE.PointsMaterial | null>(null);
  const particleTexRef = useRef<THREE.CanvasTexture | null>(null);
  const particleVelocitiesRef = useRef<
    { x: number; y: number; z: number; life: number; maxLife: number }[]
  >([]);

  // Continuous idle time for breathing and micro-levitation
  const idleTimeRef = useRef<number>(0.0);

  // Playback control refs
  const currentTimeRef = useRef<number>(0.0);
  const isPlayingRef = useRef<boolean>(autoPlay);
  const isReducedMotionRef = useRef<boolean>(reducedMotion);
  const autoCameraRef = useRef<boolean>(true);

  // Determine effective count
  const effectiveCount: CardCount = realCards
    ? (Math.min(6, Math.max(3, realCards.length)) as CardCount)
    : cardCount;
  const effectiveCardCountRef = useRef<CardCount>(effectiveCount);

  // React UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isWebGlSupported, setIsWebGlSupported] = useState<boolean>(true);
  const [isContextLost, setIsContextLost] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<string>("[1/7] Inicjalizacja");
  const [currentTimeState, setCurrentTimeState] = useState<number>(0);
  const [fpsState, setFpsState] = useState<number>(60);

  // Callback refs to prevent recreating the Three.js scene on parent re-renders
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onPhaseChangeRef.current = onPhaseChange;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  // Attach dynamic card textures to mesh slots
  const applyTexturesToMeshes = useCallback(() => {
    const meshes = cardMeshesRef.current;
    if (meshes.length === 0) return;

    // Dispose old dynamic textures
    disposeInfernoCardTextures(dynamicTexturesRef.current);
    dynamicTexturesRef.current = [];

    const cards = realCardsRef.current;
    if (!cards || cards.length === 0) {
      // In DEMO mode, meshes already have textures from GLB (plus demo texture on slot 6)
      return;
    }

    const N = effectiveCardCountRef.current;
    // Map presentation cards 0..N-1 to active meshes
    // Background cards: 0..N-2 -> meshes[0..N-2]
    // Hero card: cards[N-1] -> meshes[5] (or meshes[N-1])
    cards.forEach((item, idx) => {
      if (idx >= N) return;
      const isHero = idx === N - 1;
      // Hero card is always attached to mesh slot 4 (Mesh_Card_05_B2B1) or slot 5
      const targetMesh = isHero ? meshes[4] : meshes[idx];
      if (!targetMesh) return;

      const texture = createCardFrontCanvasTexture(item);
      dynamicTexturesRef.current.push(texture);

      targetMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          mats.forEach((mat) => {
            if (mat && mat.name && mat.name.includes("Front")) {
              const stdMat = mat as THREE.MeshStandardMaterial;
              stdMat.map = texture;
              // Extinguish old GLB Phoenix Prime emissive bleed-through
              stdMat.emissiveMap = null;
              stdMat.emissive.setHex(0x000000);
              stdMat.roughness = 0.35;
              stdMat.metalness = 0.15;
              stdMat.needsUpdate = true;
            }
          });
        }
      });
    });
  }, []);

  // Synchronize realCards changes
  useEffect(() => {
    realCardsRef.current = realCards || null;
    const nextCount: CardCount = realCards
      ? (Math.min(6, Math.max(3, realCards.length)) as CardCount)
      : cardCount;
    effectiveCardCountRef.current = nextCount;
    applyTexturesToMeshes();
    updateTimelineRef.current(currentTimeRef.current);
  }, [realCards, cardCount, applyTexturesToMeshes]);

  useEffect(() => {
    isReducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // Compute fan placement target dynamically for card i out of N cards
  const computeFanTarget = useCallback(
    (i: number, N: number, aspect: number) => {
      const u = N > 1 ? (2 * i) / (N - 1) - 1 : 0;
      // Base span: 3 cards: 0.60, 4 cards: 0.66, 5 cards: 0.72, 6 cards: 0.78
      const baseSpan = N === 3 ? 0.60 : N === 4 ? 0.66 : N === 5 ? 0.72 : 0.78;
      const x = u * baseSpan;
      // Parabolic arch in Y and depth curve in Z
      const y = 0.90 - 0.12 * (u * u);
      const z = 0.24 - 0.08 * (u * u);
      const rotZ = -u * 0.314; // outer roll ~ 18 deg
      const rotY = u * 0.209; // outer yaw ~ 12 deg
      return { x, y, z, rotZ, rotY };
    },
    []
  );

  // Core Timeline Update with Mathematically Proven Camera Framing
  const updateTimeline = useCallback(
    (time: number) => {
      const t = Math.max(0, Math.min(time, ANIM_DURATION));
      currentTimeRef.current = t;

      if (onTimeUpdateRef.current) {
        onTimeUpdateRef.current(t, ANIM_DURATION);
      }

      const N = effectiveCardCountRef.current;
      const redMotion = isReducedMotionRef.current;
      const mixer = mixerRef.current;
      const mainAction = mainActionRef.current;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const bodyObj = bodyObjRef.current;
      const flapObj = flapObjRef.current;
      const tsealObj = tsealObjRef.current;
      const bsealObj = bsealObjRef.current;
      const allCards = cardMeshesRef.current;
      const heroSpot = heroSpotLightRef.current;
      const heroRim = heroRimLightRef.current;
      const ambLight = ambientLightRef.current;
      const burstLight = burstLightRef.current;
      const pMat = particleMatRef.current;
      const scene = sceneRef.current;

      // GLB Pack Tear Animation (0.0s - 4.0s)
      if (mixer && mainAction) {
        mainAction.time = Math.min(t, 4.0);
        mixer.update(0);
      }

      // Determine active cards:
      // Index 0..N-2: background cards
      // Index N-1: ALWAYS Hero Card (cards[4] = Phoenix Prime or Real Hero)
      const c1 = allCards[0];
      const c2 = allCards[1];
      const c3 = allCards[2];
      const c4 = allCards[3];
      const c5 = allCards[4]; // Hero Mesh Slot
      const c6 = allCards[5]; // 6th Slot

      let activeCards: THREE.Object3D[] = [];
      if (N === 3) {
        activeCards = [c1, c2, c5].filter(Boolean);
      } else if (N === 4) {
        activeCards = [c1, c2, c3, c5].filter(Boolean);
      } else if (N === 5) {
        activeCards = [c1, c2, c3, c4, c5].filter(Boolean);
      } else {
        activeCards = [c1, c2, c3, c4, c6, c5].filter(Boolean);
      }

      // Hide non-active card slots
      allCards.forEach((c) => {
        if (c && !activeCards.includes(c)) {
          c.visible = false;
        }
      });

      // Calculate camera distance mathematically:
      // Aspect ratio of the viewport
      const aspect = camera ? camera.aspect : 1.777;

      // Mathematical distance required for min 10% (safe > 8%) margins:
      // 1. In Hero Showcase (Card width = 0.806, Target Z = 0.40):
      // D_hero = max(2.25, 1.68 / aspect), Z_hero = 0.40 + D_hero
      const distHero = Math.max(2.25, 1.68 / aspect);
      const camZHero = 0.40 + distHero;

      // 2. In Fan View (Fan span = 1.44 - 1.56, Target Z = 0.0):
      // D_fan = max(2.30, 2.42 / aspect), Z_fan = D_fan
      const camZFan = Math.max(2.30, 2.42 / aspect);

      // 3. In Pack rest view (0.0 - 2.0s):
      const camZPack = Math.max(2.40, 2.50 / aspect);

      let phaseName = "";
      const currentRealCards = realCardsRef.current;
      const heroCardItem = currentRealCards
        ? currentRealCards[currentRealCards.length - 1]
        : null;
      const heroDisplayName = heroCardItem
        ? `${heroCardItem.surname} (${heroCardItem.ovr} OVR)`
        : "PHOENIX PRIME (99 OVR)";

      // Ensure pack visibility at rest
      if (t < 7.8) {
        if (bodyObj) bodyObj.visible = true;
        if (flapObj) flapObj.visible = true;
        if (tsealObj) tsealObj.visible = true;
        if (bsealObj) bsealObj.visible = true;
      }

      if (t < 2.0) {
        // [1/7] Emergence & Build-up
        phaseName = `[1/7] Pojawienie i Pulsacja Żaru (${N} kart)`;
        if (burstLight) burstLight.intensity = 0.0;
        if (heroSpot) heroSpot.intensity = 0.0;

        if (bodyObj) bodyObj.position.set(0, 0, 0);
        if (flapObj) flapObj.position.set(0, 0, 0.82);

        activeCards.forEach((c, i) => {
          if (!c) return;
          c.visible = false;
          c.position.set(0, 0, (i - (N - 1) / 2) * 0.004);
          c.rotation.set(0, Math.PI, 0);
          c.scale.setScalar(1.0);
        });

        if (autoCameraRef.current && camera && controls) {
          camera.position.set(1.8 * (aspect < 1.0 ? 0.9 : 1.0), 0.7, camZPack);
          controls.target.set(0, 0.25, 0);
          camera.fov = 42.0;
          camera.updateProjectionMatrix();
        }
      } else if (t < 3.2) {
        // [2/7] Organic Foil Tear
        phaseName = "[2/7] Organiczne Rozdarcie Folii";
        const p = (t - 2.0) / 1.2;
        if (burstLight) burstLight.intensity = Math.sin(p * Math.PI) * 5.0;
        if (heroSpot) heroSpot.intensity = 0.0;

        if (bodyObj) bodyObj.position.set(0, 0, 0);

        activeCards.forEach((c) => {
          if (c) c.visible = false;
        });

        if (autoCameraRef.current && camera && controls) {
          const camT = smoothstep(2.0, 3.2, t);
          camera.position.set(
            lerp(1.8 * (aspect < 1.0 ? 0.9 : 1.0), 1.5, camT),
            lerp(0.7, 0.75, camT),
            lerp(camZPack, Math.max(2.0, camZPack * 0.85), camT)
          );
          controls.target.set(0, lerp(0.25, 0.5, camT), 0);
        }
      } else if (t < 4.4) {
        // [3/7] Stack Slide-Up through open mouth
        phaseName = "[3/7] Wysunięcie Pakietu Kart";
        const slideP = smoothstep(3.2, 4.4, t);
        if (burstLight) burstLight.intensity = 1.0 * (1.0 - (t - 3.2) / 1.2);
        if (heroSpot) heroSpot.intensity = 0.0;

        if (bodyObj) bodyObj.position.set(0, 0, 0);

        activeCards.forEach((c, i) => {
          if (!c) return;
          c.visible = true;
          const zOffset = (i - (N - 1) / 2) * 0.004;
          c.position.set(0, lerp(0.1, 0.65, slideP), zOffset);
          c.rotation.set(0, Math.PI, 0);
          c.scale.setScalar(1.0);
        });

        if (autoCameraRef.current && camera && controls) {
          const camT = smoothstep(3.2, 4.4, t);
          camera.position.set(
            lerp(1.5, 0.5, camT),
            lerp(0.75, 0.78, camT),
            lerp(Math.max(2.0, camZPack * 0.85), camZFan, camT)
          );
          controls.target.set(0, lerp(0.5, 0.65, camT), 0);
        }
      } else if (t < 5.8) {
        // [4/7] 3D Card Fan-out Arc
        phaseName = `[4/7] Rozłożenie Wachlarza (${N} kart 3D)`;
        const fanP = smoothstep(4.4, 5.8, t);
        if (heroSpot) heroSpot.intensity = 0.0;

        const packDropY = lerp(0.0, -1.0, fanP);
        const packDropZ = lerp(0.0, -0.8, fanP);
        if (bodyObj) bodyObj.position.set(0, packDropY, packDropZ);
        if (flapObj) flapObj.position.set(0, 0.82 + packDropY, packDropZ);

        activeCards.forEach((card, i) => {
          if (!card) return;
          card.visible = true;
          const target = computeFanTarget(i, N, aspect);
          const zStack = (i - (N - 1) / 2) * 0.004;

          card.position.x = lerp(0.0, target.x, fanP);
          card.position.y = lerp(0.65, target.y, fanP);
          card.position.z = lerp(zStack, target.z, fanP);

          card.rotation.x = 0;
          card.rotation.y = Math.PI + lerp(0.0, target.rotY, fanP);
          card.rotation.z = lerp(0.0, target.rotZ, fanP);
          card.scale.setScalar(lerp(1.0, 1.15, fanP));
        });

        if (autoCameraRef.current && camera && controls) {
          const camT = smoothstep(4.4, 5.8, t);
          camera.position.set(
            lerp(0.5, 0.0, camT),
            lerp(0.78, 0.7, camT),
            camZFan
          );
          controls.target.set(0, 0.65, 0);
          camera.fov = 42.0;
          camera.updateProjectionMatrix();
        }
      } else if (t < 7.8) {
        // [5/7] Sequential Reveal of Background Cards
        phaseName = `[5/7] Odkrywanie Kart 1–${N - 1}`;
        if (bodyObj) bodyObj.position.set(0, -1.2, -1.2);
        if (flapObj) flapObj.position.set(0, 0.82 - 1.2, -1.2);

        const bgCount = N - 1;
        const subDuration = 2.0 / bgCount;

        activeCards.forEach((card, i) => {
          if (!card) return;
          card.visible = true;
          const target = computeFanTarget(i, N, aspect);

          if (i < bgCount) {
            const cardStart = 5.8 + i * subDuration;
            const flipP = smoothstep(cardStart, cardStart + Math.min(0.4, subDuration * 0.9), t);
            const stepZ = Math.sin(flipP * Math.PI) * 0.25;

            card.position.x = target.x;
            card.position.y = target.y;
            card.position.z = target.z + stepZ;
            card.rotation.z = target.rotZ;
            card.rotation.y = Math.PI + target.rotY + flipP * Math.PI;
            card.scale.setScalar(1.15);
          } else {
            card.position.set(target.x, target.y, target.z);
            card.rotation.set(0, Math.PI + target.rotY, target.rotZ);
            card.scale.setScalar(1.15);
          }
        });

        if (autoCameraRef.current && camera && controls) {
          camera.position.set(0.0, 0.7, camZFan);
          controls.target.set(0, 0.65, 0);
          camera.fov = 42.0;
          camera.updateProjectionMatrix();
        }
      } else if (t < 9.5) {
        // [6/7] Climax: HERO Swoop & 360 Spin Reveal
        phaseName = `[6/7] Climax: ${heroDisplayName} 360° Reveal!`;
        const heroP = smoothstep(7.8, 9.5, t);
        if (heroSpot) heroSpot.intensity = heroP * 7.5;
        if (heroRim) heroRim.intensity = smoothstep(8.5, 9.5, t) * 4.2;
        if (ambLight) ambLight.intensity = lerp(0.9, 0.45, heroP);
        if (pMat) pMat.opacity = redMotion ? 0.0 : smoothstep(8.8, 9.5, t) * 0.85;

        // Burst flash flare at awers reveal (9.2 - 9.8s, peak at 9.5s)
        if (t >= 9.2 && t <= 9.8) {
          const burstFactor = Math.sin(((t - 9.2) / 0.6) * Math.PI);
          if (burstLight) {
            burstLight.position.set(0, 0.52, 0.65);
            burstLight.color.setHex(0xffbb33);
            burstLight.intensity = burstFactor * 14.0;
          }
        } else if (burstLight) {
          burstLight.intensity = 0.0;
        }

        if (scene) {
          scene.background = new THREE.Color(0x0c0b0e).lerp(
            new THREE.Color(0x040306),
            heroP
          );
        }

        if (bodyObj) {
          bodyObj.visible = false;
          bodyObj.position.set(0, -5.0, -10.0);
        }
        if (flapObj) {
          flapObj.visible = false;
          flapObj.position.set(0, -5.0, -10.0);
        }
        if (tsealObj) tsealObj.visible = false;
        if (bsealObj) bsealObj.visible = false;

        const bgCount = N - 1;
        const bgSpreadFactor = Math.min(1.0, Math.max(0.65, aspect / 1.3));

        activeCards.forEach((card, i) => {
          if (!card) return;
          card.visible = true;
          const target = computeFanTarget(i, N, aspect);
          if (i < bgCount) {
            // Background cards part safely without hitting mobile viewport edges
            card.position.x = target.x * (0.85 + 0.45 * bgSpreadFactor);
            card.position.y = target.y - heroP * 0.35;
            card.position.z = target.z - heroP * 1.2;
            card.rotation.y = target.rotY + Math.PI * 2.0;
            card.rotation.z = target.rotZ;
            card.scale.setScalar(lerp(1.15, 0.65, heroP));
          } else {
            // Hero Card swoops to center stage
            card.position.x = lerp(target.x, 0.0, heroP);
            card.position.y = lerp(target.y, 0.52, heroP);
            card.position.z = lerp(target.z, 0.4, heroP);

            const spinY = redMotion
              ? lerp(Math.PI + target.rotY, Math.PI * 2.0, heroP)
              : lerp(Math.PI + target.rotY, Math.PI * 4.0, heroP);
            card.rotation.y = spinY;
            card.rotation.z = lerp(target.rotZ, 0.0, heroP);
            card.scale.setScalar(lerp(1.15, 1.3, heroP));
          }
        });

        if (autoCameraRef.current && camera && controls) {
          const camT = heroP;
          camera.position.set(
            0.0,
            lerp(0.7, 0.52, camT),
            lerp(camZFan, camZHero, camT)
          );
          controls.target.set(0, 0.52, lerp(0.0, 0.4, camT));
          camera.fov = lerp(42.0, 36.0, camT);
          camera.updateProjectionMatrix();
        }
      } else {
        // [7/7] Settled Hero Showcase
        phaseName = `[7/7] Hero Showcase: ${heroDisplayName}`;
        if (heroSpot) heroSpot.intensity = 7.5;
        if (heroRim) heroRim.intensity = 4.2;
        if (ambLight) ambLight.intensity = 0.45;
        if (pMat) pMat.opacity = redMotion ? 0.0 : 0.85;
        if (scene) scene.background = new THREE.Color(0x040306);

        if (t >= 9.2 && t <= 9.8) {
          const burstFactor = Math.sin(((t - 9.2) / 0.6) * Math.PI);
          if (burstLight) {
            burstLight.position.set(0, 0.52, 0.65);
            burstLight.color.setHex(0xffbb33);
            burstLight.intensity = burstFactor * 14.0;
          }
        } else if (burstLight) {
          burstLight.intensity = 0.0;
        }

        if (bodyObj) {
          bodyObj.visible = false;
          bodyObj.position.set(0, -5.0, -10.0);
        }
        if (flapObj) {
          flapObj.visible = false;
          flapObj.position.set(0, -5.0, -10.0);
        }
        if (tsealObj) tsealObj.visible = false;
        if (bsealObj) bsealObj.visible = false;

        const bgCount = N - 1;
        const bgSpreadFactor = Math.min(1.0, Math.max(0.65, aspect / 1.3));

        activeCards.forEach((card, i) => {
          if (!card) return;
          card.visible = true;
          const target = computeFanTarget(i, N, aspect);
          if (i < bgCount) {
            card.position.set(
              target.x * (0.85 + 0.45 * bgSpreadFactor),
              target.y - 0.35,
              target.z - 1.2
            );
            card.rotation.set(0, target.rotY + Math.PI * 2.0, target.rotZ);
            card.scale.setScalar(0.65);
          } else {
            // Hero card continuous breathing levitation with subtle organic micro-tilt
            const idleT = idleTimeRef.current;
            const breath = Math.sin(idleT * 2.2) * 0.015;
            const microYaw = Math.sin(idleT * 1.4) * 0.018;
            const microPitch = Math.cos(idleT * 1.1) * 0.012;
            card.position.set(0.0, 0.52 + breath, 0.4);
            card.rotation.set(microPitch, microYaw, 0.0);
            card.scale.setScalar(1.3);
          }
        });

        if (autoCameraRef.current && camera && controls) {
          camera.position.set(0.0, 0.52, camZHero);
          controls.target.set(0, 0.52, 0.4);
          camera.fov = 36.0;
          camera.updateProjectionMatrix();
        }
      }

      setCurrentPhase(phaseName);
      setCurrentTimeState(t);
      if (onPhaseChangeRef.current) {
        onPhaseChangeRef.current(phaseName);
      }
    },
    [computeFanTarget]
  );

  const updateTimelineRef = useRef(updateTimeline);
  useEffect(() => {
    updateTimelineRef.current = updateTimeline;
  });

  // Imperative handle for parent / test control
  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        isPlayingRef.current = true;
      },
      pause: () => {
        isPlayingRef.current = false;
      },
      restart: () => {
        isPlayingRef.current = true;
        autoCameraRef.current = true;
        idleTimeRef.current = 0.0;
        updateTimelineRef.current(0);
      },
      skip: () => {
        isPlayingRef.current = false;
        autoCameraRef.current = true;
        idleTimeRef.current = 0.0;
        updateTimelineRef.current(9.6);
        if (onCompleteRef.current) onCompleteRef.current();
      },
      seek: (t: number) => {
        if (t < 9.5) idleTimeRef.current = 0.0;
        updateTimelineRef.current(t);
      },
      setCardCount: (n: CardCount) => {
        effectiveCardCountRef.current = n;
        updateTimelineRef.current(currentTimeRef.current);
      },
      getCurrentTime: () => currentTimeRef.current,
      getDuration: () => ANIM_DURATION,
    }),
    []
  );

  // Initialize Scene, Renderer, Lights, and Load Model
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL availability
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl) {
      setIsWebGlSupported(false);
      setIsLoading(false);
      onErrorRef.current?.("Brak sprzętowego wsparcia WebGL");
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0b0e);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(1.8, 0.7, 2.4);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.25, 0);
    controlsRef.current = controls;

    // Test instrumentation for empirical bounding box & margin measurements
    if (typeof window !== "undefined") {
      (window as any).__INFERNO_GET_HERO_BOUNDS__ = () => {
        const cam = cameraRef.current;
        const rend = rendererRef.current;
        if (!cam || !rend) return null;
        const w = rend.domElement.clientWidth;
        const h = rend.domElement.clientHeight;
        const corners = [
          new THREE.Vector3(-0.40365, -0.052, 0.40),
          new THREE.Vector3(0.40365, -0.052, 0.40),
          new THREE.Vector3(-0.40365, 1.092, 0.40),
          new THREE.Vector3(0.40365, 1.092, 0.40),
        ];
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        corners.forEach((c) => {
          const p = c.clone().project(cam);
          const px = ((p.x + 1) / 2) * w;
          const py = ((1 - p.y) / 2) * h;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
        const leftMarginPct = (minX / w) * 100;
        const rightMarginPct = ((w - maxX) / w) * 100;
        const topMarginPct = (minY / h) * 100;
        const bottomMarginPct = ((h - maxY) / h) * 100;
        return {
          width: w,
          height: h,
          box: { minX, maxX, minY, maxY, cardWidth: maxX - minX, cardHeight: maxY - minY },
          marginsPct: {
            left: leftMarginPct,
            right: rightMarginPct,
            top: topMarginPct,
            bottom: bottomMarginPct,
            minMargin: Math.min(leftMarginPct, rightMarginPct, topMarginPct, bottomMarginPct),
          },
        };
      };
    }

    // 5. Lighting
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    keyLight.position.set(-2.0, 1.5, 3.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.8);
    fillLight.position.set(2.0, 1.0, 2.5);
    scene.add(fillLight);

    const rimRedLight = new THREE.DirectionalLight(0xff2205, 3.2);
    rimRedLight.position.set(-3.2, -0.4, 0.8);
    scene.add(rimRedLight);

    const contourGoldLight = new THREE.DirectionalLight(0xffaa11, 2.8);
    contourGoldLight.position.set(3.0, 0.8, 1.2);
    scene.add(contourGoldLight);

    const topLight = new THREE.DirectionalLight(0xffd4aa, 1.2);
    topLight.position.set(0, 3.5, 1.5);
    scene.add(topLight);

    const backLight = new THREE.DirectionalLight(0xfff0e4, 1.4);
    backLight.position.set(0.8, 1.2, -3.2);
    scene.add(backLight);

    const ambientLight = new THREE.AmbientLight(0x221820, 0.9);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const burstLight = new THREE.PointLight(0xff5511, 0.0, 5.0, 2.0);
    burstLight.position.set(0, 0.8, 0.2);
    scene.add(burstLight);
    burstLightRef.current = burstLight;

    const heroSpotLight = new THREE.SpotLight(
      0xffd588,
      0.0,
      8.0,
      Math.PI / 4,
      0.45,
      1.0
    );
    heroSpotLight.position.set(0, 1.8, 2.8);
    heroSpotLight.target.position.set(0, 0.52, 0.4);
    scene.add(heroSpotLight);
    scene.add(heroSpotLight.target);
    heroSpotLightRef.current = heroSpotLight;

    // Dedicated Inferno Rim Light for Hero Card
    const heroRimLight = new THREE.DirectionalLight(0xff4411, 0.0);
    heroRimLight.position.set(-2.2, 1.2, -0.4);
    scene.add(heroRimLight);
    heroRimLightRef.current = heroRimLight;

    // Lightweight Sparks / Embers Particle System (55 particles)
    const PARTICLE_COUNT = 55;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleVelocities: {
      x: number;
      y: number;
      z: number;
      life: number;
      maxLife: number;
    }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 1.4;
      particlePositions[i * 3 + 1] = 0.05 + Math.random() * 1.1;
      particlePositions[i * 3 + 2] = 0.35 + (Math.random() - 0.5) * 0.4;
      particleVelocities.push({
        x: (Math.random() - 0.5) * 0.08,
        y: 0.18 + Math.random() * 0.26,
        z: (Math.random() - 0.5) * 0.08,
        life: Math.random() * 3.0,
        maxLife: 2.0 + Math.random() * 2.0,
      });
    }
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const pCanvas = document.createElement("canvas");
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext("2d");
    if (pCtx) {
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255, 240, 200, 1.0)");
      grad.addColorStop(0.35, "rgba(255, 140, 20, 0.85)");
      grad.addColorStop(0.75, "rgba(255, 40, 0, 0.35)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);
    }
    const pTex = new THREE.CanvasTexture(pCanvas);
    particleTexRef.current = pTex;

    const particleMat = new THREE.PointsMaterial({
      size: 0.065,
      map: pTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.0,
      color: new THREE.Color(0xffaa33),
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);
    particleSystemRef.current = particleSystem;
    particleGeoRef.current = particleGeo;
    particleMatRef.current = particleMat;
    particleVelocitiesRef.current = particleVelocities;

    // 6. WebGL Context Lost Listeners
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setIsContextLost(true);
      onErrorRef.current?.("Utrata kontekstu WebGL (GPU reset)");
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    const handleContextRestored = () => {
      setIsContextLost(false);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener(
      "webglcontextrestored",
      handleContextRestored,
      false
    );

    // 7. GLTF Loader
    const loader = new GLTFLoader();
    setIsLoading(true);
    setLoadError(null);

    loader.load(
      modelUrl,
      (gltf) => {
        const packModel = gltf.scene;
        packModelRef.current = packModel;
        scene.add(packModel);

        bodyObjRef.current = packModel.getObjectByName("Pack_Body_Lower_B2B1") || null;
        flapObjRef.current = packModel.getObjectByName("Pack_Top_Flap_B2B1") || null;
        tsealObjRef.current = packModel.getObjectByName("Pack_Top_Seal_B2B1") || null;
        bsealObjRef.current = packModel.getObjectByName("Pack_Bottom_Seal_B2B1") || null;

        // Collect GLB cards 1 to 5
        const cards: THREE.Object3D[] = [];
        for (let i = 1; i <= 5; i++) {
          const c = packModel.getObjectByName(`Card_0${i}_B2B1`);
          if (c) cards.push(c);
        }

        // Clone Card 4 to create Card 6 (Synthetic Demo Slot)
        if (cards[3]) {
          const card6 = cards[3].clone(true);
          card6.name = "Card_06_B2B1";
          const demo6Tex = createDemoCard6Texture();
          dynamicTexturesRef.current.push(demo6Tex);
          card6.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map((m) => {
                  const clonedMat = m.clone();
                  if (m.name.includes("Front")) {
                    (clonedMat as THREE.MeshStandardMaterial).map = demo6Tex;
                    clonedMat.needsUpdate = true;
                  }
                  return clonedMat;
                });
              } else if (mesh.material) {
                const clonedMat = mesh.material.clone();
                if (mesh.material.name.includes("Front")) {
                  (clonedMat as THREE.MeshStandardMaterial).map = demo6Tex;
                  clonedMat.needsUpdate = true;
                }
                mesh.material = clonedMat;
              }
            }
          });
          packModel.add(card6);
          cards.push(card6);
        }

        cardMeshesRef.current = cards;

        // Apply real card textures if provided
        applyTexturesToMeshes();

        // Setup AnimationMixer
        const mixer = new THREE.AnimationMixer(packModel);
        mixerRef.current = mixer;

        if (gltf.animations && gltf.animations.length > 0) {
          const clip = gltf.animations[0];
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 0);
          action.clampWhenFinished = true;
          action.play();
          action.paused = true;
          action.time = 0;
          mainActionRef.current = action;
          mixer.update(0);
        }

        setIsLoading(false);

        // Initial timeline update
        updateTimeline(0);

        // Check prefers-reduced-motion
        if (
          isReducedMotionRef.current ||
          (typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        ) {
          isReducedMotionRef.current = true;
          updateTimeline(9.6);
        }
      },
      undefined,
      (err) => {
        console.error("[InfernoPackCanvas] Failed to load GLB model:", err);
        setLoadError(
          "Nie udało się załadować modelu 3D paczki. Sprawdź plik GLB lub połączenie."
        );
        setIsLoading(false);
        onErrorRef.current?.("Błąd ładowania modelu GLB");
      }
    );

    // 8. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      updateTimeline(currentTimeRef.current);
    };
    window.addEventListener("resize", handleResize);

    // 9. Single Controlled Animation Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    const animate = (now: number) => {
      rafIdRef.current = requestAnimationFrame(animate);

      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Track FPS
      frameCount++;
      fpsTimer += deltaSec;
      if (fpsTimer >= 0.5) {
        setFpsState(Math.round(frameCount / fpsTimer));
        frameCount = 0;
        fpsTimer = 0;
      }

      if (isPlayingRef.current && currentTimeRef.current < ANIM_DURATION) {
        const nextTime = currentTimeRef.current + deltaSec;
        if (nextTime >= ANIM_DURATION) {
          currentTimeRef.current = ANIM_DURATION;
          updateTimelineRef.current(ANIM_DURATION);
          isPlayingRef.current = false;
          if (onCompleteRef.current) onCompleteRef.current();
        } else {
          updateTimelineRef.current(nextTime);
        }
      } else if (currentTimeRef.current >= 9.5) {
        // Continuous idle breathing and micro-levitation when settled
        idleTimeRef.current += deltaSec;
        updateTimelineRef.current(currentTimeRef.current);
      }

      // Update ember particles if active and not reduced motion
      const pGeo = particleGeoRef.current;
      const pVels = particleVelocitiesRef.current;
      const isRed = isReducedMotionRef.current;
      if (pGeo && pVels && !isRed && currentTimeRef.current >= 8.5) {
        const posAttr = pGeo.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < pVels.length; i++) {
          const v = pVels[i];
          arr[i * 3] += v.x * deltaSec;
          arr[i * 3 + 1] += v.y * deltaSec;
          arr[i * 3 + 2] += v.z * deltaSec;
          v.life += deltaSec;
          if (arr[i * 3 + 1] > 1.35 || v.life > v.maxLife) {
            arr[i * 3] = (Math.random() - 0.5) * 1.2;
            arr[i * 3 + 1] = 0.05 + Math.random() * 0.15;
            arr[i * 3 + 2] = 0.35 + (Math.random() - 0.5) * 0.3;
            v.life = 0;
          }
        }
        posAttr.needsUpdate = true;
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (mixerRef.current && packModelRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(packModelRef.current);
        mixerRef.current = null;
      }

      if (packModelRef.current && sceneRef.current) {
        sceneRef.current.remove(packModelRef.current);
        packModelRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            const mats = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            mats.forEach((m) => {
              if (!m) return;
              [
                "map",
                "normalMap",
                "roughnessMap",
                "metalnessMap",
                "emissiveMap",
                "aoMap",
                "alphaMap",
              ].forEach((k) => {
                if ((m as any)[k]) (m as any)[k].dispose();
              });
              m.dispose();
            });
          }
        });
        packModelRef.current = null;
      }

      disposeInfernoCardTextures(dynamicTexturesRef.current);
      dynamicTexturesRef.current = [];
      cardMeshesRef.current = [];

      // Dispose sparks / ember particle system
      if (particleSystemRef.current && sceneRef.current) {
        sceneRef.current.remove(particleSystemRef.current);
        particleSystemRef.current = null;
      }
      if (particleGeoRef.current) {
        particleGeoRef.current.dispose();
        particleGeoRef.current = null;
      }
      if (particleMatRef.current) {
        particleMatRef.current.dispose();
        particleMatRef.current = null;
      }
      if (particleTexRef.current) {
        particleTexRef.current.dispose();
        particleTexRef.current = null;
      }

      if (rendererRef.current) {
        rendererRef.current.renderLists.dispose();
        rendererRef.current.dispose();
        rendererRef.current = null;
      }

      sceneRef.current = null;
      cameraRef.current = null;

      if (typeof window !== "undefined") {
        delete (window as any).__INFERNO_GET_HERO_BOUNDS__;
      }
    };
  }, [modelUrl, applyTexturesToMeshes]);

  // Fallback for missing WebGL
  if (!isWebGlSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-zinc-950 border border-red-500/30 rounded-xl text-center text-white ${className}`}
        style={{ minHeight: "360px" }}
      >
        <div className="text-3xl mb-3">⚠️</div>
        <h3 className="text-lg font-bold text-red-400 mb-1">
          Brak sprzętowego wsparcia WebGL
        </h3>
        <p className="text-sm text-zinc-400 max-w-md">
          Twoja przeglądarka lub środowisko nie obsługuje akceleracji WebGL.
          Aplikacja uruchamia automatyczny fallback CSS 3D.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[360px] overflow-hidden bg-[#0c0b0e] select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0c0b0e]/90 backdrop-blur-md transition-opacity duration-300">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
          <div className="text-sm font-semibold tracking-wider text-amber-300">
            ŁADOWANIE PACZKI INFERNO PHOENIX 3D...
          </div>
          <div className="text-xs text-zinc-500 mt-1 font-mono">
            Model GLB (~4.46 MB)
          </div>
        </div>
      )}

      {/* Load Error Banner */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center">
          <div className="text-red-400 text-4xl mb-2">⚠️</div>
          <div className="text-red-300 font-bold mb-1">{loadError}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition"
          >
            Odśwież stronę
          </button>
        </div>
      )}

      {/* Context Lost Banner */}
      {isContextLost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white">
          <div className="text-amber-400 text-3xl mb-2">⚡</div>
          <div className="text-sm font-semibold">
            Utracono kontekst WebGL (GPU reset).
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Przeładowywanie zasobów...
          </div>
        </div>
      )}

      {/* Optional Integrated Dev HUD */}
      {showDevHud && (
        <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur border border-amber-500/30 rounded-lg p-3 text-xs font-mono text-zinc-200 pointer-events-none space-y-1">
          <div className="text-amber-400 font-bold tracking-wide">
            INFERNO 3D ENGINE • {currentPhase}
          </div>
          <div className="flex gap-4 text-zinc-400">
            <span>
              Czas:{" "}
              <strong className="text-white">
                {currentTimeState.toFixed(2)}s / {ANIM_DURATION.toFixed(1)}s
              </strong>
            </span>
            <span>
              FPS: <strong className="text-green-400">{fpsState}</strong>
            </span>
            <span>
              Karty:{" "}
              <strong className="text-amber-300">
                {effectiveCardCountRef.current}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default InfernoPackCanvas;
