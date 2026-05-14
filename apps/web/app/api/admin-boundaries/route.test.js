jest.mock("next/server", () => ({
  NextResponse: {
    json: (data, init = {}) => ({ status: init.status || 200, json: async () => data })
  }
}));

import { GET } from "./route";

describe("GET /api/admin-boundaries", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("forwards boundary payloads from the GeoAI backend", async () => {
    global.fetch = jest.fn(async () => ({
      status: 200,
      json: async () => ({ type: "FeatureCollection", features: [] })
    }));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("FeatureCollection");
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/admin-boundaries", { cache: "no-store" });
  });

  it("returns a controlled 503 when the GeoAI backend is unavailable", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("connect refused");
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.success).toBe(false);
  });
});
