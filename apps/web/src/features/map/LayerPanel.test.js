import { fireEvent, render, screen } from "@testing-library/react";
import LayerPanel from "./LayerPanel";
import { createDefaultLayerState, selectLayerVisibility } from "./layers";
import DATA_LAYERS from "../../../public/data/layers.json";
import {
  LAYER_GROUP_LABELS,
  LAYER_HISTORY_LABELS,
} from "../../test-utils/vn-labels";

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
  return screen.getByRole("checkbox", { name: labelPattern(id) });
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
        layerStatuses={{ "analysis-results": { state: "ready", message: "Ready" } }}
      />
    );

    const assetVisibility = visibilityControl("analysis-results");

    expect(assetVisibility).toHaveAttribute("type", "checkbox");

    fireEvent.click(assetVisibility);
    fireEvent.change(opacityControl("analysis-results"), {
      target: { value: "45" }
    });
    fireEvent.click(moveUpButton("analysis-results"));
    fireEvent.click(refreshButton("analysis-results"));

    expect(onToggle).toHaveBeenCalledWith("analysis-results");
    expect(onOpacityChange).toHaveBeenCalledWith("analysis-results", 0.45);
    expect(onMove).toHaveBeenCalledWith("analysis-results", -1);
    expect(onRefresh).toHaveBeenCalledWith("analysis-results");
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders layer errors from status objects", () => {
    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={selectLayerVisibility(createDefaultLayerState(DATA_LAYERS), "analysis-results")}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
        onRefresh={jest.fn()}
        layerStatuses={{
          "analysis-results": {
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
        canToggle={false}
        canManage={false}
      />
    );

    expect(visibilityControl("analysis-results")).toBeDisabled();
    expect(opacityControl("analysis-results")).toBeDisabled();
    expect(refreshButton("analysis-results")).toBeDisabled();
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
    expect(
      screen.getByText(LAYER_HISTORY_LABELS["map.layers.config.update"])
    ).toBeInTheDocument();
  });

  it("renders visible layer error alerts", () => {
    render(
      <LayerPanel
        layers={DATA_LAYERS}
        state={selectLayerVisibility(createDefaultLayerState(DATA_LAYERS), "analysis-results")}
        onToggle={jest.fn()}
        onToggleGroup={jest.fn()}
        onOpacityChange={jest.fn()}
        onMove={jest.fn()}
        onReorder={jest.fn()}
        onRefresh={jest.fn()}
        layerStatuses={{
          "analysis-results": { state: "error", message: "Không tải được GeoJSON" }
        }}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Không tải được GeoJSON");
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

    const geoaiGroup = layerById("analysis-results").group;
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(geoaiGroup) })[0]);
    fireEvent.dragStart(screen.getAllByText(layerById("analysis-results").label)[0].closest("article"));
    fireEvent.drop(screen.getAllByText(layerById("admin-boundaries").label)[0].closest("article"));

    expect(onToggleGroup).toHaveBeenCalledWith(geoaiGroup, expect.any(Boolean));
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
