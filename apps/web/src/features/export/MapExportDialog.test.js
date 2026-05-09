import { fireEvent, render, screen } from "@testing-library/react";

import MapExportDialog from "./MapExportDialog";
import { DEFAULT_EXPORT_METADATA } from "./map-export-state";

describe("MapExportDialog", () => {
  it("renders metadata controls and dispatches export/share actions", () => {
    const handlers = {
      onMetadataChange: jest.fn(),
      onExportPng: jest.fn(),
      onExportPdf: jest.fn(),
      onShare: jest.fn(),
      onSaveTemplate: jest.fn(),
    };

    render(
      <MapExportDialog
        canExport
        canShare
        metadata={{ ...DEFAULT_EXPORT_METADATA, title: "Map export" }}
        history={[]}
        templates={[]}
        status="Ready"
        {...handlers}
      />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Quarterly map" } });
    fireEvent.change(screen.getByLabelText(/format/i), { target: { value: "pdf" } });
    fireEvent.click(screen.getByRole("button", { name: /export png/i }));
    fireEvent.click(screen.getByRole("button", { name: /export pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy share link/i }));
    fireEvent.click(screen.getByRole("button", { name: /save template/i }));

    expect(handlers.onMetadataChange).toHaveBeenCalledWith(expect.objectContaining({ title: "Quarterly map" }));
    expect(handlers.onMetadataChange).toHaveBeenCalledWith(expect.objectContaining({ format: "pdf" }));
    expect(handlers.onExportPng).toHaveBeenCalled();
    expect(handlers.onExportPdf).toHaveBeenCalled();
    expect(handlers.onShare).toHaveBeenCalled();
    expect(handlers.onSaveTemplate).toHaveBeenCalled();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("gates actions by export and share permissions", () => {
    render(
      <MapExportDialog
        canExport={false}
        canShare={false}
        metadata={DEFAULT_EXPORT_METADATA}
        history={[]}
        templates={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /export png/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export pdf/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /copy share link/i })).toBeDisabled();
  });
});
