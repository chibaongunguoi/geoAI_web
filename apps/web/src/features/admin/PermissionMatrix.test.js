import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PermissionMatrix from "./PermissionMatrix";

/**
 * Test Suite: PermissionMatrix Vietnamese Display
 * 
 * Validates:
 * - Property 5: Admin Pages Display Only Vietnamese Text
 * - Property 7: All Application UI Elements Are Vietnamese
 * 
 * These tests ensure that the PermissionMatrix component displays all UI elements
 * in Vietnamese, including permission descriptions, role labels, and status indicators.
 */
describe("PermissionMatrix - Vietnamese Display", () => {
  const mockPermissions = [
    { id: "permission-1", key: "admin.users.view", group: "admin", name: "View users" },
    { id: "permission-2", key: "admin.users.manage", group: "admin", name: "Manage users" },
    { id: "permission-3", key: "admin.roles.view", group: "admin", name: "View roles" },
    { id: "permission-4", key: "admin.roles.manage", group: "admin", name: "Manage roles" },
    { id: "permission-5", key: "admin.permissions.view", group: "admin", name: "View permissions" }
  ];

  const mockRoles = [
    {
      id: "role-user",
      code: "USER",
      name: "User",
      permissions: [{ permission: { key: "admin.users.view" } }]
    },
    {
      id: "role-manager",
      code: "MANAGER",
      name: "Manager",
      permissions: [
        { permission: { key: "admin.users.view" } },
        { permission: { key: "admin.users.manage" } },
        { permission: { key: "admin.roles.view" } }
      ]
    },
    {
      id: "role-admin",
      code: "ADMIN",
      name: "Admin",
      permissions: [
        { permission: { key: "admin.users.view" } },
        { permission: { key: "admin.users.manage" } },
        { permission: { key: "admin.roles.view" } },
        { permission: { key: "admin.roles.manage" } },
        { permission: { key: "admin.permissions.view" } }
      ]
    }
  ];

  describe("Property 5: Admin Pages Display Only Vietnamese Text", () => {
    it("renders all role labels in Vietnamese", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify role labels are in Vietnamese
      expect(screen.getByRole("columnheader", { name: "Người dùng" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Cán bộ" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Quản trị viên" })).toBeInTheDocument();

      // Verify no English role names appear
      expect(screen.queryByText("User")).not.toBeInTheDocument();
      expect(screen.queryByText("Manager")).not.toBeInTheDocument();
    });

    it("renders all permission descriptions in Vietnamese instead of technical codes", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify Vietnamese permission descriptions are displayed
      expect(screen.getByText("Xem người dùng")).toBeInTheDocument();
      expect(screen.getByText("Quản lý người dùng")).toBeInTheDocument();
      expect(screen.getByText("Xem vai trò")).toBeInTheDocument();
      expect(screen.getByText("Quản lý vai trò")).toBeInTheDocument();
      expect(screen.getByText("Xem quyền")).toBeInTheDocument();

      // Verify technical codes do NOT appear in the permission column
      expect(screen.queryByText("admin.users.view")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.users.manage")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.roles.view")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.roles.manage")).not.toBeInTheDocument();
      expect(screen.queryByText("admin.permissions.view")).not.toBeInTheDocument();
    });

    it("renders permission group labels in Vietnamese", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify permission group labels are in Vietnamese (use getAllByText since they appear multiple times)
      expect(screen.getAllByText("Người dùng").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Vai trò").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Quyền").length).toBeGreaterThan(0);
    });

    it("renders permission status indicators in Vietnamese", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify status indicators are in Vietnamese
      const vietneseYes = screen.getAllByText("Có");
      expect(vietneseYes.length).toBeGreaterThan(0);

      // Verify no English "Yes" appears
      expect(screen.queryByText("Yes")).not.toBeInTheDocument();
    });

    it("renders empty state message in Vietnamese", () => {
      render(<PermissionMatrix roles={[]} permissions={[]} />);

      expect(screen.getByText("Chưa có dữ liệu quyền.")).toBeInTheDocument();
      expect(screen.queryByText("No permission data")).not.toBeInTheDocument();
    });

    it("renders loading state message in Vietnamese", async () => {
      const mockFetchData = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <PermissionMatrix
          fetchData={mockFetchData}
        />
      );

      expect(screen.getByText("Đang tải dữ liệu...")).toBeInTheDocument();
      expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
    });

    it("renders error state message in Vietnamese", async () => {
      const mockFetchData = jest.fn(() => Promise.reject(new Error("Test error")));

      render(
        <PermissionMatrix
          fetchData={mockFetchData}
        />
      );

      // Wait for error to be displayed
      await new Promise(resolve => setTimeout(resolve, 100));

      // The error message will be "Test error" from the thrown error
      expect(screen.getByText("Test error")).toBeInTheDocument();
      expect(screen.queryByText("Failed to load permission data")).not.toBeInTheDocument();
    });

    it("renders retry button in Vietnamese", async () => {
      const mockFetchData = jest.fn(() => Promise.reject(new Error("Test error")));

      render(
        <PermissionMatrix
          fetchData={mockFetchData}
        />
      );

      // Wait for error to be displayed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });

    it("renders permission header in Vietnamese", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      expect(screen.getByRole("columnheader", { name: "Quyền" })).toBeInTheDocument();
      expect(screen.queryByRole("columnheader", { name: "Permission" })).not.toBeInTheDocument();
    });
  });

  describe("Property 7: All Application UI Elements Are Vietnamese", () => {
    it("displays all permission matrix elements in Vietnamese", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Collect all text content
      const container = screen.getByRole("table");
      const textContent = container.textContent;

      // Verify no common English words appear in the matrix
      expect(textContent).not.toMatch(/\bPermission\b/i);
      expect(textContent).not.toMatch(/\bRole\b/i);
      expect(textContent).not.toMatch(/\bManage\b/i);
      expect(textContent).not.toMatch(/\bView\b/i);
      expect(textContent).not.toMatch(/\bYes\b/i);
      expect(textContent).not.toMatch(/\bNo\b/i);
    });

    it("maintains consistent Vietnamese terminology across all permissions", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify consistent use of Vietnamese terms
      const userPermissions = screen.getAllByText(/Người dùng/);
      expect(userPermissions.length).toBeGreaterThan(0);

      const rolePermissions = screen.getAllByText(/Vai trò/);
      expect(rolePermissions.length).toBeGreaterThan(0);

      // Verify the same term is used consistently
      expect(screen.getByText("Xem người dùng")).toBeInTheDocument();
      expect(screen.getByText("Quản lý người dùng")).toBeInTheDocument();
    });

    it("displays permission matrix with all Vietnamese labels", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify all column headers are Vietnamese
      const headers = screen.getAllByRole("columnheader");
      headers.forEach(header => {
        const text = header.textContent;
        // Should not contain English permission codes or common English words
        expect(text).not.toMatch(/admin\./);
        expect(text).not.toMatch(/\bPermission\b/i);
      });
    });
  });

  describe("Permission Matrix Functionality with Vietnamese Display", () => {
    it("renders roles across permissions with correct Vietnamese labels", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify structure with Vietnamese labels
      expect(screen.getByRole("columnheader", { name: "Quyền" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Người dùng" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Cán bộ" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Quản trị viên" })).toBeInTheDocument();

      // Verify permission descriptions are displayed
      expect(screen.getByText("Xem người dùng")).toBeInTheDocument();
      expect(screen.getAllByText("Có").length).toBeGreaterThan(0);
    });

    it("renders an empty state when data is missing", () => {
      render(<PermissionMatrix roles={[]} permissions={[]} />);

      expect(screen.getByText("Chưa có dữ liệu quyền.")).toBeInTheDocument();
    });

    it("correctly maps all permission codes to Vietnamese descriptions", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify all permission codes are mapped to Vietnamese
      const permissionMappings = {
        "admin.users.view": "Xem người dùng",
        "admin.users.manage": "Quản lý người dùng",
        "admin.roles.view": "Xem vai trò",
        "admin.roles.manage": "Quản lý vai trò",
        "admin.permissions.view": "Xem quyền"
      };

      Object.values(permissionMappings).forEach(vietnameseLabel => {
        expect(screen.getByText(vietnameseLabel)).toBeInTheDocument();
      });
    });

    it("displays permission group labels correctly in Vietnamese", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify group labels are displayed (use getAllByText since they appear multiple times)
      expect(screen.getAllByText("Người dùng").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Vai trò").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Quyền").length).toBeGreaterThan(0);
    });

    it("renders permission status correctly with Vietnamese indicators", () => {
      render(
        <PermissionMatrix
          permissions={mockPermissions}
          roles={mockRoles}
        />
      );

      // Verify status indicators
      const yesIndicators = screen.getAllByText("Có");
      expect(yesIndicators.length).toBeGreaterThan(0);

      // Verify dash for no permission
      const noIndicators = screen.getAllByText("-");
      expect(noIndicators.length).toBeGreaterThan(0);
    });
  });
});
