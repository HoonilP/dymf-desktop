import { getDb } from "./database";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
    [key, value]
  );
}

export async function getAwsConfig(): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
} | null> {
  const accessKeyId = await getSetting("aws_access_key_id");
  const secretAccessKey = await getSetting("aws_secret_access_key");
  const region = await getSetting("aws_region");
  const bucketName = await getSetting("aws_s3_bucket_name");

  if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
    return null;
  }

  return { accessKeyId, secretAccessKey, region, bucketName };
}
