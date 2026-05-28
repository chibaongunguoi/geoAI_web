import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetDetailPanel from "./AssetDetailPanel";

const property = {
  id: "prop-1",
  code: "DN-BLD-001",
  name: "Tru so 1",
  addressLine: "01 Bach Dang",
  ward: "Hai Chau 1",
  district: "Hai Chau",
  status: "ACTIVE",
  propertyType: "building",
  areaSqm: 1250,
  centroidLat: 16.071,
  centroidLng: 108.22,
};

const auditLogs = [
  {
    id: "audit-1",
    action: "properties.update",
    actor: { username: "admin" },
    createdAt: "2026-05-09T09:00:00.000Z",
  },
];

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ...property, status: "REVIEW" }),
  });
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
});

describe("AssetDetailPanel", () => {
  it("renders property details, map preview, and audit timeline", () => {
    render(<AssetDetailPanel property={property} auditLogs={auditLogs} canManageProperties />);

    expect(screen.getByText("DN-BLD-001")).toBeInTheDocument();
    expect(screen.getByText("01 Bach Dang")).toBeInTheDocument();
    expect(screen.getByText("1.250 m2")).toBeInTheDocument();
    expect(screen.getAllByText("16.071, 108.22")).toHaveLength(2);
    expect(screen.getByText("properties.update")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chỉnh sửa" })).toHaveAttribute(
      "href",
      "/assets/DN-BLD-001/edit",
    );
  });

  it("supports dossier tabs, status updates, local records, search, and export", async () => {
    render(<AssetDetailPanel property={property} auditLogs={auditLogs} canManageProperties />);

    expect(screen.getByRole("tab", { name: "Tổng quan" })).toHaveAttribute("aria-selected", "true");


    fireEvent.change(screen.getByLabelText("Trạng thái hiện tại"), { target: { value: "REVIEW" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu trạng thái" }));

    await waitFor(() => {
      expect(screen.getByText("Đã lưu trạng thái.")).toBeInTheDocument();
      expect(screen.getAllByText("REVIEW").length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByLabelText("Giá trị tài sản"), { target: { value: "15000000" } });
    fireEvent.change(screen.getByLabelText("Ghi chú định giá"), { target: { value: "Re-evaluated" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm giá trị" }));

    await waitFor(() => {
      expect(screen.getByText("15,000,000")).toBeInTheDocument();
      expect(screen.getByText("Re-evaluated")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Tài liệu" }));
    fireEvent.change(screen.getByLabelText("Tên tài liệu"), { target: { value: "Technical manual" } });
    fireEvent.change(screen.getByLabelText("Loại tài liệu"), { target: { value: "technical" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm tài liệu" }));
    expect(screen.getByText("Technical manual")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tải metadata" }));
    expect(screen.getByText("Nội dung chưa được lưu. Đã xuất metadata.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Kiểm tra" }));
    fireEvent.change(screen.getByLabelText("Ngày kiểm tra"), { target: { value: "2026-05-11" } });
    fireEvent.change(screen.getByLabelText("Kết quả kiểm tra"), { target: { value: "Needs repair" } });
    fireEvent.change(screen.getByLabelText("Ghi chú kiểm tra"), { target: { value: "Crack near entrance" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm kiểm tra" }));
    expect(screen.getByText("Needs repair")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Liên kết" }));
    fireEvent.change(screen.getByLabelText("Tên liên kết"), { target: { value: "Supplier ACME" } });
    fireEvent.change(screen.getByLabelText("Tham chiếu liên kết"), { target: { value: "Warranty-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm liên kết" }));
    expect(screen.getByText("Supplier ACME")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tìm kiếm hồ sơ"), { target: { value: "acme" } });
    expect(screen.getByText("Tìm thấy 1 kết quả.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử" }));
    expect(screen.getByText("Cập nhật tài sản")).toBeInTheDocument();
    expect(screen.getByText("Needs repair")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xuất JSON" }));
    expect(screen.getByText("Đã xuất hồ sơ dạng JSON.")).toBeInTheDocument();
  });

  it("disables forms if no manage properties permission", () => {
    render(<AssetDetailPanel property={property} auditLogs={[]} canManageProperties={false} />);

    expect(screen.queryByRole("link", { name: "Chỉnh sửa" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu trạng thái" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Tài liệu" }));
    expect(screen.getByRole("button", { name: "Thêm tài liệu" })).toBeDisabled();
  });
});
