import { render, screen } from "@testing-library/react";
import Breadcrumb from "./Breadcrumb";

// Mock next/link to render a plain <a> tag for testing
jest.mock("next/link", () => {
  return function MockLink({ href, children, className }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

describe("Breadcrumb", () => {
  it("renders nothing when items array is empty", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders nothing when items prop is not provided", () => {
    const { container } = render(<Breadcrumb />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders a single item as plain text (current page)", () => {
    render(<Breadcrumb items={[{ label: "Trang chủ" }]} />);
    const current = screen.getByText("Trang chủ");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders linked items as <a> and last item as plain text", () => {
    const items = [
      { label: "Admin", href: "/admin" },
      { label: "Người dùng", href: "/admin/users" },
      { label: "Chi tiết" },
    ];
    render(<Breadcrumb items={items} />);

    const adminLink = screen.getByText("Admin");
    expect(adminLink.tagName).toBe("A");
    expect(adminLink).toHaveAttribute("href", "/admin");

    const usersLink = screen.getByText("Người dùng");
    expect(usersLink.tagName).toBe("A");
    expect(usersLink).toHaveAttribute("href", "/admin/users");

    const current = screen.getByText("Chi tiết");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders separators between linked items", () => {
    const items = [
      { label: "Admin", href: "/admin" },
      { label: "Người dùng" },
    ];
    const { container } = render(<Breadcrumb items={items} />);
    const separators = container.querySelectorAll(".breadcrumb__separator");
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("uses nav element with aria-label for accessibility", () => {
    const items = [{ label: "Home", href: "/" }, { label: "Page" }];
    render(<Breadcrumb items={items} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    const items = [
      { label: "Admin", href: "/admin" },
      { label: "Current" },
    ];
    const { container } = render(<Breadcrumb items={items} />);
    expect(container.querySelector(".breadcrumb")).toBeInTheDocument();
    expect(container.querySelector(".breadcrumb__list")).toBeInTheDocument();
    expect(container.querySelectorAll(".breadcrumb__item")).toHaveLength(2);
    expect(container.querySelector(".breadcrumb__link")).toBeInTheDocument();
    expect(container.querySelector(".breadcrumb__current")).toBeInTheDocument();
  });

  it("renders last item as plain text even if it has an href", () => {
    const items = [
      { label: "Admin", href: "/admin" },
      { label: "Current", href: "/admin/current" },
    ];
    render(<Breadcrumb items={items} />);
    const current = screen.getByText("Current");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });
});
