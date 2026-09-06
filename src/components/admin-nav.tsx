"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/data", label: "Data records" },
  { href: "/admin/corrections", label: "Corrections" },
  { href: "/admin/representatives", label: "Representatives" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    // flex-wrap (plus rounded-2xl rather than rounded-full, which only reads as a pill on one
    // row) so a narrow viewport wraps this to a second line instead of overflowing the screen
    // with "Representatives" cut off and unreachable — matches how AdminDataNav's chip strip
    // already degrades at mobile widths.
    <nav className="glass flex flex-wrap gap-1 rounded-2xl p-1.5">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-full px-3.5 py-1.5 text-sm ${
            pathname === link.href ? "bg-ink text-white" : "text-slate"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
