import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { extname } from "path";
import { randomUUID } from "crypto";
import { Readable } from "stream";

export type UploadedObject = {
  bucket: string;
  objectKey: string;
  imageUrl: string;
  fileUrl: string;
  originalName: string;
  contentType: string;
  size: number;
};

function stripVietnamese(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

function safeBaseName(filename: string) {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  const slug = stripVietnamese(withoutExt)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "upload";
}

@Injectable()
export class R2StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.required("R2_ACCOUNT_ID");
    const accessKeyId = this.required("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.required("R2_SECRET_ACCESS_KEY");
    this.bucket = this.required("R2_BUCKET");
    const endpoint = this.config.get<string>("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadedObject> {
    if (!file?.buffer) {
      throw new BadRequestException("No file uploaded");
    }

    const objectKey = this.objectKey(file.originalname || "upload");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
        ContentLength: file.size,
      }),
    );

    const fileUrl = `/upload/object?key=${encodeURIComponent(objectKey)}`;

    return {
      bucket: this.bucket,
      objectKey,
      imageUrl: fileUrl,
      fileUrl,
      originalName: file.originalname,
      contentType: file.mimetype || "application/octet-stream",
      size: file.size,
    };
  }

  async getObject(objectKey: string) {
    const key = String(objectKey || "").trim();
    if (!key || key.includes("..")) {
      throw new BadRequestException("Invalid object key");
    }

    try {
      const object = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        body: object.Body as Readable,
        contentType: object.ContentType || "application/octet-stream",
        contentLength: object.ContentLength,
      };
    } catch {
      throw new InternalServerErrorException("Unable to read uploaded file");
    }
  }

  private objectKey(filename: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const ext = extname(filename).toLowerCase();
    return `uploads/${year}/${month}/${safeBaseName(filename)}-${randomUUID()}${ext}`;
  }

  private required(key: string) {
    const value = this.config.get<string>(key) || process.env[key];
    if (!value) {
      throw new Error(`${key} is required for R2 uploads`);
    }
    return value;
  }
}
