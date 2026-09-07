"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/data", label: "Tuition" },
  { href: "/admin/data/living-costs", label: "Living costs" },
  { href: "/admin/data/scholarships", label: "Scholarships" },
  { href: "/admin/data/users", label: "Users" },
];

export function AdminDataNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={pathname === link.href ? "chip chip-selected" : "chip"}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
