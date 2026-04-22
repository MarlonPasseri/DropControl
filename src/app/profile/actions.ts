"use server";

import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getUserById, updateUserProfile } from "@/lib/data/users";
import { recordAuditLog } from "@/lib/security/audit";
import { profileSchema } from "@/lib/validations/auth";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const PROFILE_IMAGE_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profile");
const PROFILE_IMAGE_PUBLIC_PATH = "/uploads/profile";
const allowedImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function profileRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/profile?${query}` : "/profile");
}

function getUploadedFile(value: FormDataEntryValue | null) {
  if (typeof File === "undefined" || !(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function isStoredProfileImage(image?: string | null): image is string {
  return image?.startsWith(`${PROFILE_IMAGE_PUBLIC_PATH}/`) ?? false;
}

async function deleteStoredProfileImage(image?: string | null) {
  if (!isStoredProfileImage(image)) {
    return;
  }

  const targetPath = path.join(PROFILE_IMAGE_UPLOAD_DIR, path.basename(image));
  const uploadDir = path.resolve(PROFILE_IMAGE_UPLOAD_DIR);
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

async function storeProfileImage(file: File, userId: string) {
  const extension =
    file.type in allowedImageExtensions
      ? allowedImageExtensions[file.type as keyof typeof allowedImageExtensions]
      : null;

  if (!extension) {
    profileRedirect({
      error: "Envie uma foto em JPG, PNG ou WebP.",
    });
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    profileRedirect({
      error: "A foto precisa ter ate 5 MB.",
    });
  }

  await mkdir(PROFILE_IMAGE_UPLOAD_DIR, { recursive: true });

  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "") || "user";
  const fileName = `${safeUserId}-${randomUUID()}.${extension}`;
  const filePath = path.join(PROFILE_IMAGE_UPLOAD_DIR, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, bytes);

  return `${PROFILE_IMAGE_PUBLIC_PATH}/${fileName}`;
}

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    company: formData.get("company"),
  });

  if (!parsed.success) {
    profileRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do perfil.",
    });
  }

  const uploadedImage = getUploadedFile(formData.get("image"));
  const removeImage = formData.get("removeImage") === "on";
  const currentUser = await getUserById(user.id);
  const image = removeImage
    ? null
    : uploadedImage
      ? await storeProfileImage(uploadedImage, user.id)
      : undefined;

  await updateUserProfile(user.id, {
    ...parsed.data,
    ...(image !== undefined ? { image } : {}),
  });
  await recordAuditLog({
    actor: user,
    action: "UPDATE",
    resource: "profile",
    resourceId: user.id,
    summary: "Perfil atualizado.",
    metadata: {
      changedImage: image !== undefined,
      removedImage: removeImage,
      previousImageStoredLocally: isStoredProfileImage(currentUser?.image),
    },
  });

  if (removeImage || uploadedImage) {
    await deleteStoredProfileImage(currentUser?.image);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  profileRedirect({ success: "Perfil atualizado com sucesso." });
}
