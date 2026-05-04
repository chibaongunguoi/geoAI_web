import Link from "next/link";
import AppShell from "@/features/auth/AppShell";
import { getCurrentUser } from "@/features/auth/server-auth";

export default async function AssetDetailPage({ params }) {
  const user = await getCurrentUser();
  const { code } = await params;

  return (
    <AppShell user={user}>
      <main className="admin-page">
        <h1>Hồ sơ tài sản {decodeURIComponent(code)}</h1>
        <p>
          Trang chi tiết tài sản mẫu phục vụ liên kết từ popup bản đồ. Dữ liệu hồ sơ
          đầy đủ sẽ được nối với catalog tài sản trong các slice sau.
        </p>
        <Link className="form-link" href="/">
          Quay lại bản đồ
        </Link>
      </main>
    </AppShell>
  );
}
