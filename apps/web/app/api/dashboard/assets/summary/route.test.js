import { GET } from "./route";
import { proxyToApi } from "../../../../../src/features/auth/api-proxy";

jest.mock("../../../../../src/features/auth/api-proxy", () => ({
  proxyToApi: jest.fn(() => ({ ok: true }))
}));

describe("GET /api/dashboard/assets/summary", () => {
  it("proxies query params to the API dashboard endpoint", async () => {
    const response = await GET({ url: "https://geoai.test/api/dashboard/assets/summary?status=ACTIVE" });

    expect(response).toEqual({ ok: true });
    expect(proxyToApi).toHaveBeenCalledWith(
      expect.anything(),
      "/dashboard/assets/summary?status=ACTIVE",
      { method: "GET" }
    );
  });
});
