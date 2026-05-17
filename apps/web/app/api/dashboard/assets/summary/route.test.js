/**
 * @jest-environment node
 */
import { GET } from "./route";
import { proxyToApi } from "../../../../../src/features/auth/api-proxy";

jest.mock("../../../../../src/features/auth/api-proxy", () => ({
  proxyToApi: jest.fn()
}));

function makeRequest(search = "") {
  return { url: `http://localhost:3000/api/dashboard/assets/summary${search}` };
}

function makeOkResponse(data) {
  return {
    ok: true,
    json: async () => data
  };
}

describe("GET /api/dashboard/assets/summary", () => {
  beforeEach(() => {
    proxyToApi.mockReset();
  });

  it("returns X-Cache: MISS on first request", async () => {
    const mockData = { totals: { total: 100 } };
    proxyToApi.mockResolvedValue(makeOkResponse(mockData));

    const response = await GET(makeRequest("?district=miss_test"));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Cache")).toBe("MISS");
    const body = await response.json();
    expect(body).toEqual(mockData);
  });

  it("returns X-Cache: HIT on repeated request within 60s", async () => {
    const mockData = { totals: { total: 200 } };
    proxyToApi.mockResolvedValue(makeOkResponse(mockData));

    // First call - cache miss
    await GET(makeRequest("?district=hit_test"));

    // Second call - should be cache hit
    const response = await GET(makeRequest("?district=hit_test"));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Cache")).toBe("HIT");
    const body = await response.json();
    expect(body).toEqual(mockData);
    // proxyToApi should only be called once (first request)
    expect(proxyToApi).toHaveBeenCalledTimes(1);
  });

  it("uses different cache entries for different query strings", async () => {
    const data1 = { totals: { total: 10 } };
    const data2 = { totals: { total: 20 } };
    proxyToApi
      .mockResolvedValueOnce(makeOkResponse(data1))
      .mockResolvedValueOnce(makeOkResponse(data2));

    const res1 = await GET(makeRequest("?district=diff_test_1"));
    const res2 = await GET(makeRequest("?district=diff_test_2"));

    expect(res1.headers.get("X-Cache")).toBe("MISS");
    expect(res2.headers.get("X-Cache")).toBe("MISS");
    expect(proxyToApi).toHaveBeenCalledTimes(2);
  });

  it("passes through non-ok responses without caching", async () => {
    const errorResponse = { ok: false, status: 500 };
    proxyToApi.mockResolvedValue(errorResponse);

    const response = await GET(makeRequest("?district=error_test"));

    expect(response).toBe(errorResponse);
  });

  it("uses __empty__ as cache key when no query string", async () => {
    const mockData = { totals: { total: 50 } };
    proxyToApi.mockResolvedValue(makeOkResponse(mockData));

    // First call with no query
    await GET(makeRequest(""));

    // Second call with no query - should hit cache
    const response = await GET(makeRequest(""));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Cache")).toBe("HIT");
    expect(proxyToApi).toHaveBeenCalledTimes(1);
  });
});
