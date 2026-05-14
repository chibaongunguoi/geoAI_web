import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FilterPanel from "./FilterPanel";

describe("FilterPanel", () => {
  it("renders controls and applies selected filters", () => {
    const onApply = jest.fn();
    render(
      <FilterPanel
        filters={{}}
        resultCount={12}
        canUseFilters
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByLabelText("Trạng thái"), {
      target: { value: "ACTIVE" }
    });
    fireEvent.change(screen.getByLabelText("Loại tài sản"), {
      target: { value: "building" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACTIVE",
        propertyType: "building"
      }),
      "filters.apply"
    );
    expect(screen.getByText("12 kết quả")).toBeInTheDocument();
  });

  it("resets, saves presets, loads presets, and exports", () => {
    const onApply = jest.fn();
    const onSavePreset = jest.fn();
    const onExport = jest.fn();
    render(
      <FilterPanel
        filters={{ status: "ACTIVE" }}
        presets={[{ name: "Active", filters: { status: "ACTIVE" } }]}
        canUseFilters
        onApply={onApply}
        onSavePreset={onSavePreset}
        onExport={onExport}
      />
    );

    fireEvent.change(screen.getByLabelText("Tên bộ lọc đã lưu"), {
      target: { value: "My preset" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bộ lọc" }));
    fireEvent.change(screen.getByLabelText("Dùng bộ lọc đã lưu"), {
      target: { value: "Active" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    fireEvent.click(screen.getByRole("button", { name: "Xuất dữ liệu đã lọc" }));

    expect(onSavePreset).toHaveBeenCalledWith("My preset", expect.any(Object));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" }),
      "filters.preset.load"
    );
    expect(onApply).toHaveBeenLastCalledWith(expect.any(Object), "filters.reset");
    expect(onExport).toHaveBeenCalled();
  });

  it("disables filter actions when permission is missing", () => {
    render(<FilterPanel filters={{}} canUseFilters={false} />);

    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeDisabled();
    expect(screen.getByText("Bạn không có quyền dùng bộ lọc.")).toBeInTheDocument();
  });
});
