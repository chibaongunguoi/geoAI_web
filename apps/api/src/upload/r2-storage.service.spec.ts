import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import { R2StorageService } from "./r2-storage.service";

const send = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send })),
  PutObjectCommand: jest.fn((input) => ({ type: "PutObjectCommand", input })),
  GetObjectCommand: jest.fn((input) => ({ type: "GetObjectCommand", input })),
}));

describe("R2StorageService", () => {
  beforeEach(() => {
    send.mockReset();
  });

  function service(env: Record<string, string> = {}) {
    const defaults = {
      R2_ACCOUNT_ID: "account-id",
      R2_BUCKET: "bucketgeoai",
      R2_ACCESS_KEY_ID: "access-key",
      R2_SECRET_ACCESS_KEY: "secret-key",
    };
    return new R2StorageService({
      get: (key: string) => env[key] || defaults[key as keyof typeof defaults],
    } as ConfigService);
  }

  it("uploads a file to R2 and returns a backend-readable object URL", async () => {
    send.mockResolvedValueOnce({});
    const result = await service({
      R2_ACCOUNT_ID: "account-id",
      R2_BUCKET: "bucketgeoai",
      R2_ACCESS_KEY_ID: "access-key",
      R2_SECRET_ACCESS_KEY: "secret-key",
    }).uploadFile({
      originalname: "Ảnh kiểm tra.png",
      mimetype: "image/png",
      size: 12,
      buffer: Buffer.from("file"),
    } as Express.Multer.File);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: "bucketgeoai",
          ContentType: "image/png",
          Key: expect.stringMatching(/^uploads\/\d{4}\/\d{2}\/anh-kiem-tra-[a-f0-9-]+\.png$/),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        bucket: "bucketgeoai",
        imageUrl: expect.stringContaining("/upload/object?key=uploads%2F"),
        originalName: "Ảnh kiểm tra.png",
      }),
    );
  });

  it("rejects missing files before calling R2", async () => {
    await expect(service().uploadFile(undefined as unknown as Express.Multer.File)).rejects.toThrow(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });
});
