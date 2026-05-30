jest.mock("next/server", () => ({
  NextResponse: {
    json: (data, init = {}) => ({
      status: init.status || 200,
      json: async () => data
    })
  }
}));

jest.mock("../../../../src/lib/redis", () => ({
  getCache: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue()
}));

import { GET } from "./route";

describe("GET /api/map/assets", () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "asset-1",
            code: "DN-LGT-001",
            centroidLat: 16.1,
            centroidLng: 108.2
          }
        ]
      })
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("returns viewport-filtered sample assets", async () => {
    const response = await GET(
      { url: "http://localhost/api/map/assets?bbox=108.1,16,108.3,16.2", headers: { get: () => null } }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("FeatureCollection");
    expect(data.features.map((feature) => feature.properties.code)).toContain("DN-LGT-001");
  });

  it("rejects invalid bbox values", async () => {
    const response = await GET({ url: "http://localhost/api/map/assets?bbox=bad", headers: { get: () => null } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/bbox/);
  });
});
