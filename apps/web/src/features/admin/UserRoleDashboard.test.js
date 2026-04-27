import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserRoleDashboard from "./UserRoleDashboard";

const users = [
  {
    id: "user-1",
    username: "field-user",
    email: "field@example.com",
    name: "Field User",
    status: "ACTIVE",
    roles: [{ role: { code: "USER" } }]
  }
];

describe("UserRoleDashboard", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it("updates selected roles through the admin BFF route", async () => {
    render(<UserRoleDashboard users={users} canManageRoles={true} />);

    fireEvent.click(screen.getByLabelText("Cán bộ"));
    fireEvent.click(screen.getByRole("button", { name: "Lưu vai trò" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/user-1/roles", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roles: ["USER", "MANAGER"] })
      });
    });
  });
});
