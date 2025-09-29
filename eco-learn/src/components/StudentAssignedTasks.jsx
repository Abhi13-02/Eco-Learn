"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

function formatDate(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Due soon";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysRemaining(value) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const diff = due.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function StudentAssignedTasks() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);

  useEffect(() => {
    const studentId = session?.user?.id;
    if (!studentId) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(apiUrl + "/tasks/assigned?studentId=" + studentId, {
      method: "GET",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data && data.error) || "Failed to load tasks");
        }
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [session, apiUrl]);

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
            Assigned challenges
          </p>
          <h2 className="text-2xl font-bold text-slate-900">Your eco missions</h2>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
          {tasks.length} tasks
        </span>
      </header>

      {loading && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-emerald-700">
          Loading your tasks...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
          No active tasks yet. Check back soon or ask your teacher for your next eco mission.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {tasks.map((task) => {
          const dueLabel = formatDate(task.dueAt);
          const remaining = daysRemaining(task.dueAt);
          const isOverdue = Boolean(task.overdue);

          let remainingLabel = null;
          if (remaining !== null && !Number.isNaN(remaining)) {
            if (remaining > 0) {
              remainingLabel = remaining + " day" + (remaining === 1 ? "" : "s") + " left";
            } else if (remaining === 0) {
              remainingLabel = "Due today";
            } else {
              const daysAgo = Math.abs(remaining);
              remainingLabel = daysAgo + " day" + (daysAgo === 1 ? "" : "s") + " ago";
            }
          }

          return (
            <article
              key={task.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-200 hover:bg-white"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                  {task.description ? (
                    <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                  ) : null}
                  {task.resources && task.resources.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.resources.map((resource, index) => (
                        <a
                          key={task.id + "-res-" + index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <span>
                            {resource.kind === "image"
                              ? "🖼️"
                              : resource.kind === "video"
                              ? "🎬"
                              : "📎"}
                          </span>
                          <span>{resource.name || resource.kind}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2 text-right text-sm">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                    {task.points} pts
                  </span>
                  <div className="text-xs text-slate-500">
                    <p className={isOverdue ? "font-semibold text-red-600" : "font-medium text-slate-600"}>
                      {dueLabel}
                      {remainingLabel ? (
                        <span className="ml-1 text-xs text-slate-500">{remainingLabel}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
