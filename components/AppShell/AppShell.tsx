import type { ReactNode } from "react";
import { AppShellClient } from "./AppShellClient";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return <AppShellClient>{children}</AppShellClient>;
}
