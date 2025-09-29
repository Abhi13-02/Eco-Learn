"use client";

export default function TaskCard({ task, isActive, onToggle }) {
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const dueLabel = dueDate ? dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date";
  const isOverdue = Boolean(task.overdue);

  let statusBadge = null;
  if (task.submission) {
    const status = task.submission.status;
    const edited = Boolean(task.submission.edited);
    const baseClass = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold";
    if (status === "accepted") {
      statusBadge = <span className={baseClass + " bg-emerald-100 text-emerald-700"}>Accepted{edited ? " • Edited" : ""}</span>;
    } else if (status === "rejected") {
      statusBadge = <span className={baseClass + " bg-red-100 text-red-700"}>Rejected{edited ? " • Edited" : ""}</span>;
    } else {
      statusBadge = <span className={baseClass + " bg-amber-100 text-amber-700"}>{edited ? "Edited" : "Submitted"}</span>;
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-white">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
          {task.description ? <p className="mt-1 text-sm text-slate-600">{task.description}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">{task.points} pts</span>
            {statusBadge}
          </div>
        </div>
        <div className="text-right text-sm">
          <p className={(isOverdue ? "text-red-600" : "text-slate-600") + " font-medium"}>{dueLabel}</p>
          <button
            type="button"
            onClick={onToggle}
            className="mt-2 rounded-full border border-emerald-200 px-4 py-1 text-xs font-semibold text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
          >
            {isActive ? "Cancel" : task.submission ? "Edit submission" : "Submit proof"}
          </button>
        </div>
      </div>
    </article>
  );
}


