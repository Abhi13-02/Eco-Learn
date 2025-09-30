export default function ComingSoonCard({ title, message, icon = "✨" }) {
  return (
    <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center text-slate-600">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}
