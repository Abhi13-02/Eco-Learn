"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

export default function TeacherReviewPanel() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    setError("");
    // simple feed: all latest student submissions for tasks created by this teacher
    fetch(apiUrl + "/teacher/submissions?teacherId=" + (session?.user?.id || ""))
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (abort) return;
        if (!ok) throw new Error(d?.error || "Failed to load submissions");
        setSubmissions(Array.isArray(d?.items) ? d.items : []);
      })
      .catch((e) => !abort && setError(e.message))
      .finally(() => !abort && setLoading(false));
    return () => {
      abort = true;
    };
  }, [apiUrl, session?.user?.id]);

  const review = async (submissionId, status, feedback) => {
    try {
      const res = await fetch(apiUrl + "/tasks/submissions/" + submissionId + "/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, feedback }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to review");
      toast.success(status === "accepted" ? "Accepted" : status === "rejected" ? "Rejected" : "Updated");
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, status, feedback: data?.submission?.feedback || feedback, awardedPoints: data?.submission?.awardedPoints ?? s.awardedPoints } : s)));
    } catch (e) {
      toast.error(e.message || "Failed to review");
    }
  };

  if (loading) return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">Loading…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-3">
      {submissions.map((s) => (
        <article key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">{s.taskTitle}</h3>
              <p className="text-xs text-slate-500">{s.studentName} • Grade {s.studentGrade || "-"}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{s.taskPoints} pts</span>
          </header>
          {s.textResponse && <p className="mt-3 text-sm text-slate-700">{s.textResponse}</p>}
          {Array.isArray(s.attachments) && s.attachments.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {s.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-emerald-200 hover:bg-white">
                  <span>{a.kind === "image" ? "🖼️" : a.kind === "video" ? "🎬" : "📎"}</span>
                  <span className="truncate">{a.name || a.kind}</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <textarea
              defaultValue={s.feedback || ""}
              onBlur={(e) => (s._draft = e.target.value)}
              placeholder="Add feedback for the student…"
              rows={2}
              className="w-full resize-y rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <div className="flex gap-2">
              <button onClick={() => review(s.id, "accepted", s._draft ?? s.feedback)} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Accept</button>
              <button onClick={() => review(s.id, "rejected", s._draft ?? s.feedback)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Reject</button>
              <button onClick={() => review(s.id, "pending", s._draft ?? s.feedback)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Save</button>
            </div>
          </div>

          <footer className="mt-2 text-xs text-slate-500">
            Status: <span className="font-semibold">{s.status}</span> • Awarded: {s.awardedPoints || 0} pts
          </footer>
        </article>
      ))}
      {submissions.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">No submissions to review yet.</div>
      )}
    </div>
  );
}


