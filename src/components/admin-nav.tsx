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
    <nav className="glass flex gap-1 rounded-full p-1.5">
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
