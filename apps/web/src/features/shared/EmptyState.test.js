import { fireEvent, render, screen } from "@testing-library/react";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders message text", () => {
    render(<EmptyState message="Không có dữ liệu" />);
    expect(screen.getByText("Không có dữ liệu")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(<EmptyState icon={<span data-testid="icon">📋</span>} message="Trống" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("does not render icon container when icon is not provided", () => {
    const { container } = render(<EmptyState message="Trống" />);
    expect(container.querySelector(".empty-state-icon")).not.toBeInTheDocument();
  });

  it("renders action button when action prop is provided", () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        message="Chưa có tài sản"
        action={{ label: "Thêm mới", onClick }}
      />
    );

    const button = screen.getByRole("button", { name: "Thêm mới" });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render action button when action prop is not provided", () => {
    render(<EmptyState message="Trống" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has role=status for accessibility", () => {
    render(<EmptyState message="Không có kết quả" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
