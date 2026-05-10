import { fireEvent, render, screen } from "@testing-library/react";

import { SpatialDrawToolbar } from "./SpatialDrawToolbar";

const state = {
  mode: "line",
  coordinates: [
    { lat: 16, lng: 108 },
    { lat: 16.1, lng: 108.1 },
  ],
  selectedVertexIndex: 0,
  attributes: { name: "Route", type: "inspection", description: "Draft" },
  snapEnabled: true,
  hasUnsavedChanges: true,
  past: [{}],
  future: [{}],
};

describe("SpatialDrawToolbar", () => {
  it("renders draw/edit actions and dispatches toolbar events", () => {
    const handlers = {
      onModeChange: jest.fn(),
      onUndo: jest.fn(),
      onRedo: jest.fn(),
      onSaveDraft: jest.fn(),
      onCancel: jest.fn(),
      onExport: jest.fn(),
      onToggleSnap: jest.fn(),
      onAddCoordinate: jest.fn(),
      onUpdateCoordinate: jest.fn(),
      onDeleteVertex: jest.fn(),
      onSelectVertex: jest.fn(),
      onAttributesChange: jest.fn(),
      onDuplicateLatest: jest.fn(),
    };

    render(
      <SpatialDrawToolbar
        canDraw
        state={state}
        result={{ formattedType: "Line", error: null }}
        history={[]}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Point" }));
    fireEvent.click(screen.getByRole("button", { name: "Polygon" }));
    fireEvent.click(screen.getByRole("button", { name: /select\/edit/i }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: /export geojson/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /snap/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy latest/i }));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "16.2" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "108.2" } });
    fireEvent.click(screen.getByRole("button", { name: /add coordinate/i }));
    fireEvent.click(screen.getByRole("button", { name: /vertex 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(handlers.onModeChange).toHaveBeenCalledWith("point");
    expect(handlers.onModeChange).toHaveBeenCalledWith("polygon");
    expect(handlers.onModeChange).toHaveBeenCalledWith("edit");
    expect(handlers.onUndo).toHaveBeenCalled();
    expect(handlers.onRedo).toHaveBeenCalled();
    expect(handlers.onSaveDraft).toHaveBeenCalled();
    expect(handlers.onCancel).toHaveBeenCalled();
    expect(handlers.onExport).toHaveBeenCalled();
    expect(handlers.onToggleSnap).toHaveBeenCalledWith(false);
    expect(handlers.onDuplicateLatest).toHaveBeenCalled();
    expect(handlers.onAttributesChange).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated" }));
    expect(handlers.onAddCoordinate).toHaveBeenCalledWith({ lat: 16.2, lng: 108.2 });
    expect(handlers.onSelectVertex).toHaveBeenCalledWith(0);
    expect(handlers.onDeleteVertex).toHaveBeenCalledWith(0);
  });

  it("disables controls without draw permission", () => {
    render(
      <SpatialDrawToolbar
        canDraw={false}
        state={{ ...state, coordinates: [] }}
        result={{ error: "Permission required." }}
        history={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Point" })).toBeDisabled();
    expect(screen.getByText("Permission required.")).toBeInTheDocument();
  });
});
