import type { ReactNode } from "react";
import { SideNav } from "@/components/SideNav/SideNav";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <SideNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
