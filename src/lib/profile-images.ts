import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { Storage } from "@google-cloud/storage";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const LOCAL_PROFILE_IMAGE_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "profile",
);
const LOCAL_PROFILE_IMAGE_PUBLIC_PATH = "/uploads/profile";
const GCS_PROFILE_IMAGE_PUBLIC_PATH = "/api/profile-image";

const allowedImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const storage = new Storage();

export function getProfileImageValidationError(file: File) {
  if (!(file.type in allowedImageExtensions)) {
    return "Envie uma foto em JPG, PNG ou WebP.";
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    return "A foto precisa ter ate 5 MB.";
  }

  return null;
}

function getSafeUserId(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "") || "user";
}

function getProfileImageBucketName() {
  return process.env.PROFILE_IMAGE_BUCKET?.trim();
}

export function isCloudProfileImage(image?: string | null): image is string {
  return image?.startsWith(`${GCS_PROFILE_IMAGE_PUBLIC_PATH}/`) ?? false;
}

export function isLocalProfileImage(image?: string | null): image is string {
  return image?.startsWith(`${LOCAL_PROFILE_IMAGE_PUBLIC_PATH}/`) ?? false;
}

export function isStoredProfileImage(image?: string | null): image is string {
  return isCloudProfileImage(image) || isLocalProfileImage(image);
}

export function getCloudProfileImageNameFromUrl(image: string) {
  if (!isCloudProfileImage(image)) {
    return null;
  }

  return decodeURIComponent(image.slice(`${GCS_PROFILE_IMAGE_PUBLIC_PATH}/`.length));
}

export async function storeProfileImage(file: File, userId: string) {
  const validationError = getProfileImageValidationError(file);

  if (validationError) {
    return {
      error: validationError,
      image: null,
    };
  }

  const extension = allowedImageExtensions[file.type as keyof typeof allowedImageExtensions];
  const safeUserId = getSafeUserId(userId);
  const fileName = `${safeUserId}-${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const bucketName = getProfileImageBucketName();

  if (bucketName) {
    const objectName = `profile/${fileName}`;

    await storage.bucket(bucketName).file(objectName).save(bytes, {
      contentType: file.type,
      resumable: false,
      metadata: {
        cacheControl: "private, max-age=3600",
      },
    });

    return {
      error: null,
      image: `${GCS_PROFILE_IMAGE_PUBLIC_PATH}/${encodeURIComponent(objectName)}`,
    };
  }

  await mkdir(LOCAL_PROFILE_IMAGE_UPLOAD_DIR, { recursive: true });

  const filePath = path.join(LOCAL_PROFILE_IMAGE_UPLOAD_DIR, fileName);
  await writeFile(filePath, bytes);

  return {
    error: null,
    image: `${LOCAL_PROFILE_IMAGE_PUBLIC_PATH}/${fileName}`,
  };
}

export async function deleteStoredProfileImage(image?: string | null) {
  if (isCloudProfileImage(image)) {
    const bucketName = getProfileImageBucketName();
    const objectName = getCloudProfileImageNameFromUrl(image);

    if (!bucketName || !objectName) {
      return;
    }

    await storage.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
    return;
  }

  if (!isLocalProfileImage(image)) {
    return;
  }

  const targetPath = path.join(LOCAL_PROFILE_IMAGE_UPLOAD_DIR, path.basename(image));
  const uploadDir = path.resolve(LOCAL_PROFILE_IMAGE_UPLOAD_DIR);
  const resolvedTarget = path.resolve(targetPath);

  if (resolvedTarget === uploadDir || !resolvedTarget.startsWith(`${uploadDir}${path.sep}`)) {
    return;
  }

  try {
    await unlink(resolvedTarget);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function getCloudProfileImage(objectName: string) {
  const bucketName = getProfileImageBucketName();

  if (!bucketName || !objectName.startsWith("profile/")) {
    return null;
  }

  const file = storage.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();

  if (!exists) {
    return null;
  }

  const [metadata] = await file.getMetadata();
  const [contents] = await file.download();

  return {
    body: contents,
    contentType: metadata.contentType || "application/octet-stream",
    cacheControl: metadata.cacheControl || "private, max-age=3600",
  };
}
