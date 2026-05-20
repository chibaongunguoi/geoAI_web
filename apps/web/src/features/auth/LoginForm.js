"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: formData.get("identifier"),
          password: formData.get("password")
        })
      });

      if (!response.ok) {
        setError("Tài khoản hoặc mật khẩu không đúng.");
        return;
      }

      router.replace("/");
      router.refresh();
    });
  };

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="login-identifier">
        Tài khoản hoặc email
      </label>
      <input
        id="login-identifier"
        name="identifier"
        type="text"
        autoComplete="username"
        placeholder="Nhập tài khoản hoặc email"
        required
      />
      <label htmlFor="login-password">
        Mật khẩu
      </label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Nhập mật khẩu"
        required
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <Link className="form-link" href="/register">
        Chưa có tài khoản? Đăng ký
      </Link>
    </form>
  );
}
