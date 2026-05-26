import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AssetImportExportClient from "./AssetImportExportClient";

function csvFile(content) {
  const file = new File([content], "assets.csv", { type: "text/csv" });
  file.text = jest.fn().mockResolvedValue(content);
  return file;
}

describe("AssetImportExportClient", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imported: 1, skipped: 0, failedRows: [] }),
    });
  });

  it("shows import/export controls with permission-aware states", () => {
    render(<AssetImportExportClient initialFilters={{}} canImport={false} canExport={false} />);

    expect(screen.getByRole("button", { name: /nhập csv/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /xuất csv/i })).toBeDisabled();
    expect(screen.getByText(/Cần có quyền nhập tài sản và quản lý để thực hiện/i)).toBeInTheDocument();
    expect(screen.getByText(/cần có quyền xuất dữ liệu để thực hiện/i)).toBeInTheDocument();
  });

  it("previews CSV rows and confirms only valid rows", async () => {
    render(<AssetImportExportClient initialFilters={{}} canImport canExport />);

    fireEvent.change(screen.getByLabelText("CSV file"), {
      target: {
        files: [
          csvFile("code,name,centroidLat,centroidLng\nDN-001,Asset,16.07,108.22\nDN-002,,16,108"),
        ],
      },
    });

    expect(await screen.findByText("DN-001")).toBeInTheDocument();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /xác nhận nhập/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/properties/import/assets",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("DN-001"),
        }),
      );
    });
    expect(global.fetch.mock.calls[0][1].body).not.toContain("DN-002");
    expect(await screen.findByText(/đã nhập 1 dòng/i)).toBeInTheDocument();
  });
});
