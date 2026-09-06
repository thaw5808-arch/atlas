import type { Metadata, Viewport } from "next";
import { Inter, Spectral } from "next/font/google";
import { ContourField } from "@/components/contour-field";
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
        {/* Mobile padding clears the fixed compact header (top) and floating tab bar (bottom),
            both of which grow with the device's safe-area inset — these must scale with them so
            nothing ever sits underneath. Desktop keeps its own fixed values since that header/nav
            doesn't use safe-area insets. */}
        <main className="mx-auto w-full max-w-[1240px] px-4 pt-[calc(4rem_+_env(safe-area-inset-top))] pb-[calc(7rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:pb-16 lg:pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
