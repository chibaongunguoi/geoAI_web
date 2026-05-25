jest.mock("../../src/features/auth/api-proxy", () => ({
  proxyToApi: jest.fn(() => ({ ok: true }))
}));

const { proxyToApi } = require("../../src/features/auth/api-proxy");

beforeAll(() => {
  global.Response = {
    json: (data, init = {}) => ({ status: init.status || 200, json: async () => data })
  };
});

function request(url = "http://localhost/api/test?x=1", body = "payload") {
  return {
    url,
    json: jest.fn(async () => (typeof body === "string" ? JSON.parse(body) : body)),
    text: jest.fn(async () => (typeof body === "string" ? body : JSON.stringify(body))),
  };
}

describe("web API proxy routes", () => {
  beforeEach(() => {
    proxyToApi.mockClear();
  });

  it("proxies admin list routes with query strings", async () => {
    const audit = await import("./admin/audit-logs/route");
    const users = await import("./admin/users/route");
    const roles = await import("./admin/roles/route");
    const permissions = await import("./admin/permissions/route");

    await audit.GET(request("http://localhost/api/admin/audit-logs?entityType=User"));
    await users.GET(request("http://localhost/api/admin/users?search=admin"));
    await roles.GET(request());
    await permissions.GET(request());

    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/admin/audit-logs?entityType=User", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/admin/users?search=admin", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/admin/roles", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/admin/permissions", { method: "GET" });
  });

  it("validates and proxies auth routes", async () => {
    const login = await import("./auth/login/route");
    const register = await import("./auth/register/route");
    const me = await import("./auth/me/route");
    const refresh = await import("./auth/refresh/route");
    const logout = await import("./auth/logout/route");

    expect((await login.POST(request("http://localhost", { password: "x" }))).status).toBe(400);
    expect((await register.POST(request("http://localhost", { username: "u" }))).status).toBe(400);

    await login.POST(request("http://localhost", { identifier: "admin", password: "admin123" }));
    await register.POST(request("http://localhost", { username: "u", name: "User", password: "pass" }));
    await me.GET(request());
    await refresh.POST(request());
    await logout.POST(request());

    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/auth/login", expect.objectContaining({ method: "POST" }));
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/auth/register", expect.objectContaining({ method: "POST" }));
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/auth/me", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/auth/refresh", { method: "POST" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/auth/logout", { method: "POST" });
  });

  it("validates and proxies admin user mutation routes", async () => {
    const roles = await import("./admin/users/[id]/roles/route");
    const status = await import("./admin/users/[id]/status/route");

    expect((await roles.PATCH(request("http://localhost", { roles: "ADMIN" }), { params: Promise.resolve({ id: "u1" }) })).status).toBe(400);
    expect((await status.PATCH(request("http://localhost", { status: "BAD" }), { params: Promise.resolve({ id: "u1" }) })).status).toBe(400);

    await roles.PATCH(request("http://localhost", { roles: ["ADMIN"] }), { params: Promise.resolve({ id: "u1" }) });
    await status.PATCH(request("http://localhost", { status: "LOCKED" }), { params: Promise.resolve({ id: "u1" }) });

    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/admin/users/u1/roles", {
      method: "PATCH",
      body: JSON.stringify({ roles: ["ADMIN"] })
    });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/admin/users/u1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "LOCKED" })
    });
  });

  it("proxies map config/history/export routes", async () => {
    const assetConfig = await import("./map/assets/config/route");
    const assetHistory = await import("./map/assets/history/route");
    const assetExport = await import("./map/assets/export/route");
    const layerConfig = await import("./map/layers/config/route");
    const layerHistory = await import("./map/layers/history/route");
    const layerExport = await import("./map/layers/export/route");

    await assetConfig.GET(request());
    await assetConfig.PUT(request("http://localhost", '{"state":{}}'));
    await assetHistory.GET(request("http://localhost/api/map/assets/history?limit=5"));
    await assetExport.GET(request());
    await layerConfig.GET(request());
    await layerConfig.PUT(request("http://localhost", '{"state":{}}'));
    await layerHistory.GET(request("http://localhost/api/map/layers/history?limit=5"));
    await layerExport.GET(request());

    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/assets/config", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/assets/config", { method: "PUT", body: '{"state":{}}' });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/assets/history?limit=5", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/assets/export", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/layers/config", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/layers/config", { method: "PUT", body: '{"state":{}}' });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/layers/history?limit=5", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/map/layers/export", { method: "GET" });
  });

  it("proxies properties routes including dynamic and imports", async () => {
    const properties = await import("./properties/route");
    const property = await import("./properties/[id]/route");
    const heatmap = await import("./properties/heatmap/route");
    const suggestions = await import("./properties/suggestions/route");
    const overture = await import("./properties/import/overture/route");
    const assetsImport = await import("./properties/import/assets/route");

    await properties.GET(request("http://localhost/api/properties?query=DN"));
    await properties.POST(request("http://localhost", '{"code":"DN-1"}'));
    await property.GET(request(), { params: Promise.resolve({ id: "DN 1" }) });
    await property.PATCH(request("http://localhost", '{"name":"A"}'), { params: Promise.resolve({ id: "DN 1" }) });
    await property.DELETE(request(), { params: Promise.resolve({ id: "DN 1" }) });
    await heatmap.GET(request("http://localhost/api/properties/heatmap?district=Hai%20Chau"));
    await suggestions.GET(request("http://localhost/api/properties/suggestions?q=DN"));
    await overture.POST(request("http://localhost", '{"features":[]}'));
    await assetsImport.POST(request("http://localhost", '{"rows":[]}'));

    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties?query=DN", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties", { method: "POST", body: '{"code":"DN-1"}' });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/DN%201", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/DN%201", { method: "PATCH", body: '{"name":"A"}' });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/DN%201", { method: "DELETE" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/heatmap?district=Hai%20Chau", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/suggestions?q=DN", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/import/overture", { method: "POST", body: '{"features":[]}' });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/properties/import/assets", { method: "POST", body: '{"rows":[]}' });
  });

  it("proxies POI semantic search routes", async () => {
    const poiSearch = await import("./poi/search/route");
    const poiSemantic = await import("./poi/semantic-search/route");

    await poiSearch.GET(request("http://localhost/api/poi/search?q=cafe"));
    await poiSemantic.GET(request("http://localhost/api/poi/semantic-search?q=quan+ca+phe"));

    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/poi/search?q=cafe", { method: "GET" });
    expect(proxyToApi).toHaveBeenCalledWith(expect.anything(), "/poi/semantic-search?q=quan+ca+phe", { method: "GET" });
  });
});
