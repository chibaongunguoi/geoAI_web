import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuditLogTable from "./AuditLogTable";

describe("AuditLogTable", () => {
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

  it("renders an empty state", () => {
    render(<AuditLogTable logs={[]} />);

    expect(screen.getByText("Không có nhật ký phù hợp.")).toBeInTheDocument();
  });
});
