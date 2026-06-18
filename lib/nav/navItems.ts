// Single source of truth for the MVP sidebar. Order here is the order shown
// in SideNav.
export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Review Queue", href: "/review-queue" },
  { label: "Assets", href: "/assets" },
  { label: "History", href: "/history" },
  { label: "Settings", href: "/settings" },
  { label: "Content Clients", href: "/admin/clients" },
];
