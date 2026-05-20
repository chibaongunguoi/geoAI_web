import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  const statuses = ["active", "inactive", "maintenance", "review"];
  const expectedLabels = {
    active: "Hoạt động",
    inactive: "Ngừng",
    maintenance: "Bảo trì",
    review: "Xem xét",
  };

  it.each(statuses)("renders badge for status '%s' with correct label", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
  });

  it.each(statuses)("applies correct CSS class for status '%s'", (status) => {
    const { container } = render(<StatusBadge status={status} />);
    const badge = container.querySelector(".status-badge");
    expect(badge).toHaveClass(`status-badge--${status}`);
  });

  it("renders all four statuses with distinct class modifiers", () => {
    const classes = statuses.map((status) => {
      const { container } = render(<StatusBadge status={status} />);
      return container.querySelector(".status-badge").className;
    });
    const uniqueClasses = new Set(classes);
    expect(uniqueClasses.size).toBe(4);
  });

  it("sets aria-label to the Vietnamese status label", () => {
    render(<StatusBadge status="maintenance" />);
    expect(screen.getByLabelText("Bảo trì")).toBeInTheDocument();
  });

  it("falls back to raw status string for unknown status", () => {
    render(<StatusBadge status="unknown" />);
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
