import Link from "next/link";

type NavSubItem = {
  href: string;
  label: string;
};

type NavItem = {
  href?: string;
  label: string;
  items?: NavSubItem[];
};

const defaultNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads for Movers/Junk" },
  { href: "/get-quote", label: "Get a Quote" },
  { href: "/services-for-realtors", label: "Services for Realtors" },
  { href: "/account", label: "Account" },
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
              {navItems.map((item) =>
                item.items ? (
                  <div className="nav-dropdown" key={item.label}>
                    <button className="nav-link nav-dropdown-trigger" type="button">
                      {item.label}
                      <span className="nav-dropdown-chevron" aria-hidden="true">▾</span>
                    </button>
                    <div className="nav-dropdown-menu">
                      {item.items.map((sub) => (
                        <Link className="nav-dropdown-item" href={sub.href} key={sub.href}>
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link className="nav-link" href={item.href!} key={item.href}>
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
