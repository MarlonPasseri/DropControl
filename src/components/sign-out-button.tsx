import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
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
