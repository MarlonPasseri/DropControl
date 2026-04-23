import { cookies } from "next/headers";
import { signOut } from "@/auth";
import {
  getMfaSetupCookieName,
  getMfaVerificationCookieName,
} from "@/lib/security/mfa";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const cookieStore = await cookies();
        cookieStore.delete(getMfaVerificationCookieName());
        cookieStore.delete(getMfaSetupCookieName());
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[var(--on-surface-variant)] transition-all duration-200 hover:bg-[var(--error-container)] hover:text-[var(--error)]"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        <span>Sair</span>
      </button>
    </form>
  );
}
