import Link from "next/link";
import { getVisibleNavigationItems } from "./auth-client";
import LogoutButton from "./LogoutButton";

export default function AppShell({ user, children }) {
  const items = getVisibleNavigationItems(user?.permissions || []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="app-brand" href="/">
          <span>GeoAI</span>
          <small>Đà Nẵng</small>
        </Link>
        <nav className="app-nav" aria-label="Điều hướng chính">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="app-user">
          <span>{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
