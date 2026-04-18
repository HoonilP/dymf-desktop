import { open } from "@tauri-apps/plugin-dialog";
import { copyFile, exists, mkdir, readFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join, basename, extname } from "@tauri-apps/api/path";
import { uploadImageToS3 } from "./s3";

const FILES_DIR = "files";

/**
 * Show a native file picker, copy the selected file to app data directory,
 * and return the relative filename. Returns null if the user cancels.
 */
export async function pickAndSaveFile(): Promise<string | null> {
  const selected = await open({ multiple: false });
  if (!selected) return null;

  const dataDir = await appDataDir();
  const targetDir = await join(dataDir, FILES_DIR);

  // Ensure target directory exists
  if (!(await exists(targetDir))) {
    await mkdir(targetDir, { recursive: true });
  }

  const filename = await basename(selected);
  const targetPath = await join(targetDir, filename);

  await copyFile(selected, targetPath);

  return filename;
}

/**
 * Resolve a filename to its absolute path in the app data files directory.
 */
export async function getFilePath(filename: string): Promise<string> {
  const dataDir = await appDataDir();
  return join(dataDir, FILES_DIR, filename);
}

/**
 * Check if a file exists at the given path.
 */
export async function fileExists(path: string): Promise<boolean> {
  return exists(path);
}

/**
 * Open a native file picker for images, upload the selected file to S3,
 * and return the S3 filename (uuid.ext). Returns null if user cancels or on error.
 */
export async function pickAndUploadToS3(
  entity: "customer" | "guarantor" | "personal"
): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Images",
          extensions: ["jpg", "jpeg", "png", "gif", "webp"],
        },
      ],
    });
    if (!selected) return null;

    const fileBytes = await readFile(selected);
    let ext: string;
    try {
      ext = (await extname(selected)).toLowerCase();
    } catch {
      ext = "jpg";
    }
    if (!ext) ext = "jpg";

    const filename = await uploadImageToS3(fileBytes, entity, ext);
    return filename;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`S3 image upload failed for ${entity}: ${message}`);
    alert(`이미지 업로드에 실패했습니다: ${message}`);
    return null;
  }
}
