import type { Metadata, Viewport } from "next";
import { Inter, Spectral } from "next/font/google";
import { ContourField } from "@/components/contour-field";
import { ScrollManager } from "@/components/scroll-manager";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-spectral",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATLAS — international education planning",
  description:
    "Work out which universities and countries are affordable, realistic and worth applying to, with every recommendation explained.",
};

// viewport-fit=cover is what makes env(safe-area-inset-*) resolve to a real value on iPhones
// with a home indicator/notch — without it the fixed mobile header and bottom nav would get 0
// from every safe-area-inset-* they use below.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  return (
    <html lang="en" className={`${inter.variable} ${spectral.variable}`}>
      <body className="min-h-dvh">
        <ContourField />
        <SiteNav user={user ? { name: user.name, role: user.role } : null} unreadCount={unreadCount} />
        {/* Mobile: <main> is its own fixed, clipped viewport between the compact header (top)
            and floating tab bar (bottom) — not padding inside a normally-scrolling document.
            Padding-bottom only ever guarantees clearance at the very end of a page; it does
            nothing to stop content from passing underneath a translucent fixed bar while
            scrolling through the middle of a long one, and that's exactly where a dense page
            (weight-priority controls, a 60-row admin table) puts its interactive rows. Clipping
            <main>'s own box to the safe zone between the two bars means content can never occupy
            those screen pixels at all, at any scroll position — not just at rest. The clip
            bounds grow with the safe-area inset so they always clear the real header/nav height.
            Desktop is unchanged: normal document flow, floating pill header/main padding. */}
        <main
          id="app-main"
          className="fixed inset-x-0 top-[calc(4rem_+_env(safe-area-inset-top))] bottom-[calc(7rem_+_env(safe-area-inset-bottom))] mx-auto w-full max-w-[1240px] overflow-y-auto overscroll-contain px-4 pt-4 pb-6 sm:px-6 lg:static lg:inset-auto lg:overflow-visible lg:overscroll-auto lg:pb-16 lg:pt-24"
        >
          <ScrollManager />
          {children}
        </main>
      </body>
    </html>
  );
}
