jest.mock("next/server", () => ({
  NextResponse: {
    json: (data, init = {}) => ({
      status: init.status || 200,
      json: async () => data
    })
  }
}));

import { GET } from "./route";

describe("GET /api/map/assets", () => {
  it("returns viewport-filtered sample assets", async () => {
    const response = await GET(
      { url: "http://localhost/api/map/assets?bbox=108.1,16,108.3,16.2" }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("FeatureCollection");
    expect(data.features.map((feature) => feature.properties.code)).toContain("DN-LGT-001");
  });

  it("rejects invalid bbox values", async () => {
    const response = await GET({ url: "http://localhost/api/map/assets?bbox=bad" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/bbox/);
  });
});
