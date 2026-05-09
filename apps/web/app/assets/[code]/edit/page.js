import { notFound, redirect } from "next/navigation";
import AppShell from "@/features/auth/AppShell";
import { canAccess } from "@/features/auth/auth-client";
import { getCurrentUser } from "@/features/auth/server-auth";
import AssetForm from "../../../../components/AssetForm";
import { getAssetByIdentifier } from "@/features/assets/assets-server";

export default async function EditAssetPage({ params }) {
  const user = await getCurrentUser();
  const { code } = await params;

  if (!user) {
    redirect("/login");
  }

  if (!canAccess(user.permissions, "properties.manage")) {
    redirect(`/assets/${encodeURIComponent(code)}`);
  }

  const property = await getAssetByIdentifier(decodeURIComponent(code));
  if (!property) {
    notFound();
  }

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Sửa tài sản</h1>
        <AssetForm mode="edit" property={property} />
      </main>
    </AppShell>
  );
}
