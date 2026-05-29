import { GroqService } from "./groq.service";

describe("GroqService property query parser", () => {
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.GROQ_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("does not call Groq when GROQ_API_KEY is not configured", async () => {
    delete process.env.GROQ_API_KEY;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const service = new GroqService();
    const parsed = await service.parsePropertyQuery("Tìm khách sạn gần Nhat Minh Academy");

    expect(parsed).toEqual({ intent: "unknown" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses Groq JSON into the unified property query intent", async () => {
    process.env.GROQ_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "relational_spatial",
                targetCategory: "hotel",
                referenceName: "Nhat Minh Academy",
                distanceMeters: 500,
                district: "Hải Châu",
                searchTerms: ["khach san"]
              })
            }
          }
        ]
      })
    }) as any;

    const service = new GroqService();
    const parsed = await service.parsePropertyQuery("Tìm khách sạn gần Nhat Minh Academy");

    expect(parsed).toEqual(
      expect.objectContaining({
        intent: "relational_spatial",
        targetCategory: "hotel",
        referenceName: "Nhat Minh Academy",
        distanceMeters: 500,
        district: "Hải Châu",
        searchTerms: ["khach san"]
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key"
        })
      })
    );
  });
});
