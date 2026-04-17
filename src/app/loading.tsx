export const unstable_instant = true;

export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-lg bg-[var(--surface-container-lowest)] px-5 py-4 shadow-[0_20px_40px_rgba(42,52,57,0.06)]">
          <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-container-high)]" />
          <div className="mt-3 h-8 w-56 animate-pulse rounded bg-[var(--surface-container-high)]" />
          <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-[var(--surface-container-low)]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg bg-[var(--surface-container-lowest)] p-4 shadow-[0_20px_40px_rgba(42,52,57,0.06)]"
            >
              <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-container-high)]" />
              <div className="mt-4 h-8 w-32 animate-pulse rounded bg-[var(--surface-container-high)]" />
              <div className="mt-3 h-4 w-40 animate-pulse rounded bg-[var(--surface-container-low)]" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg bg-[var(--surface-container-lowest)] p-5 shadow-[0_20px_40px_rgba(42,52,57,0.06)]">
            <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-container-high)]" />
            <div className="mt-4 h-56 animate-pulse rounded-lg bg-[var(--surface-container-low)]" />
          </div>
          <div className="rounded-lg bg-[var(--surface-container-lowest)] p-5 shadow-[0_20px_40px_rgba(42,52,57,0.06)]">
            <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-container-high)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-lg bg-[var(--surface-container-low)]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
