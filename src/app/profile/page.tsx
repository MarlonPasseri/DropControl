import { redirect } from "next/navigation";
import Image from "next/image";
import { saveProfile } from "@/app/profile/actions";
import { AppShell } from "@/components/app-shell";
import { AppPanel, NoticeBanner } from "@/components/mvp-ui";
import { getUserById } from "@/lib/data/users";
import { requireUser } from "@/lib/require-user";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getInitials(name?: string | null, email?: string | null) {
  const seed = name?.trim() || email?.trim() || "Usuario";
  const [first = "", second = ""] = seed.split(/\s+/);
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "US";
}

const inputClass =
  "w-full rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-[var(--outline)] focus:border-[var(--primary)]";
const labelClass = "mb-2 block text-sm font-medium text-slate-700";

export default async function ProfilePage({ searchParams }: PageProps) {
  const sessionUser = await requireUser();
  const params = (await searchParams) ?? {};
  const successMessage = firstOf(params.success);
  const errorMessage = firstOf(params.error);
  const user = await getUserById(sessionUser.id);

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      title="Perfil"
      description="Gerencie seus dados de usuario, foto do perfil e informacoes exibidas no painel."
    >
      {successMessage ? <NoticeBanner tone="success" text={successMessage} /> : null}
      {errorMessage ? <NoticeBanner tone="error" text={errorMessage} /> : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <AppPanel title="Sua area" eyebrow="Usuario">
          <div className="flex flex-col items-center text-center">
            {user.image ? (
              <Image
                src={user.image}
                alt={`Foto de ${user.name}`}
                width={128}
                height={128}
                unoptimized
                className="h-32 w-32 rounded-full object-cover ring-4 ring-[var(--surface-container-low)]"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--primary-container)] text-4xl font-bold text-[var(--primary)] ring-4 ring-[var(--surface-container-low)]">
                {getInitials(user.name, user.email)}
              </div>
            )}

            <h3 className="mt-5 font-headline text-2xl font-bold text-slate-950">
              {user.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">{user.email}</p>

            <div className="mt-6 grid w-full gap-3 text-left">
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Cargo</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {user.role || "Nao informado"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Empresa</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {user.company || "Nao informada"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--on-surface-variant)]">Telefone</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {user.phone || "Nao informado"}
                </p>
              </div>
            </div>
          </div>
        </AppPanel>

        <AppPanel title="Editar perfil" eyebrow="Dados da conta">
          <form action={saveProfile} className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className={labelClass}>Foto do perfil</span>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="w-full rounded-lg border border-dashed border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] px-4 py-4 text-sm text-[var(--on-surface-variant)] file:mr-4 file:rounded-md file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <span className="mt-2 block text-xs text-[var(--on-surface-variant)]">
                JPG, PNG ou WebP ate 800 KB.
              </span>
            </label>

            {user.image ? (
              <label className="flex items-center gap-3 rounded-lg border border-[var(--outline-variant)] bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  name="removeImage"
                  className="h-4 w-4 rounded border-[var(--outline-variant)]"
                />
                Remover foto atual
              </label>
            ) : null}

            <label className="block md:col-span-2">
              <span className={labelClass}>Nome</span>
              <input
                type="text"
                name="name"
                required
                maxLength={80}
                defaultValue={user.name}
                className={inputClass}
              />
            </label>

            <label className="block md:col-span-2">
              <span className={labelClass}>E-mail de acesso</span>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Telefone</span>
              <input
                type="tel"
                name="phone"
                maxLength={40}
                defaultValue={user.phone ?? ""}
                placeholder="(00) 00000-0000"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Cargo</span>
              <input
                type="text"
                name="role"
                maxLength={80}
                defaultValue={user.role ?? ""}
                placeholder="Gestor de operacao"
                className={inputClass}
              />
            </label>

            <label className="block md:col-span-2">
              <span className={labelClass}>Empresa</span>
              <input
                type="text"
                name="company"
                maxLength={120}
                defaultValue={user.company ?? ""}
                placeholder="Nome da empresa"
                className={inputClass}
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-dim)]"
              >
                Salvar perfil
              </button>
            </div>
          </form>
        </AppPanel>
      </section>
    </AppShell>
  );
}
