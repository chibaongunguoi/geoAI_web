jest.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: {
    json: (data, init = {}) => ({ status: init.status || 200, json: async () => data })
  }
}));

import { POST } from "./route";

function requestWithForm(entries) {
  return {
    signal: undefined,
    formData: jest.fn(async () => ({
      get: (key) => entries[key] || null
    }))
  };
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects requests without an image", async () => {
    const response = await POST(requestWithForm({ bbox: "108,16,109,17" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/h/);
  });

  it("forwards images to the GeoAI backend and returns normalized results", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ label: "building" }] })
    }));
    const image = {
      arrayBuffer: jest.fn(async () => new Uint8Array([1, 2, 3]).buffer)
    };

    const response = await POST(requestWithForm({
      image,
      bbox: "108,16,109,17",
      scanTypes: "building",
      adminArea: "Da Nang",
      scanMode: "fast"
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, results: [{ label: "building" }] });
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:5000/analyze", expect.objectContaining({ method: "POST" }));
  });

  it("returns 503 when the GeoAI backend cannot be reached", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("fetch failed");
    });
    const image = {
      arrayBuffer: jest.fn(async () => new Uint8Array([1]).buffer)
    };

    const response = await POST(requestWithForm({ image, bbox: "108,16,109,17" }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toMatch(/GeoAI backend/);
  });
});
