import Link from "next/link";
import styles from "./QuickLinks.module.css";

interface QuickLink {
  label: string;
  href: string;
}

const LINKS: QuickLink[] = [
  { label: "Go to Review Queue", href: "/review-queue" },
  { label: "Projects", href: "/projects" },
  { label: "Assets", href: "/assets" },
];

export function QuickLinks() {
  return (
    <nav className={styles.links} aria-label="Rychlé odkazy">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={styles.link}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
