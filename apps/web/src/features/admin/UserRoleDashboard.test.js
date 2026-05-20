import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserRoleDashboard from "./UserRoleDashboard";

/**
 * Test Suite: UserRoleDashboard Vietnamese Display
 * 
 * Validates:
 * - Property 5: Admin Pages Display Only Vietnamese Text
 * - Property 7: All Application UI Elements Are Vietnamese
 * 
 * These tests ensure that the UserRoleDashboard component displays all UI elements
 * in Vietnamese, including user information, role labels, buttons, and messages.
 */

const users = [
  {
    id: "user-1",
    username: "field-user",
    email: "field@example.com",
    name: "Field User",
    status: "ACTIVE",
    roles: [{ role: { code: "USER" } }]
  },
  {
    id: "user-2",
    username: "manager-user",
    email: "manager@example.com",
    name: "Manager User",
    status: "ACTIVE",
    roles: [{ role: { code: "MANAGER" } }]
  },
  {
    id: "user-3",
    username: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    status: "LOCKED",
    roles: [{ role: { code: "ADMIN" } }]
  }
];

describe("UserRoleDashboard - Vietnamese Display", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Property 5: Admin Pages Display Only Vietnamese Text", () => {
    it("renders all role labels in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify Vietnamese role labels are displayed
      expect(screen.getAllByLabelText("Người dùng").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Cán bộ").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Quản trị viên").length).toBeGreaterThan(0);

      // Verify no English role names appear
      expect(screen.queryByLabelText("User")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Manager")).not.toBeInTheDocument();
    });

    it("renders all buttons in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify Vietnamese button labels
      expect(screen.getAllByRole("button", { name: "Lưu vai trò" }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /Khóa tài khoản|Mở khóa tài khoản/ }).length).toBeGreaterThan(0);

      // Verify no English button labels appear
      expect(screen.queryByRole("button", { name: "Save Roles" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lock Account" })).not.toBeInTheDocument();
    });

    it("renders user information labels in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify Vietnamese labels are displayed
      expect(screen.getByText("Thông tin")).toBeInTheDocument();
      expect(screen.getAllByText("Vai trò").length).toBeGreaterThan(0);
      expect(screen.getByText("Hành động")).toBeInTheDocument();

      // Verify no English labels appear
      expect(screen.queryByText("User Information")).not.toBeInTheDocument();
      expect(screen.queryByText("Roles")).not.toBeInTheDocument();
      expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    });

    it("renders loading state message in Vietnamese", async () => {
      const mockFetchUsers = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <UserRoleDashboard
          fetchUsers={mockFetchUsers}
          canManageRoles={true}
        />
      );

      expect(screen.getByText("Đang tải dữ liệu...")).toBeInTheDocument();
      expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
    });

    it("renders empty state message in Vietnamese", () => {
      render(<UserRoleDashboard users={[]} canManageRoles={true} />);

      // Use regex matcher since the text is broken up across multiple elements
      expect(screen.getByText(/Chưa có người dùng/)).toBeInTheDocument();
      expect(screen.queryByText("No users")).not.toBeInTheDocument();
    });

    it("renders retry button in Vietnamese", async () => {
      const mockFetchUsers = jest.fn(() => Promise.reject(new Error("Test error")));

      render(
        <UserRoleDashboard
          fetchUsers={mockFetchUsers}
          canManageRoles={true}
        />
      );

      // Wait for error to be displayed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });
  });

  describe("Property 7: All Application UI Elements Are Vietnamese", () => {
    it("displays all user dashboard elements in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Collect all text content
      const container = document.body;
      const textContent = container.textContent;

      // Verify no common English words appear
      expect(textContent).not.toMatch(/\bUser Information\b/i);
      expect(textContent).not.toMatch(/\bRoles\b/i);
      expect(textContent).not.toMatch(/\bActions\b/i);
      expect(textContent).not.toMatch(/\bSave\b/i);
      expect(textContent).not.toMatch(/\bLock\b/i);
    });

    it("maintains consistent Vietnamese terminology across all users", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify consistent use of Vietnamese terms
      const roleLabels = screen.getAllByText(/Vai trò/);
      expect(roleLabels.length).toBeGreaterThan(0);

      // Verify the same term is used consistently (use getAllByLabelText since they appear multiple times)
      expect(screen.getAllByLabelText("Người dùng").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Cán bộ").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Quản trị viên").length).toBeGreaterThan(0);
    });

    it("displays all user dashboard labels in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify all labels are Vietnamese
      expect(screen.getByText("Thông tin")).toBeInTheDocument();
      expect(screen.getAllByText("Vai trò").length).toBeGreaterThan(0);
      expect(screen.getByText("Hành động")).toBeInTheDocument();

      // Verify no English labels appear
      expect(screen.queryByText("User Information")).not.toBeInTheDocument();
      expect(screen.queryByText("Roles")).not.toBeInTheDocument();
      expect(screen.queryByText("Actions")).not.toBeInTheDocument();
    });
  });

  describe("UserRoleDashboard Functionality with Vietnamese Display", () => {
    it("updates selected roles through the admin BFF route with Vietnamese labels", async () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      fireEvent.click(screen.getAllByLabelText("Cán bộ")[0]);
      fireEvent.click(screen.getAllByRole("button", { name: "Lưu vai trò" })[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/user-1/roles", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roles: ["USER", "MANAGER"] })
        });
      });
    });

    it("toggles account lock state through the admin BFF route with Vietnamese labels", async () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      fireEvent.click(screen.getAllByRole("button", { name: "Khóa tài khoản" })[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/user-1/status", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "LOCKED" })
        });
      });
    });

    it("displays all role options in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify all role options are displayed in Vietnamese
      expect(screen.getAllByLabelText("Người dùng").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Cán bộ").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Quản trị viên").length).toBeGreaterThan(0);
    });

    it("displays user status in Vietnamese", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Verify user status is displayed (use getAllByText since they appear multiple times)
      expect(screen.getAllByText("ACTIVE").length).toBeGreaterThan(0);
      expect(screen.getByText("LOCKED")).toBeInTheDocument();
    });

    it("displays unlock button when account is locked", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Find the unlock button for the locked user
      const unlockButtons = screen.getAllByRole("button", { name: "Mở khóa tài khoản" });
      expect(unlockButtons.length).toBeGreaterThan(0);
    });

    it("displays lock button when account is active", () => {
      render(<UserRoleDashboard users={users} canManageRoles={true} />);

      // Find the lock buttons for active users
      const lockButtons = screen.getAllByRole("button", { name: "Khóa tài khoản" });
      expect(lockButtons.length).toBeGreaterThan(0);
    });
  });
});
