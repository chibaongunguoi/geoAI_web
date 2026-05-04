import { fireEvent, render, screen } from "@testing-library/react";
import LayerPanel from "./LayerPanel";
import { DATA_LAYERS, createDefaultLayerState } from "./layers";

describe("LayerPanel", () => {
  it("lists layers and calls visibility, opacity, and order actions", () => {
    const onToggle = jest.fn();
    const onToggleGroup = jest.fn();
    const onOpacityChange = jest.fn();
    const onMove = jest.fn();
    const onReorder = jest.fn();

    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={createDefaultLayerState(DATA_LAYERS)}
        onToggle={onToggle}
        onToggleGroup={onToggleGroup}
        onOpacityChange={onOpacityChange}
        onMove={onMove}
        onReorder={onReorder}
      />
    );

    fireEvent.click(screen.getByLabelText("Hiển thị Tài sản mẫu"));
    fireEvent.change(screen.getByLabelText("Độ mờ Tài sản mẫu"), {
      target: { value: "45" }
    });
    fireEvent.click(screen.getByLabelText("Đưa Tài sản mẫu lên"));

    expect(onToggle).toHaveBeenCalledWith("sample-assets");
    expect(onOpacityChange).toHaveBeenCalledWith("sample-assets", 0.45);
    expect(onMove).toHaveBeenCalledWith("sample-assets", -1);
  });

  it("toggles groups and supports drag reorder", () => {
    const onToggleGroup = jest.fn();
    const onReorder = jest.fn();

    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={createDefaultLayerState(DATA_LAYERS)}
        onToggle={jest.fn()}
        onToggleGroup={onToggleGroup}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={onReorder}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Tham chi/ }));
    fireEvent.dragStart(screen.getByText("Kết quả AI").closest("article"));
    fireEvent.drop(screen.getByText("Ranh giới hành chính").closest("article"));

    expect(onToggleGroup).toHaveBeenCalledWith("Tham chiếu", false);
    expect(onReorder).toHaveBeenCalledWith("analysis-results", "admin-boundaries");
  });

  it("filters the layer list by search query", () => {
    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={createDefaultLayerState(DATA_LAYERS)}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Tìm lớp"), {
      target: { value: "runtime" }
    });

    expect(screen.getByText("Kết quả AI")).toBeInTheDocument();
    expect(screen.queryByText("Ranh giới hành chính")).not.toBeInTheDocument();
  });
});
