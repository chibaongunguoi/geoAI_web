"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const logout = () => {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <button className="text-button" type="button" disabled={pending} onClick={logout}>
      {pending ? "Đang thoát..." : "Đăng xuất"}
    </button>
  );
}
