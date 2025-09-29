"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

const STATUS_THEMES = {
  pending: {
    card: "border-amber-200 bg-amber-50/40",
    accent: "text-amber-600 bg-amber-100",
    header: "from-amber-100 via-white to-amber-50",
    icon: "🕒",
    label: "Awaiting review",
  },
  accepted: {
    card: "border-emerald-200 bg-emerald-50/40",
    accent: "text-emerald-600 bg-emerald-100",
    header: "from-emerald-100 via-white to-emerald-50",
    icon: "✅",
    label: "Accepted",
  },
  rejected: {
    card: "border-red-200 bg-red-50/40",
    accent: "text-red-600 bg-red-100",
    header: "from-red-100 via-white to-red-50",
    icon: "❌",
    label: "Rejected",
  },
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TeacherReviewPanel() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [busySubmission, setBusySubmission] = useState(null);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    setError("");

    fetch(apiUrl + "/teacher/submissions?teacherId=" + (session?.user?.id || ""), { credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Failed to load submissions");
        return Array.isArray(data?.items) ? data.items : [];
      })
      .then((items) => {
        if (abort) return;
        setSubmissions(items.map((item) => ({ ...item, draftFeedback: item.feedback || "" })));
      })
      .catch((err) => {
        if (!abort) setError(err.message);
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });

    return () => {
      abort = true;
    };
  }, [apiUrl, session?.user?.id]);

  const applyUpdate = (id, updater) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === id ? { ...submission, ...updater(submission) } : submission
      )
    );
  };

  const onFeedbackChange = (id, value) => {
    applyUpdate(id, () => ({ draftFeedback: value }));
  };

  const review = async (id, status, feedback) => {
    setBusySubmission(id);
    try {
      let response = await fetch(apiUrl + "/tasks/submissions/" + id + "/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, feedback }),
      });
      let data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Fallback to POST if PATCH is blocked by proxies
        response = await fetch(apiUrl + "/tasks/submissions/" + id + "/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status, feedback }),
        });
        data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Failed to update submission");
      }

      toast.success(
        status === "accepted" ? "Task accepted" : status === "rejected" ? "Task rejected" : "Feedback saved"
      );

      applyUpdate(id, () => ({
        status,
        feedback: data?.submission?.feedback ?? feedback,
        draftFeedback: data?.submission?.feedback ?? feedback,
        awardedPoints: data?.submission?.awardedPoints,
        reviewedAt: data?.submission?.reviewedAt || new Date().toISOString(),
      }));
    } catch (err) {
      toast.error(err.message || "Unable to update submission");
    } finally {
      setBusySubmission(null);
      setDropdownOpen(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 text-emerald-700">
        Loading submissions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
        No submissions awaiting review right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        const theme = STATUS_THEMES[submission.status] || STATUS_THEMES.pending;
        const reviewedAt = formatDateTime(submission.reviewedAt);
        const submittedAt = formatDateTime(submission.submittedAt);
        const attachments = Array.isArray(submission.attachments) ? submission.attachments : [];
        const cardClass = [
          "relative overflow-visible rounded-3xl border p-0 shadow-sm transition hover:shadow-md",
          theme.card,
        ].join(" ");
        const headerClass = [
          "flex items-start gap-4 border-b border-white/60 bg-gradient-to-r px-5 py-4",
          theme.header,
        ].join(" ");
        const accentClass = [
          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
          theme.accent,
        ].join(" ");

        return (
          <article key={submission.id} className={cardClass}>
            <div className={headerClass}>
              <div className="rounded-2xl bg-white/70 p-3 text-xl">{theme.icon}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{submission.taskTitle}</h3>
                    <p className="text-xs text-slate-600">
                      {submission.studentName} • Grade {submission.studentGrade || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <span className={accentClass}>
                      {theme.icon} {theme.label}
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {submission.taskPoints} pts
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-600">
                  {submittedAt && <span>Submitted {submittedAt}</span>}
                  {reviewedAt && submission.status !== "pending" && <span>Reviewed {reviewedAt}</span>}
                  <span>Attempt #{submission.attempt || 1}</span>
                  <span>Awarded {submission.awardedPoints ?? 0} pts</span>
                </div>
              </div>
            </div>

            {submission.textResponse && (
              <p className="px-5 pt-4 text-sm text-slate-700">{submission.textResponse}</p>
            )}

            {attachments.length > 0 && (
              <div className="mt-4 grid gap-3 px-5 pb-2 sm:grid-cols-2">
                {attachments.map((attachment, index) => (
                  <a
                    key={submission.id + "-att-" + index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="text-lg">
                      {attachment.kind === "image"
                        ? "🖼️"
                        : attachment.kind === "video"
                        ? "🎬"
                        : "📎"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{attachment.name || attachment.kind}</p>
                      {attachment.size ? (
                        <p className="truncate text-[11px] text-slate-500">
                          {(attachment.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      ) : null}
                    </div>
                    <span className="ml-auto text-xs text-emerald-600 opacity-0 transition group-hover:opacity-100">
                      View
                    </span>
                  </a>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-4 border-t border-slate-200/60 bg-white/80 px-5 pb-5 pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">Private feedback</label>
                  <span className="text-[11px] text-slate-500">Visible only to the student</span>
                </div>
                <textarea
                  value={submission.draftFeedback}
                  onChange={(event) => onFeedbackChange(submission.id, event.target.value)}
                  rows={submission.draftFeedback.length > 120 ? 4 : 3}
                  placeholder="Share guidance, encouragement, or next steps"
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => review(submission.id, "pending", submission.draftFeedback)}
                  disabled={busySubmission === submission.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  💾 Save feedback
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setDropdownOpen((current) => (current === submission.id ? null : submission.id))
                    }
                    disabled={busySubmission === submission.id}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busySubmission === submission.id ? "Updating…" : "Update status"}
                    <span className="text-xs">▾</span>
                  </button>

                  {dropdownOpen === submission.id && (
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl z-50">
                      <button
                        type="button"
                        onClick={() => review(submission.id, "accepted", submission.draftFeedback)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
                      >
                        ✅ Accept and award points
                      </button>
                      <button
                        type="button"
                        onClick={() => review(submission.id, "rejected", submission.draftFeedback)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        ❌ Reject with feedback
                      </button>
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(null)}
                        className="mt-1 flex w-full items-center justify-center rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
