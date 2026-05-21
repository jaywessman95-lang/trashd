import Link from "next/link";

type NavItem = {
  href: string;
  label: string;
};

const defaultNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/account", label: "Account" }
];

type AppShellProps = {
  children: React.ReactNode;
  navItems?: NavItem[];
};

export function AppShell({ children, navItems = defaultNavItems }: AppShellProps) {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/">
            Trashd
          </Link>
          <div className="topbar-menu">
            <nav className="nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <Link className="nav-link" href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
