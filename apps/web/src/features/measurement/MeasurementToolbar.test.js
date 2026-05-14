import { fireEvent, render, screen } from "@testing-library/react";

import { MEASUREMENT_LABELS } from "../../test-utils/vn-labels";
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

    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.distance }));
    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.area }));
    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.undo }));
    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.clear }));
    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.copy }));
    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.save }));
    fireEvent.click(screen.getByRole("button", { name: MEASUREMENT_LABELS.exportJson }));
    fireEvent.click(screen.getByRole("checkbox", { name: MEASUREMENT_LABELS.snap }));

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
    // The toolbar renders `result.error` via the shared `measurement-alert`
    // paragraph, so the test keeps the same string the UI will display.
    const permissionMessage = "Bạn không có quyền sử dụng công cụ đo.";

    render(
      <MeasurementToolbar
        canMeasure={false}
        state={baseState}
        result={{ error: permissionMessage }}
        history={[]}
        onModeChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: MEASUREMENT_LABELS.distance })).toBeDisabled();
    expect(screen.getByText(permissionMessage)).toBeInTheDocument();
  });

  it("renders duplicate history timestamps without duplicate React keys", () => {
    const duplicateHistory = [
      { createdAt: "2026-05-11T13:38:36.798Z", action: "start" },
      { createdAt: "2026-05-11T13:38:36.798Z", action: "start" },
    ];

    render(
      <MeasurementToolbar
        canMeasure
        state={baseState}
        result={{ formattedValue: "No measurement" }}
        history={duplicateHistory}
      />,
    );

    expect(screen.getAllByText("start")).toHaveLength(2);
  });
});
