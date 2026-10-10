import fs from "node:fs";
import path from "node:path";
import { ApiError } from "../../common/api-error";
import { env } from "../../config/env";

export const uploadsRoot = path.resolve(env.UPLOADS_DIR);
const machinesDir = path.join(uploadsRoot, "machines");
const PUBLIC_PREFIX = "/uploads/machines/";

export const ensureUploadsDir = (): void => {
  fs.mkdirSync(machinesDir, { recursive: true });
};

/** Detects the real image type from magic bytes (the client-sent mimetype is not trusted). */
export const detectImageExtension = (buffer: Buffer): "jpg" | "png" | "webp" | undefined => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return "png";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  return undefined;
};

/** Writes the image to disk and returns its public path, e.g. /uploads/machines/12-1712345.webp. */
export const saveMachineImage = (machineId: number, buffer: Buffer): string => {
  const extension = detectImageExtension(buffer);
  if (!extension) throw new ApiError(400, "File must be a JPEG, PNG or WEBP image", [], "VALIDATION_ERROR");
  ensureUploadsDir();
  const fileName = `${machineId}-${Date.now()}.${extension}`;
  fs.writeFileSync(path.join(machinesDir, fileName), buffer);
  return `${PUBLIC_PREFIX}${fileName}`;
};

/** Removes a previously stored image; ignores legacy base64 values and missing files. */
export const removeMachineImage = (imageUrl: string | null | undefined): void => {
  if (!imageUrl?.startsWith(PUBLIC_PREFIX)) return;
  try {
    fs.unlinkSync(path.join(machinesDir, path.basename(imageUrl)));
  } catch {
    // already gone
  }
};
