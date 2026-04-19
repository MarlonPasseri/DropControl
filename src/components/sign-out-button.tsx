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
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-headline text-sm font-semibold tracking-wide text-[var(--on-surface-variant)] transition-all duration-200 hover:bg-[color:rgba(255,226,213,0.64)] hover:text-[var(--on-secondary-container)]"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        <span>Sair</span>
      </button>
    </form>
  );
}
