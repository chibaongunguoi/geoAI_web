import { redirect } from "next/navigation";
import RegisterForm from "@/features/auth/RegisterForm";
import { getCurrentUser } from "@/features/auth/server-auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Đăng ký GeoAI">
        <p className="eyebrow">GeoAI Đà Nẵng</p>
        <h1>Đăng ký</h1>
        <RegisterForm />
      </section>
    </main>
  );
}
