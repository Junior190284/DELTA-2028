import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { lockBodyScroll, isBodyScrollLocked } from "../lib/ui/body-scroll-lock.ts";

// Mock minimal DOM environment if running in pure Node.js
function setupMockDom(initialScrollY = 320) {
  let scrollY = initialScrollY;
  const mockBody = {
    style: {
      overflow: "",
      position: "",
      top: "",
      left: "",
      right: "",
      width: ""
    },
    dataset: {} as Record<string, string | undefined>
  };
  const mockHtml = {
    style: {
      overflow: ""
    }
  };

  (global as any).document = {
    body: mockBody,
    documentElement: mockHtml
  };
  (global as any).window = {
    scrollY,
    pageYOffset: scrollY,
    scrollTo: (options: { top?: number; left?: number }) => {
      if (typeof options.top === "number") {
        scrollY = options.top;
        (global as any).window.scrollY = options.top;
        (global as any).window.pageYOffset = options.top;
      }
    }
  };

  return { mockBody, mockHtml, getScrollY: () => scrollY };
}

test("1. Basic single modal lock & unlock restores scroll and styles", () => {
  const { mockBody, mockHtml, getScrollY } = setupMockDom(500);

  assert.equal(isBodyScrollLocked(), false);
  const unlock = lockBodyScroll();

  assert.equal(isBodyScrollLocked(), true);
  assert.equal(mockBody.dataset.scrollLockCount, "1");
  assert.equal(mockBody.style.position, "fixed");
  assert.equal(mockBody.style.overflow, "hidden");
  assert.equal(mockHtml.style.overflow, "hidden");
  assert.equal(mockBody.style.top, "-500px");

  unlock();

  assert.equal(isBodyScrollLocked(), false);
  assert.equal(mockBody.dataset.scrollLockCount, undefined);
  assert.equal(mockBody.style.position, "");
  assert.equal(mockBody.style.overflow, "");
  assert.equal(mockHtml.style.overflow, "");
  assert.equal(getScrollY(), 500);
});

test("2. Nested modals: Squad Builder -> Player Profile preserves original scrollY", () => {
  const { mockBody, mockHtml, getScrollY } = setupMockDom(750);

  // Modal 1: Squad Builder opens at scrollY = 750
  const unlockSquad = lockBodyScroll();
  assert.equal(mockBody.dataset.scrollLockCount, "1");
  assert.equal(mockBody.dataset.prevScrollY, "750");
  assert.equal(mockBody.style.top, "-750px");

  // While body is fixed, window.scrollY becomes 0 in browser
  (global as any).window.scrollY = 0;
  (global as any).window.pageYOffset = 0;

  // Modal 2: Player Profile opens from within squad builder
  const unlockPlayer = lockBodyScroll();
  assert.equal(mockBody.dataset.scrollLockCount, "2");
  // Crucial: original scrollY must still be 750, NOT 0!
  assert.equal(mockBody.dataset.prevScrollY, "750");
  assert.equal(mockBody.style.position, "fixed");

  // Modal 2: Player Profile closes first
  unlockPlayer();
  assert.equal(mockBody.dataset.scrollLockCount, "1");
  assert.equal(mockBody.style.position, "fixed"); // Still locked for Squad Builder
  assert.equal(isBodyScrollLocked(), true);

  // Modal 1: Squad Builder closes
  unlockSquad();
  assert.equal(mockBody.dataset.scrollLockCount, undefined);
  assert.equal(mockBody.style.position, "");
  assert.equal(mockBody.style.overflow, "");
  assert.equal(isBodyScrollLocked(), false);
  assert.equal(getScrollY(), 750, "Restores exact initial scroll position of 750px");
});

test("3. Out-of-order unlocks: Modal 1 unmounts before Modal 2", () => {
  const { mockBody, getScrollY } = setupMockDom(240);

  const unlock1 = lockBodyScroll();
  const unlock2 = lockBodyScroll();
  assert.equal(mockBody.dataset.scrollLockCount, "2");

  // Unlock 1 first
  unlock1();
  assert.equal(mockBody.dataset.scrollLockCount, "1");
  assert.equal(mockBody.style.position, "fixed");

  // Unlock 2 second
  unlock2();
  assert.equal(mockBody.dataset.scrollLockCount, undefined);
  assert.equal(mockBody.style.position, "");
  assert.equal(getScrollY(), 240);
});

test("4. Idempotent unlock: calling unlock multiple times does not corrupt counter", () => {
  const { mockBody, getScrollY } = setupMockDom(180);

  const unlock = lockBodyScroll();
  assert.equal(mockBody.dataset.scrollLockCount, "1");

  // Call unlock multiple times
  unlock();
  unlock();
  unlock();

  assert.equal(mockBody.dataset.scrollLockCount, undefined);
  assert.equal(mockBody.style.position, "");
  assert.equal(getScrollY(), 180);
});

test("5. Rapid successive open/close cycles", () => {
  const { mockBody, getScrollY } = setupMockDom(620);

  for (let i = 0; i < 20; i++) {
    const unlock = lockBodyScroll();
    assert.equal(isBodyScrollLocked(), true);
    unlock();
    assert.equal(isBodyScrollLocked(), false);
  }

  assert.equal(mockBody.dataset.scrollLockCount, undefined);
  assert.equal(mockBody.style.position, "");
  assert.equal(getScrollY(), 620);
});

test("6. Static code audit: DeltaSquadBuilderModal, TeamHub, and PlayerExperience3D use body-scroll-lock", () => {
  const root = process.cwd();
  const squadCode = fs.readFileSync(path.join(root, "components/DeltaSquadBuilderModal.tsx"), "utf8");
  const teamHubCode = fs.readFileSync(path.join(root, "components/TeamHub.tsx"), "utf8");
  const expCode = fs.readFileSync(path.join(root, "components/player/PlayerExperience3D.tsx"), "utf8");

  assert.ok(squadCode.includes('import { lockBodyScroll } from "@/lib/ui/body-scroll-lock"'), "Squad modal imports lockBodyScroll");
  assert.ok(squadCode.includes("const unlock = lockBodyScroll();"), "Squad modal calls lockBodyScroll()");
  assert.ok(squadCode.includes('e.key === "Escape"'), "Squad modal handles Escape key");

  assert.ok(teamHubCode.includes('import { lockBodyScroll } from "@/lib/ui/body-scroll-lock"'), "TeamHub imports lockBodyScroll");
  assert.ok(teamHubCode.includes("const unlock = lockBodyScroll();"), "TeamHub calls lockBodyScroll()");

  assert.ok(expCode.includes('import { lockBodyScroll } from "@/lib/ui/body-scroll-lock"'), "PlayerExperience3D imports lockBodyScroll");
  assert.ok(expCode.includes("const unlock = lockBodyScroll();"), "PlayerExperience3D calls lockBodyScroll()");
  // Verify backward-compatibility strings required by v7d consolidation test:
  assert.ok(expCode.includes('body.style.position = "fixed"'), "Retains test guard body.style.position = fixed");
  assert.ok(expCode.includes('html.style.overflow = "hidden"'), "Retains test guard html.style.overflow = hidden");
});
