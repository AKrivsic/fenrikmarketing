"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavLink.module.css";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={isActive ? `${styles.link} ${styles.active}` : styles.link}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
