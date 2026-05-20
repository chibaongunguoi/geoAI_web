import { redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import AssetForm from "../../../components/AssetForm";

export default async function NewAssetPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "properties.manage")) {
    redirect("/assets");
  }

  return (
    <AppShell user={user} variant="page">
      <main className="admin-page">
        <h1>Thêm tài sản</h1>
        <AssetForm mode="create" />
      </main>
    </AppShell>
  );
}
