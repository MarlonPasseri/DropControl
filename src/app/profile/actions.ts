"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getUserById, updateUserProfile } from "@/lib/data/users";
import {
  deleteStoredProfileImage,
  isStoredProfileImage,
  storeProfileImage,
} from "@/lib/profile-images";
import { recordAuditLog } from "@/lib/security/audit";
import { profileSchema } from "@/lib/validations/auth";

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

export async function saveProfile(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
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
  const storedImage = uploadedImage
    ? await storeProfileImage(uploadedImage, user.id)
    : null;

  if (storedImage?.error) {
    profileRedirect({
      error: storedImage.error,
    });
  }

  const image = removeImage
    ? null
    : uploadedImage
      ? storedImage?.image
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
