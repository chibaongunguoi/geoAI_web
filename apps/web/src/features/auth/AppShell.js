'use client';

import Link from "next/link";
import { getVisibleNavigationItems } from "./auth-client";
import { useTranslation } from "../shared/localization/useTranslation";
import LogoutButton from "./LogoutButton";
import NotificationBell from "../notification/NotificationBell";

export default function AppShell({ user, variant = "page", children }) {
  const { t } = useTranslation();
  const items = getVisibleNavigationItems(user?.permissions || []);
  const shellClass = variant === "map" ? "app-shell app-shell--map" : "app-shell app-shell--page";

  return (
    <div className={shellClass}>
      <header className="app-header">
        <Link className="app-brand" href="/">
          <span>GeoAI</span>
          <small>Đà Nẵng</small>
        </Link>
        <nav className="app-nav" aria-label="Điều hướng chính">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {t(item.translationKey)}
            </Link>
          ))}
        </nav>
        <div className="app-user" style={{ display: 'flex', alignItems: 'center' }}>
          <NotificationBell />
          <span>{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="app-shell__content">
        {children}
      </div>
    </div>
  );
}
