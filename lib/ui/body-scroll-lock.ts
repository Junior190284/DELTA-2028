/**
 * DELTA INFERNO 2.0 — Safe Reference-Counted Body Scroll Lock
 *
 * Prevents background page scrolling under modal dialogues.
 * Uses a reference counter (document.body.dataset.scrollLockCount) to allow
 * stacked modals (e.g. Squad Builder -> Player Profile -> Card Inspector)
 * without clobbering the initial window.scrollY or leaving the document trapped in fixed positioning.
 */

import { useEffect } from "react";

export interface ScrollLockState {
  isLocked: boolean;
  lockCount: number;
}

/**
 * Locks document body scroll using position: fixed and records the original scroll position.
 * Returns an idempotent unlock function.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  const html = document.documentElement;
  const body = document.body;
  const currentCount = parseInt(body.dataset.scrollLockCount || "0", 10);

  if (currentCount === 0) {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    body.dataset.prevScrollY = String(scrollY);
    body.dataset.prevHtmlOverflow = html.style.overflow || "";
    body.dataset.prevBodyOverflow = body.style.overflow || "";
    body.dataset.prevBodyPosition = body.style.position || "";
    body.dataset.prevBodyTop = body.style.top || "";
    body.dataset.prevBodyLeft = body.style.left || "";
    body.dataset.prevBodyRight = body.style.right || "";
    body.dataset.prevBodyWidth = body.style.width || "";

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
  }

  body.dataset.scrollLockCount = String(currentCount + 1);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const remainingCount = Math.max(0, parseInt(body.dataset.scrollLockCount || "1", 10) - 1);
    if (remainingCount === 0) {
      delete body.dataset.scrollLockCount;
      const targetScrollY = parseInt(body.dataset.prevScrollY || "0", 10);
      const prevHtmlOverflow = body.dataset.prevHtmlOverflow || "";
      const prevBodyOverflow = body.dataset.prevBodyOverflow || "";
      const prevBodyPosition = body.dataset.prevBodyPosition || "";
      const prevBodyTop = body.dataset.prevBodyTop || "";
      const prevBodyLeft = body.dataset.prevBodyLeft || "";
      const prevBodyRight = body.dataset.prevBodyRight || "";
      const prevBodyWidth = body.dataset.prevBodyWidth || "";

      delete body.dataset.prevScrollY;
      delete body.dataset.prevHtmlOverflow;
      delete body.dataset.prevBodyOverflow;
      delete body.dataset.prevBodyPosition;
      delete body.dataset.prevBodyTop;
      delete body.dataset.prevBodyLeft;
      delete body.dataset.prevBodyRight;
      delete body.dataset.prevBodyWidth;

      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;

      window.scrollTo({ top: targetScrollY, left: 0, behavior: "auto" });
    } else {
      body.dataset.scrollLockCount = String(remainingCount);
    }
  };
}

/**
 * Returns whether the document body is currently locked by any modal.
 */
export function isBodyScrollLocked(): boolean {
  if (typeof document === "undefined") return false;
  const count = parseInt(document.body.dataset.scrollLockCount || "0", 10);
  return count > 0;
}

/**
 * React hook to lock document body scroll while `isLocked` is true.
 * Automatically releases lock on unmount or when `isLocked` becomes false.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    const unlock = lockBodyScroll();
    return () => {
      unlock();
    };
  }, [isLocked]);
}
