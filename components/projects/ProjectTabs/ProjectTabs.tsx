"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ProjectTabs.module.css";

interface ProjectTabsProps {
  projectId: string;
}

interface Tab {
  label: string;
  segment: string; // appended to /projects/[id]; "" = Project Brain index
}

const TABS: Tab[] = [
  { label: "Project Brain", segment: "" },
  { label: "Knowledge", segment: "knowledge" },
  { label: "Weekly Strategy", segment: "weekly-strategy" },
  { label: "Publishing Plan", segment: "publishing-plan" },
  { label: "Assets", segment: "assets" },
  { label: "Content Packages", segment: "content-packages" },
];

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className={styles.tabs} aria-label="Project sekce">
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
