"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * On mobile <main> is its own clipped, internally-scrolling viewport (see layout.tsx) rather
 * than the document itself, so the browser's normal "scroll to top on navigate" behaviour never
 * touches it — without this, a page you'd scrolled down on stays scrolled down under whatever
 * you navigate to next. Desktop scrolls the document as usual; scrollTo on a non-scrolling
 * element is a harmless no-op there.
 */
export function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    document.getElementById("app-main")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}
