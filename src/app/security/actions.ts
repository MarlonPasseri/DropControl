"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  countUsersByAccessRole,
  getUserById,
  updateUserAccessRole,
} from "@/lib/data/users";
import { requireAdminUser } from "@/lib/require-user";
import { recordAuditLog, recordSecurityEvent } from "@/lib/security/audit";
import { getRoleLabel, resolveAppRoleForUser } from "@/lib/security/roles";
import { updateUserAccessSchema } from "@/lib/validations/security";

function securityRedirect(params: Record<string, string | undefined>): never {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  redirect(query ? `/security?${query}` : "/security");
}

export async function updateUserAccess(formData: FormData) {
  const actor = await requireAdminUser();
  const parsed = updateUserAccessSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    securityRedirect({
      error: parsed.error.issues[0]?.message ?? "Revise os dados do acesso.",
    });
  }

  const targetUser = await getUserById(parsed.data.userId);

  if (!targetUser) {
    securityRedirect({
      error: "Usuario nao encontrado.",
    });
  }

  const currentRole = await resolveAppRoleForUser(targetUser);

  if (parsed.data.role === currentRole) {
    securityRedirect({
      success: `O acesso de ${targetUser.name} ja estava como ${getRoleLabel(currentRole)}.`,
    });
  }

  if (targetUser.id === actor.id && parsed.data.role !== "ADMIN") {
    securityRedirect({
      error: "Voce nao pode remover seu proprio acesso administrativo por aqui.",
    });
  }

  if (currentRole === "ADMIN" && parsed.data.role !== "ADMIN") {
    const roleSummary = await countUsersByAccessRole();

    if (roleSummary.ADMIN <= 1) {
      securityRedirect({
        error: "O ambiente precisa manter pelo menos um administrador.",
      });
    }
  }

  await updateUserAccessRole(targetUser.id, parsed.data.role);
  await recordAuditLog({
    actor,
    action: "UPDATE_ROLE",
    resource: "user_access",
    resourceId: targetUser.id,
    summary: `Nivel de acesso de ${targetUser.email} alterado para ${parsed.data.role}.`,
    metadata: {
      targetUserEmail: targetUser.email,
      previousRole: currentRole,
      newRole: parsed.data.role,
    },
  });
  await recordSecurityEvent({
    userId: targetUser.id,
    email: targetUser.email,
    type: "USER_ACCESS_ROLE_UPDATED",
    severity: "WARN",
    message: `Nivel de acesso alterado para ${parsed.data.role}.`,
    metadata: {
      actorUserId: actor.id,
      actorEmail: actor.email ?? null,
      previousRole: currentRole,
      newRole: parsed.data.role,
    },
  });

  revalidatePath("/security");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  securityRedirect({
    success: `Acesso de ${targetUser.name} atualizado para ${getRoleLabel(parsed.data.role)}.`,
  });
}
