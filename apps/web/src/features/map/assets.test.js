import {
  ASSET_DISPLAY_STORAGE_KEY,
  assetMarkerStyle,
  clusterAssets,
  createDefaultAssetDisplayConfig,
  filterAssetsByBbox,
  popupFieldsForPermissions,
  readStoredAssetDisplayConfig
} from "./assets";

const assets = [
  {
    type: "Feature",
    properties: {
      code: "DN-LGT-001",
      name: "Street light cluster",
      status: "active",
      type: "lighting",
      priority: "normal"
    },
    geometry: { type: "Point", coordinates: [108.22, 16.06] }
  },
  {
    type: "Feature",
    properties: {
      code: "DN-RD-014",
      name: "Road segment marker",
      status: "maintenance",
      type: "road",
      priority: "high"
    },
    geometry: { type: "Point", coordinates: [108.4, 16.3] }
  }
];

describe("asset display helpers", () => {
  it("filters point assets to a bbox", () => {
    const filtered = filterAssetsByBbox(assets, [108.1, 16, 108.3, 16.2]);

    expect(filtered.map((feature) => feature.properties.code)).toEqual(["DN-LGT-001"]);
  });

  it("derives marker color and status metadata", () => {
    expect(assetMarkerStyle(assets[0], "type")).toMatchObject({
      color: "#f59e0b",
      statusClass: "active"
    });
    expect(assetMarkerStyle(assets[1], "priority")).toMatchObject({
      color: "#ef4444",
      statusClass: "maintenance"
    });
  });

  it("keeps role-gated popup fields out for regular users", () => {
    const fields = popupFieldsForPermissions(
      ["code", "name", "ownerUnit", "updatedAt"],
      []
    );

    expect(fields).toEqual(["code", "name", "updatedAt"]);
  });

  it("allows advanced popup fields for asset import/export users", () => {
    const fields = popupFieldsForPermissions(
      ["code", "ownerUnit"],
      ["assets.importExport"]
    );

    expect(fields).toEqual(["code", "ownerUnit"]);
  });

  it("sanitizes stored display config", () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(
        JSON.stringify({
          labelMode: "broken",
          colorMode: "priority",
          popupFields: ["code", "unknown", "ownerUnit"]
        })
      )
    };

    expect(readStoredAssetDisplayConfig(storage)).toEqual({
      labelMode: "off",
      colorMode: "priority",
      popupFields: ["code", "ownerUnit"]
    });
    expect(storage.getItem).toHaveBeenCalledWith(ASSET_DISPLAY_STORAGE_KEY);
  });

  it("clusters nearby assets at low zoom", () => {
    const clustered = clusterAssets(assets, 11);
    const unclustered = clusterAssets(assets, 15);

    expect(clustered[0]).toMatchObject({ kind: "cluster", count: 2 });
    expect(unclustered).toHaveLength(2);
    expect(createDefaultAssetDisplayConfig().popupFields).toContain("code");
  });
});
