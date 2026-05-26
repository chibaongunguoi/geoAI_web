import { fireEvent, render, screen } from "@testing-library/react";

import MapExportDialog from "./MapExportDialog";
import { DEFAULT_EXPORT_METADATA } from "./map-export-state";

describe("MapExportDialog", () => {
  it("renders export options and triggers callbacks", () => {
    const handlers = {
      onMetadataChange: jest.fn(),
      onExportPng: jest.fn(),
      onExportPdf: jest.fn(),
      onShare: jest.fn(),
      onSaveTemplate: jest.fn(),
      onLoadTemplate: jest.fn(),
    };

    render(
      <MapExportDialog
        canExport
        canShare
        metadata={{ format: "png", orientation: "landscape" }}
        {...handlers}
      />
    );

    fireEvent.change(screen.getByLabelText(/Tiêu đề/i), { target: { value: "Quarterly map" } });
    fireEvent.change(screen.getByLabelText(/Định dạng/i), { target: { value: "pdf" } });

    fireEvent.click(screen.getByRole("button", { name: /Xuất png/i }));
    fireEvent.click(screen.getByRole("button", { name: /Xuất pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /sao chép liên kết chia sẻ/i }));
    fireEvent.click(screen.getByRole("button", { name: /lưu mẫu/i }));

    expect(handlers.onMetadataChange).toHaveBeenCalledWith(expect.objectContaining({ title: "Quarterly map" }));
    expect(handlers.onMetadataChange).toHaveBeenCalledWith(expect.objectContaining({ format: "pdf" }));
    expect(handlers.onExportPng).toHaveBeenCalled();
    expect(handlers.onExportPdf).toHaveBeenCalled();
    expect(handlers.onShare).toHaveBeenCalled();
    expect(handlers.onSaveTemplate).toHaveBeenCalled();
  });

  it("gates actions by export and share permissions", () => {
    const { rerender } = render(<MapExportDialog canExport={false} canShare={false} />);

    expect(screen.getByRole("button", { name: /Xuất png/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /sao chép liên kết chia sẻ/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /lưu mẫu/i })).toBeDisabled();

    rerender(<MapExportDialog canExport canShare />);
    expect(screen.getByRole("button", { name: /Xuất png/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /sao chép liên kết chia sẻ/i })).toBeEnabled();
  });
});
