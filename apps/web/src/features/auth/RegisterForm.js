"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError("");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          email: formData.get("email"),
          name: formData.get("name"),
          password: formData.get("password")
        })
      });

      if (!response.ok) {
        setError("Không thể đăng ký tài khoản này.");
        return;
      }

      router.replace("/login?registered=1");
    });
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        Tài khoản
        <input name="username" type="text" autoComplete="username" required />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" />
      </label>
      <label>
        Họ tên
        <input name="name" type="text" autoComplete="name" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" autoComplete="new-password" required />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Đang đăng ký..." : "Đăng ký"}
      </button>
      <Link className="form-link" href="/login">
        Đã có tài khoản? Đăng nhập
      </Link>
    </form>
  );
}
