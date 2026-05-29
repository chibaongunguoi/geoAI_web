import { PropertiesController } from "./properties.controller";

describe("PropertiesController", () => {
  it("requests a broad all-source heatmap by default for large building datasets", () => {
    const spatialService = {
      getBuildingHeatmap: jest.fn().mockReturnValue({ map: { type: "property-density", regions: [] } })
    };
    const controller = new PropertiesController({} as any, {} as any, spatialService as any, {} as any);

    controller.getBuildingHeatmap({});

    expect(spatialService.getBuildingHeatmap).toHaveBeenCalledWith({
      ward: undefined,
      district: undefined,
      source: "all",
      limit: 1800,
      gridSize: 0.0012
    });
  });
});
