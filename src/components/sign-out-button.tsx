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
        className="flex w-full items-center gap-3 px-3 py-2 text-left font-headline text-sm font-semibold tracking-wide text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        <span>Sair</span>
      </button>
    </form>
  );
}
