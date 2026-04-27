import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import MapWrapper from "../components/MapWrapper";
import styles from "./page.module.css";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "map.view")) {
    return (
      <AppShell user={user}>
        <main className="empty-state">
          <h1>Không có quyền xem bản đồ</h1>
          <p>Vui lòng liên hệ Admin để được cấp quyền map.view.</p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <main className={styles.page} aria-label="Không gian phân tích GeoAI">
        <MapWrapper permissions={user.permissions} />
      </main>
    </AppShell>
  );
}
