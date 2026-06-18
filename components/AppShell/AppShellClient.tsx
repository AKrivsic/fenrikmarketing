"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SideNav } from "@/components/SideNav/SideNav";
import styles from "./AppShell.module.css";

const BARE_PATH_PREFIXES = ["/content-packages", "/client-review", "/admin-login"];

interface AppShellClientProps {
  children: ReactNode;
}

export function AppShellClient({ children }: AppShellClientProps) {
  const pathname = usePathname();
  const bare =
    pathname === "/" ||
    BARE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (bare) {
    return <div className={styles.bareMain}>{children}</div>;
  }

  return (
    <div className={styles.shell}>
      <SideNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
