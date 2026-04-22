"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { updateUserProfile } from "@/lib/data/users";
import { profileSchema } from "@/lib/validations/auth";

const MAX_PROFILE_IMAGE_SIZE = 800 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

async function fileToDataUrl(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    profileRedirect({
      error: "Envie uma foto em JPG, PNG ou WebP.",
    });
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    profileRedirect({
      error: "A foto precisa ter ate 800 KB.",
    });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
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
  const image = removeImage
    ? null
    : uploadedImage
      ? await fileToDataUrl(uploadedImage)
      : undefined;

  await updateUserProfile(user.id, {
    ...parsed.data,
    ...(image !== undefined ? { image } : {}),
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  profileRedirect({ success: "Perfil atualizado com sucesso." });
}
