"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const HIGHLIGHT_CLASS = "hash-target";
const HIGHLIGHT_MS = 1800;

function focusHashTarget() {
  const hash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
  const target = hash ? document.getElementById(hash) : null;

  if (!target) {
    // No hash (or it doesn't match anything on this page): the normal "land at the top" case.
    document.getElementById("app-main")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    return;
  }

  // scrollIntoView respects the target's own `scroll-margin-top` (the scholarship cards already
  // set `scroll-mt-24` for this), and — unlike the browser's native fragment scroll, which only
  // ever targets the document — it scrolls whichever box actually contains the scrollbar. On
  // mobile that's #app-main (a clipped, internally-scrolling viewport; see layout.tsx), which
  // native fragment scrolling can't reach at all; on desktop it's the document, same as before.
  target.scrollIntoView({ block: "start", behavior: "smooth" });

  // Flash the card so it's obvious which one was linked to. Restart the animation even if this
  // same target was already highlighted a moment ago (e.g. two deep links in a row).
  target.classList.remove(HIGHLIGHT_CLASS);
  void target.offsetWidth; // force reflow before re-adding the class
  target.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => target.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS);
}

/**
 * Decides where the page lands after a navigation. Needed on top of the browser's own behaviour
 * because, on mobile, #app-main — not the document — is what actually scrolls (see layout.tsx),
 * and neither Next's scroll-to-top-on-navigate nor the browser's native #fragment scroll ever
 * reach it.
 *
 * - No hash: reset to top (desktop already got this from the browser; mobile needs it done
 *   manually).
 * - A hash naming an element on the page (a deep link like /scholarships#<id>): scroll it into
 *   view and highlight it — see focusHashTarget. Runs on mount/route change and again on
 *   hashchange, since navigating between two hashes on the same route (e.g. a second deep link
 *   while already on /scholarships) changes the hash without changing the pathname.
 */
export function ScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    // Give the new route's content a frame to be in the DOM before measuring/scrolling.
    const frame = window.requestAnimationFrame(focusHashTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("hashchange", focusHashTarget);
    return () => window.removeEventListener("hashchange", focusHashTarget);
  }, []);

  return null;
}
