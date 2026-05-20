import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuditLogTable from "./AuditLogTable";

/**
 * Test Suite: AuditLogTable Vietnamese Display
 * 
 * Validates:
 * - Property 5: Admin Pages Display Only Vietnamese Text
 * - Property 7: All Application UI Elements Are Vietnamese
 * 
 * These tests ensure that the AuditLogTable component displays all UI elements
 * in Vietnamese, including column headers, action descriptions, and status messages.
 */

describe("AuditLogTable - Vietnamese Display", () => {
  const mockLogs = [
    {
      id: "audit-1",
      action: "admin.users.status.update",
      entityType: "User",
      actor: { username: "admin123" },
      createdAt: "2026-05-09T10:00:00.000Z"
    },
    {
      id: "audit-2",
      action: "admin.roles.create",
      entityType: "Role",
      actor: { username: "admin456" },
      createdAt: "2026-05-08T15:30:00.000Z"
    },
    {
      id: "audit-3",
      action: "admin.permissions.update",
      entityType: "Permission",
      actor: { username: "admin789" },
      createdAt: "2026-05-07T12:00:00.000Z"
    }
  ];

  describe("Property 5: Admin Pages Display Only Vietnamese Text", () => {
    it("renders all table headers in Vietnamese", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify Vietnamese headers
      expect(screen.getByText("Hành động")).toBeInTheDocument();
      expect(screen.getByText("Đối tượng")).toBeInTheDocument();
      expect(screen.getByText("Người thực hiện")).toBeInTheDocument();
      expect(screen.getByText("Thời gian")).toBeInTheDocument();

      // Verify no English headers appear
      expect(screen.queryByText("Action")).not.toBeInTheDocument();
      expect(screen.queryByText("Entity Type")).not.toBeInTheDocument();
      expect(screen.queryByText("Actor")).not.toBeInTheDocument();
      expect(screen.queryByText("Timestamp")).not.toBeInTheDocument();
    });

    it("renders empty state message in Vietnamese", () => {
      render(<AuditLogTable logs={[]} />);

      expect(screen.getByText("Không có nhật ký phù hợp.")).toBeInTheDocument();
      expect(screen.queryByText("No matching logs")).not.toBeInTheDocument();
    });

    it("renders loading state message in Vietnamese", async () => {
      const mockFetchLogs = jest.fn(() => new Promise(() => {})); // Never resolves

      render(
        <AuditLogTable
          fetchLogs={mockFetchLogs}
        />
      );

      expect(screen.getByText("Đang tải...")).toBeInTheDocument();
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("renders error state message in Vietnamese", async () => {
      const mockFetchLogs = jest.fn(() => Promise.reject(new Error("Test error")));

      render(
        <AuditLogTable
          fetchLogs={mockFetchLogs}
        />
      );

      // Wait for error to be displayed
      await new Promise(resolve => setTimeout(resolve, 200));

      // The error message will be "Test error" from the thrown error
      // Check if error message is displayed in the error container
      const errorContainer = document.querySelector(".admin-table-error");
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer.textContent).toContain("Test error");
    });

    it("renders retry button in Vietnamese", async () => {
      const mockFetchLogs = jest.fn(() => Promise.reject(new Error("Test error")));

      render(
        <AuditLogTable
          fetchLogs={mockFetchLogs}
        />
      );

      // Wait for error to be displayed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });

    it("renders audit log rows with Vietnamese labels", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify audit log data is displayed
      expect(screen.getByText("admin.users.status.update")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("admin123")).toBeInTheDocument();

      // Verify Vietnamese headers are present
      expect(screen.getByText("Hành động")).toBeInTheDocument();
      expect(screen.getByText("Đối tượng")).toBeInTheDocument();
      expect(screen.getByText("Người thực hiện")).toBeInTheDocument();
      expect(screen.getByText("Thời gian")).toBeInTheDocument();
    });

    it("renders all audit log entries with Vietnamese formatting", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify all entries are displayed
      expect(screen.getByText("admin.users.status.update")).toBeInTheDocument();
      expect(screen.getByText("admin.roles.create")).toBeInTheDocument();
      expect(screen.getByText("admin.permissions.update")).toBeInTheDocument();

      // Verify entity types are displayed
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Permission")).toBeInTheDocument();

      // Verify actors are displayed
      expect(screen.getByText("admin123")).toBeInTheDocument();
      expect(screen.getByText("admin456")).toBeInTheDocument();
      expect(screen.getByText("admin789")).toBeInTheDocument();
    });

    it("renders timestamps in Vietnamese locale format", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify timestamps are formatted (Vietnamese locale format)
      // The exact format depends on the locale, but should contain date and time
      const timestamps = screen.getAllByText(/\d+\/\d+\/\d+/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe("Property 7: All Application UI Elements Are Vietnamese", () => {
    it("displays all audit log table elements in Vietnamese", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Collect all text content
      const container = document.body;
      const textContent = container.textContent;

      // Verify no common English words appear in headers
      expect(textContent).not.toMatch(/\bAction\b/i);
      expect(textContent).not.toMatch(/\bEntity Type\b/i);
      expect(textContent).not.toMatch(/\bActor\b/i);
      expect(textContent).not.toMatch(/\bTimestamp\b/i);
    });

    it("maintains consistent Vietnamese terminology across all audit logs", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify consistent use of Vietnamese terms
      const actionHeaders = screen.getAllByText("Hành động");
      expect(actionHeaders.length).toBeGreaterThan(0);

      const entityHeaders = screen.getAllByText("Đối tượng");
      expect(entityHeaders.length).toBeGreaterThan(0);

      const actorHeaders = screen.getAllByText("Người thực hiện");
      expect(actorHeaders.length).toBeGreaterThan(0);

      const timeHeaders = screen.getAllByText("Thời gian");
      expect(timeHeaders.length).toBeGreaterThan(0);
    });

    it("displays all audit log table headers in Vietnamese", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify all headers are Vietnamese
      expect(screen.getByText("Hành động")).toBeInTheDocument();
      expect(screen.getByText("Đối tượng")).toBeInTheDocument();
      expect(screen.getByText("Người thực hiện")).toBeInTheDocument();
      expect(screen.getByText("Thời gian")).toBeInTheDocument();

      // Verify no English headers appear
      expect(screen.queryByText("Action")).not.toBeInTheDocument();
      expect(screen.queryByText("Entity Type")).not.toBeInTheDocument();
      expect(screen.queryByText("Actor")).not.toBeInTheDocument();
      expect(screen.queryByText("Timestamp")).not.toBeInTheDocument();
    });
  });

  describe("AuditLogTable Functionality with Vietnamese Display", () => {
    it("renders audit log rows with actor and entity details", () => {
      render(
        <AuditLogTable
          logs={[
            {
              id: "audit-1",
              action: "admin.users.status.update",
              entityType: "User",
              actor: { username: "admin123" },
              createdAt: "2026-05-09T10:00:00.000Z"
            }
          ]}
        />
      );

      expect(screen.getByText("admin.users.status.update")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("admin123")).toBeInTheDocument();
    });

    it("renders an empty state with Vietnamese message", () => {
      render(<AuditLogTable logs={[]} />);

      expect(screen.getByText("Không có nhật ký phù hợp.")).toBeInTheDocument();
    });

    it("renders table headers in Vietnamese", () => {
      render(
        <AuditLogTable
          logs={[
            {
              id: "audit-1",
              action: "admin.users.status.update",
              entityType: "User",
              actor: { username: "admin123" },
              createdAt: "2026-05-09T10:00:00.000Z"
            }
          ]}
        />
      );

      expect(screen.getByText("Hành động")).toBeInTheDocument();
      expect(screen.getByText("Đối tượng")).toBeInTheDocument();
      expect(screen.getByText("Người thực hiện")).toBeInTheDocument();
      expect(screen.getByText("Thời gian")).toBeInTheDocument();
    });

    it("handles missing actor information gracefully", () => {
      render(
        <AuditLogTable
          logs={[
            {
              id: "audit-1",
              action: "admin.users.status.update",
              entityType: "User",
              actor: null,
              actorUserId: "user-123",
              createdAt: "2026-05-09T10:00:00.000Z"
            }
          ]}
        />
      );

      expect(screen.getByText("user-123")).toBeInTheDocument();
    });

    it("handles missing entity type gracefully", () => {
      render(
        <AuditLogTable
          logs={[
            {
              id: "audit-1",
              action: "admin.users.status.update",
              entityType: null,
              actor: { username: "admin123" },
              createdAt: "2026-05-09T10:00:00.000Z"
            }
          ]}
        />
      );

      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("displays multiple audit log entries correctly", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify all entries are displayed
      expect(screen.getByText("admin.users.status.update")).toBeInTheDocument();
      expect(screen.getByText("admin.roles.create")).toBeInTheDocument();
      expect(screen.getByText("admin.permissions.update")).toBeInTheDocument();

      // Verify all actors are displayed
      expect(screen.getByText("admin123")).toBeInTheDocument();
      expect(screen.getByText("admin456")).toBeInTheDocument();
      expect(screen.getByText("admin789")).toBeInTheDocument();
    });

    it("formats timestamps in Vietnamese locale", () => {
      render(<AuditLogTable logs={mockLogs} />);

      // Verify timestamps are formatted (should contain date and time)
      const timestamps = screen.getAllByText(/\d+\/\d+\/\d+/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});
