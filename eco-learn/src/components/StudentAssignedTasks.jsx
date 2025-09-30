"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import SectionHeading from "@/components/dashboard/SectionHeading";

const TABS = [
  { id: "assigned", label: "Assigned" },
  { id: "pending", label: "Pending review" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Needs attention" },
];

const formatDate = (value) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const describeStatus = (status) => {
  if (status === "accepted") return { label: "Accepted", tone: "text-emerald-600", chip: "bg-emerald-100 text-emerald-700" };
  if (status === "pending") return { label: "Pending", tone: "text-amber-600", chip: "bg-amber-100 text-amber-700" };
  if (status === "rejected") return { label: "Rejected", tone: "text-red-600", chip: "bg-red-100 text-red-700" };
  return { label: "Assigned", tone: "text-slate-600", chip: "bg-slate-100 text-slate-600" };
};

export default function StudentAssignedTasks({ studentId }) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [textResponse, setTextResponse] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
  }, [previews]);

  useEffect(() => {
    if (!studentId) return undefined;
    let abort = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [assignedRes, submissionRes] = await Promise.all([
          fetch(apiUrl + "/tasks/assigned?studentId=" + studentId, { credentials: "include" }),
          fetch(apiUrl + "/students/" + studentId + "/submissions", { credentials: "include" }),
        ]);

        const assignedJson = await assignedRes.json().catch(() => ({}));
        const submissionJson = await submissionRes.json().catch(() => ({}));

        if (!assignedRes.ok) throw new Error(assignedJson?.error || "Failed to load assigned tasks");
        if (!submissionRes.ok) throw new Error(submissionJson?.error || "Failed to load submissions");

        if (abort) return;

        const assigned = Array.isArray(assignedJson.tasks)
          ? assignedJson.tasks.map((task) => ({
              id: task.id || String(task._id || task.taskId),
              title: task.title,
              description: task.description,
              points: task.points || task.taskPoints || 0,
              dueAt: task.dueAt || null,
              resources: Array.isArray(task.resources) ? task.resources : [],
              overdue: Boolean(task.overdue),
            }))
          : [];

        const submissionsList = Array.isArray(submissionJson.submissions) ? submissionJson.submissions : [];

        setAssignedTasks(assigned);
        setSubmissions(submissionsList);
      } catch (err) {
        if (!abort) setError(err.message || "Failed to load tasks");
      } finally {
        if (!abort) setLoading(false);
      }
    };

    load();

    return () => {
      abort = true;
    };
  }, [apiUrl, studentId]);

  const submissionsByTask = useMemo(() => {
    const map = new Map();
    submissions.forEach((submission) => {
      const key = submission.taskId;
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(submission);
    });
    map.forEach((list) => list.sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt)));
    return map;
  }, [submissions]);

  const outstandingTasks = useMemo(() => {
    return assignedTasks.filter((task) => {
      const related = submissionsByTask.get(task.id);
      if (!related || related.length === 0) return true;
      const latest = related[0];
      return latest.status === 'rejected';
    });
  }, [assignedTasks, submissionsByTask]);

  const pendingSubmissions = useMemo(() => submissions.filter((s) => s.status === 'pending'), [submissions]);
  const acceptedSubmissions = useMemo(() => submissions.filter((s) => s.status === 'accepted'), [submissions]);
  const rejectedSubmissions = useMemo(() => submissions.filter((s) => s.status === 'rejected'), [submissions]);

  const resetFormState = () => {
    setActiveTaskId(null);
    setTextResponse("");
    previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    setPreviews([]);
    setSelectedFiles([]);
  };

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    const nextPreviews = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedFiles(files);
    setPreviews(nextPreviews);
  };

  const removeFileAt = (index) => {
    const nextFiles = [...selectedFiles];
    const nextPreviews = [...previews];
    const removed = nextPreviews.splice(index, 1)[0];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    nextFiles.splice(index, 1);
    setSelectedFiles(nextFiles);
    setPreviews(nextPreviews);
  };

  const uploadFileToR2 = async (file) => {
    const presignRes = await fetch(apiUrl + "/uploads/presign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        prefix: "submissions/" + (studentId || "anonymous"),
      }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) {
      throw new Error((presignData && presignData.error) || ("Failed to prepare upload for " + file.name));
    }

    const method = presignData.method || "PUT";
    const headers = presignData.headers || { "Content-Type": file.type || "application/octet-stream" };

    const uploadRes = await fetch(presignData.uploadUrl, {
      method,
      headers,
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload " + file.name);
    }

    const url = presignData.publicUrl || ("r2://" + presignData.key);

    return {
      kind: file.type && file.type.startsWith("image/") ? "image" : file.type && file.type.startsWith("video/") ? "video" : "file",
      url,
      name: file.name,
      size: file.size,
      key: presignData.key,
    };
  };

  const submitProof = async (task) => {
    if (submitting) return;
    if (!studentId || !task?.id) {
      toast.error("Missing context for submission");
      return;
    }
    if (!textResponse && selectedFiles.length === 0) {
      toast.error("Add a note or at least one attachment");
      return;
    }

    setSubmitting(true);
    try {
      const attachments = [];
      for (const file of selectedFiles) {
        const uploaded = await uploadFileToR2(file);
        attachments.push(uploaded);
      }

      const response = await fetch(apiUrl + "/tasks/" + task.id + "/submissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          textResponse,
          attachments,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to submit task");

      toast.success("Submission sent for review");
      resetFormState();

      // Reload lists
      const assignedRes = await fetch(apiUrl + "/tasks/assigned?studentId=" + studentId, { credentials: "include" });
      const assignedJson = await assignedRes.json().catch(() => ({}));
      if (assignedRes.ok && Array.isArray(assignedJson.tasks)) {
        setAssignedTasks(assignedJson.tasks.map((task) => ({
          id: task.id || String(task._id || task.taskId),
          title: task.title,
          description: task.description,
          points: task.points || task.taskPoints || 0,
          dueAt: task.dueAt || null,
          resources: Array.isArray(task.resources) ? task.resources : [],
          overdue: Boolean(task.overdue),
        })));
      }

      const submissionsRes = await fetch(apiUrl + "/students/" + studentId + "/submissions", { credentials: "include" });
      const submissionsJson = await submissionsRes.json().catch(() => ({}));
      if (submissionsRes.ok && Array.isArray(submissionsJson.submissions)) {
        setSubmissions(submissionsJson.submissions);
      }
    } catch (err) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAssignedCard = (task) => {
    const isExpanded = activeTaskId === task.id;
    return (
      <div
        key={task.id}
        className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-emerald-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{task.title}</h3>
            {task.description ? (
              <p className="mt-1 text-sm text-slate-600">{task.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-600">
                {task.points} pts
              </span>
              <span>Due {formatDate(task.dueAt)}</span>
              {task.overdue ? (
                <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-600">Overdue</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isExpanded) {
                resetFormState();
              } else {
                resetFormState();
                setActiveTaskId(task.id);
              }
            }}
            className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            {isExpanded ? "Cancel" : "Submit proof"}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <label className="block text-sm font-semibold text-slate-700">
              Reflection (optional)
              <textarea
                value={textResponse}
                onChange={(event) => setTextResponse(event.target.value)}
                rows={textResponse.length > 120 ? 4 : 3}
                placeholder="Describe what you did or learned"
                className="mt-1 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Proof uploads</label>
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                multiple
                onChange={handleFilesChange}
                className="w-full rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-4 text-sm text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {previews.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {previews.map((preview, index) => (
                    <div key={preview.previewUrl} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
                      {preview.type.startsWith("image/") ? (
                        <img src={preview.previewUrl} alt={preview.name} className="h-32 w-full object-cover" />
                      ) : preview.type.startsWith("video/") ? (
                        <video src={preview.previewUrl} controls className="h-32 w-full object-cover" />
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center text-sm text-slate-600">
                          📎 {preview.name}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFileAt(index)}
                        className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white shadow"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetFormState}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => submitProof(task)}
                disabled={submitting}
                className="rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit task"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubmissionCard = (submission) => {
    const theme = describeStatus(submission.status);
    return (
      <div
        key={submission.id}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{submission.taskTitle}</h3>
            <p className="mt-1 text-sm text-slate-600">Attempt #{submission.attempt || 1}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme?.chip || "bg-slate-100 text-slate-600"}`}>
              {theme?.label || "Unknown"}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
              {submission.taskPoints || submission.awardedPoints || 0} pts
            </span>
          </div>
        </div>

        {submission.textResponse ? (
          <p className="mt-3 text-sm text-slate-700">{submission.textResponse}</p>
        ) : null}

        {Array.isArray(submission.attachments) && submission.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {submission.attachments.map((attachment, index) => (
              <a
                key={submission.id + '-attachment-' + index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <span>
                  {attachment.kind === "image"
                    ? "🖼️"
                    : attachment.kind === "video"
                    ? "🎬"
                    : "📎"}
                </span>
                <span>{attachment.name || attachment.kind}</span>
              </a>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span>Submitted {formatDate(submission.submittedAt || submission.createdAt)}</span>
          {submission.reviewedAt && <span>Reviewed {formatDate(submission.reviewedAt)}</span>}
          {submission.feedback && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
              Feedback: {submission.feedback}
            </span>
          )}
        </div>
      </div>
    );
  };

  const tabResults = {
    assigned: outstandingTasks,
    pending: pendingSubmissions,
    accepted: acceptedSubmissions,
    rejected: rejectedSubmissions,
  };

  const activeItems = tabResults[activeTab] || [];

  return (
    <section className="space-y-4" id="my-tasks">
      <SectionHeading
        title="My tasks"
        description="Submit new challenges and review recent decisions from your teachers."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              resetFormState();
              setActiveTab(tab.id);
            }}
            className={
              "rounded-full border px-4 py-2 text-sm font-semibold transition " +
              (activeTab === tab.id
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 text-emerald-700">
          Loading tasks…
        </div>
      ) : activeItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
          {activeTab === "assigned"
            ? "No open tasks right now. Take a breather!"
            : "Nothing to show here yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "assigned"
            ? activeItems.map((task) => renderAssignedCard(task))
            : activeItems.map((submission) => renderSubmissionCard(submission))}
        </div>
      )}
    </section>
  );
}
