import { uploadAssetFile } from "./asset-file-upload";

describe("uploadAssetFile", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uploads a dossier file through the API proxy and returns R2 metadata", async () => {
    const file = new File(["content"], "manual.pdf", { type: "application/pdf" });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fileUrl: "/upload/object?key=uploads%2Fmanual.pdf",
        objectKey: "uploads/manual.pdf",
      }),
    });

    await expect(uploadAssetFile(file)).resolves.toEqual({
      fileUrl: "/upload/object?key=uploads%2Fmanual.pdf",
      objectKey: "uploads/manual.pdf",
    });
    expect(fetch).toHaveBeenCalledWith("/api/upload", expect.objectContaining({
      method: "POST",
      body: expect.any(FormData),
    }));
  });

  it("returns empty metadata when a form has no file", async () => {
    await expect(uploadAssetFile(null)).resolves.toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });
});
