import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getAwsConfig } from "./settings";

let cachedClient: S3Client | null = null;

export async function getS3Client(): Promise<S3Client> {
  if (cachedClient) return cachedClient;

  const config = await getAwsConfig();
  if (!config) {
    throw new Error(
      "AWS credentials are not configured. Please go to Settings (설정) and enter your AWS credentials."
    );
  }

  cachedClient = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

export function resetS3Client(): void {
  cachedClient = null;
}

export async function uploadImageToS3(
  fileBytes: Uint8Array,
  entity: "customer" | "guarantor" | "personal",
  extension: string
): Promise<string> {
  const client = await getS3Client();
  const config = await getAwsConfig();
  if (!config) {
    throw new Error("AWS credentials are not configured.");
  }

  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${extension}`;
  const key = `${entity}/${filename}`;

  const contentTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  const contentType = contentTypeMap[extension.toLowerCase()] || "application/octet-stream";

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: fileBytes,
        ACL: "public-read",
        ContentType: contentType,
      })
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { Code?: string })?.Code ?? "UNKNOWN";
    console.error(
      `S3 upload failed — bucket: ${config.bucketName}, key: ${key}, error: ${errorCode} ${errorMessage}`
    );
    throw new Error(`S3 upload failed (${errorCode}): ${errorMessage}`);
  }

  return filename;
}

export async function getS3ImageUrl(
  entity: "customer" | "guarantor" | "personal",
  filename: string
): Promise<string | null> {
  if (!filename || filename === "empty") {
    return null;
  }

  const config = await getAwsConfig();
  if (!config) {
    return null;
  }

  return `http://${config.bucketName}.s3.${config.region}.amazonaws.com/${entity}/${filename}`;
}
