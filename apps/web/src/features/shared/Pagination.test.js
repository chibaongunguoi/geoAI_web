import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 100,
    pageSize: 20,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onPageChange.mockClear();
  });

  it("renders the correct page label", () => {
    render(<Pagination {...defaultProps} currentPage={2} />);
    expect(screen.getByText("Trang 2 / 5")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    expect(screen.getByLabelText("Trang trước")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    expect(screen.getByLabelText("Trang sau")).toBeDisabled();
  });

  it("enables both buttons on a middle page", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    expect(screen.getByLabelText("Trang trước")).not.toBeDisabled();
    expect(screen.getByLabelText("Trang sau")).not.toBeDisabled();
  });

  it("calls onPageChange with previous page when previous is clicked", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    fireEvent.click(screen.getByLabelText("Trang trước"));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page when next is clicked", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    fireEvent.click(screen.getByLabelText("Trang sau"));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(4);
  });

  it("uses default pageSize of 20 when not specified", () => {
    render(<Pagination currentPage={1} totalItems={45} onPageChange={jest.fn()} />);
    expect(screen.getByText("Trang 1 / 3")).toBeInTheDocument();
  });

  it("returns null when totalPages is 1 or less", () => {
    const { container } = render(
      <Pagination {...defaultProps} totalItems={20} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calculates totalPages correctly with non-even division", () => {
    render(<Pagination {...defaultProps} totalItems={21} />);
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();
  });

  it("renders with nav element and aria-label for accessibility", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByRole("navigation", { name: "Phân trang" })).toBeInTheDocument();
  });
});
