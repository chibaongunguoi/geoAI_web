import { redirect } from "next/navigation";
import LoginForm from "@/features/auth/LoginForm";
import { getCurrentUser } from "@/features/auth/server-auth";

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const registered = params?.registered === "1";

  if (user) {
    redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Đăng nhập GeoAI">
        <p className="eyebrow">GeoAI Đà Nẵng</p>
        <h1>Đăng nhập</h1>
        {registered ? (
          <p className="form-status" role="status">
            Đăng ký thành công. Hãy đăng nhập để tiếp tục.
          </p>
        ) : null}
        <LoginForm />
      </section>
    </main>
  );
}
