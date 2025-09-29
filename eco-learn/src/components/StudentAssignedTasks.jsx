"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import TaskCard from "@/components/TaskCard";

const determineKind = (mime = "") => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
};

const formatDate = (value) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Due soon";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const daysRemaining = (value) => {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;
  const diff = due.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function StudentAssignedTasks() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [textResponse, setTextResponse] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = useMemo(() => (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"), []);
  const studentId = session?.user?.id;
  const activeTask = useMemo(() => tasks.find((task) => task.id === activeTaskId) || null, [tasks, activeTaskId]);

  useEffect(() => {
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
  }, [studentId, apiUrl]);

  useEffect(() => {
    setTextResponse("");
    setSelectedFiles([]);
    setPreviews([]);
  }, [activeTaskId]);

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
  }, [previews]);

  const handleToggleTask = (taskId) => {
    setActiveTaskId((current) => (current === taskId ? null : taskId));
  };

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    previews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    setSelectedFiles(files);
    setPreviews(files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    })));
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
    const presignResponse = await fetch(apiUrl + "/uploads/presign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        prefix: "submissions/" + (studentId || "anonymous"),
      }),
    });

    const presignData = await presignResponse.json();
    if (!presignResponse.ok) {
      throw new Error((presignData && presignData.error) || ("Failed to prepare upload for " + file.name));
    }

    const method = presignData.method || "PUT";
    const headers = presignData.headers || { "Content-Type": file.type || "application/octet-stream" };

    const uploadResponse = await fetch(presignData.uploadUrl, {
      method,
      headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload " + file.name);
    }

    const url = presignData.publicUrl || ("r2://" + presignData.key);

    return {
      kind: determineKind(file.type || ""),
      url,
      name: file.name,
      size: file.size,
      key: presignData.key,
    };
  };

  const handleSubmit = async (event, task) => {
    event.preventDefault();
    if (!studentId || !task) {
      toast.error("Missing student context");
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
        const attachment = await uploadFileToR2(file);
        attachments.push(attachment);
      }

      const method = task?.submission ? "PATCH" : "POST";
      const response = await fetch(apiUrl + "/tasks/" + task.id + "/submissions", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          textResponse,
          attachments,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data && data.error) || "Failed to submit task");
      }

      toast.success(task?.submission ? "Submission updated" : "Submission sent for review");
      setTextResponse("");
      setSelectedFiles([]);
      setPreviews([]);
      setActiveTaskId(null);
      try {
        const refresh = await fetch(apiUrl + "/tasks/assigned?studentId=" + studentId);
        const payload = await refresh.json();
        if (refresh.ok && Array.isArray(payload.tasks)) setTasks(payload.tasks);
      } catch {}
    } catch (err) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExisting = async (task, key) => {
    try {
      const response = await fetch(apiUrl + "/tasks/" + task.id + "/submissions/attachment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, studentId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data && data.error) || "Failed to delete attachment");
      }
      toast.success("Attachment deleted");
      // Refresh tasks to reflect current attachments
      try {
        const refresh = await fetch(apiUrl + "/tasks/assigned?studentId=" + studentId);
        const payload = await refresh.json();
        if (refresh.ok && Array.isArray(payload.tasks)) setTasks(payload.tasks);
      } catch {}
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

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
          const isActive = activeTaskId === task.id;

          return (
            <div key={task.id}>
              <TaskCard task={task} isActive={isActive} onToggle={() => handleToggleTask(task.id)} />

              {isActive && (
                <form
                  onSubmit={(event) => handleSubmit(event, task)}
                  className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Existing submission attachments (if any) */}
                    {task?.submission?.attachments && task.submission.attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Previously submitted</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {task.submission.attachments.map((att) => (
                            <div key={att.key || att.url} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
                              {att.kind === "image" ? (
                                <img src={att.url} alt={att.name || "image"} className="h-32 w-full object-cover" />
                              ) : att.kind === "video" ? (
                                <video src={att.url} controls className="h-32 w-full object-cover" />
                              ) : (
                                <div className="flex h-32 w-full items-center justify-center text-sm text-slate-600">
                                  📎 {att.name || "file"}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteExisting(task, att.key)}
                                className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white shadow"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="block text-sm font-medium text-slate-700">
                      Reflection (optional)
                      <textarea
                        value={textResponse}
                        onChange={(event) => setTextResponse(event.target.value)}
                        rows={3}
                        placeholder="Describe what you did or learned"
                        className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Add more proof</label>
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                        multiple
                        onChange={handleFilesChange}
                        className="w-full rounded-2xl border border-dashed border-emerald-200 px-4 py-4 text-sm text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                      {previews.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {previews.map((preview, index) => (
                            <div
                              key={preview.previewUrl}
                              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80"
                            >
                              {preview.type && preview.type.startsWith("image/") ? (
                                <img
                                  src={preview.previewUrl}
                                  alt={preview.name}
                                  className="h-32 w-full object-cover"
                                />
                              ) : preview.type && preview.type.startsWith("video/") ? (
                                <video
                                  src={preview.previewUrl}
                                  controls
                                  className="h-32 w-full object-cover"
                                />
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

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTextResponse("");
                          setSelectedFiles([]);
                          setPreviews([]);
                        }}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {submitting ? (task?.submission ? "Updating..." : "Submitting...") : task?.submission ? "Save changes" : "Submit task"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
