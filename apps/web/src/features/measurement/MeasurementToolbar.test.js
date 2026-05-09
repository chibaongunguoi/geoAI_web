import { fireEvent, render, screen } from "@testing-library/react";

import { MeasurementToolbar } from "./MeasurementToolbar";

const baseState = {
  mode: "idle",
  points: [],
  snapEnabled: true,
};

describe("MeasurementToolbar", () => {
  it("renders mode buttons and dispatches toolbar actions", () => {
    const handlers = {
      onModeChange: jest.fn(),
      onUndo: jest.fn(),
      onClear: jest.fn(),
      onCopy: jest.fn(),
      onSave: jest.fn(),
      onExport: jest.fn(),
      onToggleSnap: jest.fn(),
    };

    render(
      <MeasurementToolbar
        canMeasure
        state={{ ...baseState, mode: "distance", points: [{ lat: 10, lng: 106 }, { lat: 11, lng: 107 }] }}
        result={{ formattedValue: "155.94 km", error: null }}
        history={[]}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /distance/i }));
    fireEvent.click(screen.getByRole("button", { name: /area/i }));
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    fireEvent.click(screen.getByRole("button", { name: /export json/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /snap/i }));

    expect(handlers.onModeChange).toHaveBeenCalledWith("distance");
    expect(handlers.onModeChange).toHaveBeenCalledWith("area");
    expect(handlers.onUndo).toHaveBeenCalled();
    expect(handlers.onClear).toHaveBeenCalled();
    expect(handlers.onCopy).toHaveBeenCalled();
    expect(handlers.onSave).toHaveBeenCalled();
    expect(handlers.onExport).toHaveBeenCalled();
    expect(handlers.onToggleSnap).toHaveBeenCalled();
    expect(screen.getByText("155.94 km")).toBeInTheDocument();
  });

  it("disables controls without measurement permission", () => {
    render(
      <MeasurementToolbar
        canMeasure={false}
        state={baseState}
        result={{ error: "Permission required." }}
        history={[]}
        onModeChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /distance/i })).toBeDisabled();
    expect(screen.getByText("Permission required.")).toBeInTheDocument();
  });
});
