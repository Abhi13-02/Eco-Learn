export default function SectionHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p> : null}
      </div>
      {action || null}
    </div>
  );
}
