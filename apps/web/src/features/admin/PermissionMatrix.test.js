import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PermissionMatrix from "./PermissionMatrix";

describe("PermissionMatrix", () => {
  it("renders roles across permissions", () => {
    render(
      <PermissionMatrix
        permissions={[
          { id: "permission-1", key: "admin.users.view", group: "admin", name: "View users" }
        ]}
        roles={[
          {
            id: "role-user",
            code: "USER",
            name: "User",
            permissions: []
          },
          {
            id: "role-admin",
            code: "ADMIN",
            name: "Admin",
            permissions: [{ permission: { key: "admin.users.view" } }]
          }
        ]}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Người dùng" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByText("admin.users.view")).toBeInTheDocument();
    expect(screen.getByText("Có")).toBeInTheDocument();
  });

  it("renders an empty state when data is missing", () => {
    render(<PermissionMatrix roles={[]} permissions={[]} />);

    expect(screen.getByText("Chưa có dữ liệu quyền.")).toBeInTheDocument();
  });
});
