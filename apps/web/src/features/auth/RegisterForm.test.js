import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterForm from "./RegisterForm";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    refresh: jest.fn()
  })
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    replace.mockClear();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it("posts registration payload and redirects to login", async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/Tài khoản/), {
      target: { value: "field-user" }
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "field@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/Họ tên/), {
      target: { value: "Field User" }
    });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), {
      target: { value: "user123" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng ký" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "field-user",
          email: "field@example.com",
          name: "Field User",
          password: "user123"
        })
      });
    });
    expect(replace).toHaveBeenCalledWith("/login?registered=1");
  });
});
