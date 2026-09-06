"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Bookmark,
  Compass,
  FlaskConical,
  GraduationCap,
  Globe2,
  LayoutGrid,
  Menu,
  Award,
  Rows3,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

const LINKS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/universities", label: "Universities", icon: GraduationCap },
  { href: "/countries", label: "Countries", icon: Globe2 },
  { href: "/compare", label: "Compare", icon: Rows3 },
  { href: "/decision-lab", label: "Decision Lab", icon: FlaskConical },
  { href: "/scholarships", label: "Scholarships", icon: Award },
  { href: "/planner", label: "Planner", icon: LayoutGrid },
];

export function SiteNav({
  user,
  unreadCount = 0,
}: {
  user: { name: string; role: string } | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const roleLink =
    user?.role === "REPRESENTATIVE"
      ? { href: "/portal", label: "Portal" }
      : user?.role === "ADMIN"
        ? { href: "/admin", label: "Admin" }
        : null;

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 hidden justify-center px-6 pt-4 lg:flex">
        <nav className="glass pointer-events-auto flex h-14 items-center gap-1 rounded-full pl-5 pr-2">
          <Link href="/" className="mr-3 flex items-baseline gap-2">
            <span className="font-display text-lg tracking-tight">ATLAS</span>
            <span className="hidden text-[11px] text-mist xl:inline">education planning</span>
          </Link>

          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative rounded-full px-3 py-1.5 text-sm transition-colors ${
                isActive(link.href) ? "text-ink" : "text-slate hover:text-ink"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute inset-x-3 -bottom-0.5 h-px bg-viridian" />
              )}
            </Link>
          ))}

          {roleLink && (
            <Link
              href={roleLink.href}
              className={`relative rounded-full px-3 py-1.5 text-sm transition-colors ${
                isActive(roleLink.href) ? "text-ink" : "text-slate hover:text-ink"
              }`}
            >
              {roleLink.label}
              {isActive(roleLink.href) && (
                <span className="absolute inset-x-3 -bottom-0.5 h-px bg-viridian" />
              )}
            </Link>
          )}

          <span className="mx-2 h-6 w-px bg-line" />

          <Link href="/search" aria-label="Search" className="btn btn-ghost h-9 w-9 px-0">
            <Search size={17} />
          </Link>
          <Link href="/saved" aria-label="Saved universities" className="btn btn-ghost h-9 w-9 px-0">
            <Bookmark size={17} />
          </Link>
          <Link href="/notifications" aria-label="Notifications" className="btn btn-ghost relative h-9 w-9 px-0">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rust" />
            )}
          </Link>

          {user ? (
            <Link
              href="/profile"
              className="btn btn-primary h-9 gap-2 pl-2 pr-3"
              title={`${user.name} · ${user.role.toLowerCase()}`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[11px]">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-24 truncate text-xs">{user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary h-9">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      {/* Mobile: a compact floating bar, not a shrunken desktop nav. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 lg:hidden">
        <nav className="glass pointer-events-auto flex h-14 w-full max-w-md items-center justify-around rounded-full px-2">
          {[LINKS[0], LINKS[1], LINKS[4], LINKS[6]].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive(link.href) ? "bg-ink text-white" : "text-slate"
                }`}
              >
                <Icon size={19} />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate"
          >
            <Menu size={19} />
          </button>
        </nav>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="glass absolute inset-x-3 bottom-3 rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg">ATLAS</span>
              <button type="button" className="btn btn-ghost h-8 w-8 px-0" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="panel flex items-center gap-2 px-3 py-2.5 text-sm"
                >
                  <link.icon size={16} className="text-viridian" />
                  {link.label}
                </Link>
              ))}
              <Link href="/saved" onClick={() => setOpen(false)} className="panel flex items-center gap-2 px-3 py-2.5 text-sm">
                <Bookmark size={16} className="text-viridian" /> Saved
              </Link>
              <Link href="/notifications" onClick={() => setOpen(false)} className="panel flex items-center gap-2 px-3 py-2.5 text-sm">
                <Bell size={16} className="text-viridian" /> Notifications
              </Link>
              {roleLink && (
                <Link
                  href={roleLink.href}
                  onClick={() => setOpen(false)}
                  className="panel flex items-center gap-2 px-3 py-2.5 text-sm"
                >
                  <ShieldCheck size={16} className="text-viridian" /> {roleLink.label}
                </Link>
              )}
              <Link
                href={user ? "/profile" : "/login"}
                onClick={() => setOpen(false)}
                className="panel col-span-2 flex items-center gap-2 px-3 py-2.5 text-sm"
              >
                <UserRound size={16} className="text-viridian" /> {user ? user.name : "Sign in"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
