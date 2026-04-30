import { fireEvent, render, screen } from "@testing-library/react";
import LayerPanel from "./LayerPanel";
import { DATA_LAYERS, createDefaultLayerState, selectLayerVisibility } from "./layers";

function layerById(id) {
  return DATA_LAYERS.find((layer) => layer.id === id);
}

function labelPattern(id) {
  return new RegExp(layerById(id).label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function escapedLayerLabel(id) {
  return layerById(id).label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function visibilityControl(id) {
  return screen.getByRole("radio", { name: labelPattern(id) });
}

function opacityControl(id) {
  return screen.getByRole("slider", { name: labelPattern(id) });
}

function refreshButton(id) {
  return screen.getByRole("button", { name: new RegExp(`Tải.*${escapedLayerLabel(id)}`) });
}

function moveUpButton(id) {
  return screen.getByRole("button", { name: new RegExp(`${escapedLayerLabel(id)}.*lên`) });
}

describe("LayerPanel", () => {
  it("lists layers and calls visibility, opacity, order, and refresh actions", () => {
    const onToggle = jest.fn();
    const onToggleGroup = jest.fn();
    const onOpacityChange = jest.fn();
    const onMove = jest.fn();
    const onReorder = jest.fn();
    const onRefresh = jest.fn();

    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={createDefaultLayerState(DATA_LAYERS)}
        onToggle={onToggle}
        onToggleGroup={onToggleGroup}
        onOpacityChange={onOpacityChange}
        onMove={onMove}
        onReorder={onReorder}
        onRefresh={onRefresh}
        layerStatuses={{ "sample-assets": { state: "ready", message: "Ready" } }}
      />
    );

    const assetVisibility = visibilityControl("sample-assets");

    expect(assetVisibility).toHaveAttribute("type", "radio");

    fireEvent.click(assetVisibility);
    fireEvent.change(opacityControl("sample-assets"), {
      target: { value: "45" }
    });
    fireEvent.click(moveUpButton("sample-assets"));
    fireEvent.click(refreshButton("sample-assets"));

    expect(onToggle).toHaveBeenCalledWith("sample-assets");
    expect(onOpacityChange).toHaveBeenCalledWith("sample-assets", 0.45);
    expect(onMove).toHaveBeenCalledWith("sample-assets", -1);
    expect(onRefresh).toHaveBeenCalledWith("sample-assets");
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders layer errors from status objects", () => {
    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={selectLayerVisibility(createDefaultLayerState(DATA_LAYERS), "sample-assets")}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
        onRefresh={jest.fn()}
        layerStatuses={{
          "sample-assets": {
            state: "error",
            message: "GeoJSON response must be a Feature or FeatureCollection."
          }
        }}
      />
    );

    expect(
      screen.getByText("GeoJSON response must be a Feature or FeatureCollection.")
    ).toBeInTheDocument();
  });

  it("disables layer management controls when the user cannot manage layers", () => {
    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={createDefaultLayerState(DATA_LAYERS)}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
        onRefresh={jest.fn()}
        canManage={false}
      />
    );

    expect(visibilityControl("sample-assets")).toBeDisabled();
    expect(opacityControl("sample-assets")).toBeDisabled();
    expect(refreshButton("sample-assets")).toBeDisabled();
  });

  it("renders recent layer operation history and export action for managers", () => {
    const onExport = jest.fn();

    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={createDefaultLayerState(DATA_LAYERS)}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
        onRefresh={jest.fn()}
        canManage
        onExport={onExport}
        history={[
          {
            id: "log-1",
            action: "map.layers.config.update",
            createdAt: "2026-04-30T00:00:00.000Z"
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Xuất cấu hình lớp/ }));

    expect(onExport).toHaveBeenCalled();
    expect(screen.getByText("map.layers.config.update")).toBeInTheDocument();
  });

  it("renders visible layer error alerts", () => {
    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={selectLayerVisibility(createDefaultLayerState(DATA_LAYERS), "sample-assets")}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
        onRefresh={jest.fn()}
        layerStatuses={{
          "sample-assets": { state: "error", message: "KhÃ´ng táº£i Ä‘Æ°á»£c GeoJSON" }
        }}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("KhÃ´ng táº£i Ä‘Æ°á»£c GeoJSON");
  });

  it("selects groups and supports drag reorder", () => {
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
        onRefresh={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Tham chi/ }));
    fireEvent.dragStart(screen.getAllByText(layerById("analysis-results").label)[0].closest("article"));
    fireEvent.drop(screen.getAllByText(layerById("admin-boundaries").label)[0].closest("article"));

    expect(onToggleGroup).toHaveBeenCalledWith(expect.stringMatching(/Tham chi/), true);
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
        onRefresh={jest.fn()}
      />
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "runtime" }
    });

    expect(screen.getAllByText(layerById("analysis-results").label)[0]).toBeInTheDocument();
    expect(screen.queryByText(layerById("admin-boundaries").label)).not.toBeInTheDocument();
  });
});
