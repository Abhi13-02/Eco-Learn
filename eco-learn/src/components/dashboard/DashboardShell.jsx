export default function DashboardShell({ title, subtitle, accent, children }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
            <span>{accent ?? "🌿"}</span>
            <span>Eco-Learn</span>
          </span>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
          {subtitle ? <p className="text-base text-slate-600 sm:text-lg">{subtitle}</p> : null}
        </header>

        <section className="grid gap-6 rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-xl backdrop-blur-sm sm:p-10">
          {children}
        </section>
      </div>
    </main>
  );
}
