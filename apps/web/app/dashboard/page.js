import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import DashboardClient from "@/features/dashboard/DashboardClient";
import { normalizeAssetFilters } from "@/features/filters/filter-state";

export default async function DashboardPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "dashboard.view")) {
    redirect("/");
  }

  const filters = normalizeAssetFilters({
    status: params?.status || "",
    propertyType: params?.propertyType || "",
    district: params?.district || "",
    ward: params?.ward || "",
    updatedFrom: params?.updatedFrom || "",
    updatedTo: params?.updatedTo || ""
  });

  return (
    <AppShell user={user} variant="page">
      <DashboardClient initialFilters={filters} canExport={canAccess(user.permissions, "export.use")} />
    </AppShell>
  );
}
