import type { Metadata } from "next";
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
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:pb-16 lg:pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
