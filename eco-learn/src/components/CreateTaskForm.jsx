"use client";
import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";

const gradeOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));

export default function CreateTaskForm() {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("50");
  const [targetType, setTargetType] = useState("ALL");
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [targetStudents, setTargetStudents] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceKind, setResourceKind] = useState("file");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const apiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  }, []);

  const handleGradeToggle = (grade) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((value) => value !== grade) : [...prev, grade]
    );
  };

  const buildDueAt = () => {
    if (!dueDate) return undefined;
    if (!dueTime) return dueDate + "T23:59:00Z";
    return dueDate + "T" + dueTime + ":00Z";
  };

  const parseStudentIds = () =>
    targetStudents
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);

  useEffect(() => {
    if (targetType === "GRADE") {
      setTargetStudents("");
    }
    if (targetType === "STUDENTS") {
      setSelectedGrades([]);
    }
  }, [targetType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!session?.user?.id || !session?.user?.orgId) {
      setMessage({ type: "error", text: "Session missing teacher or school context." });
      return;
    }

    if (!title.trim()) {
      setMessage({ type: "error", text: "Task title is required." });
      return;
    }

    const payload = {
      title,
      description,
      points: Number(points),
      target: { type: targetType },
      createdBy: session.user.id,
      schoolId: session.user.orgId,
    };

    if (targetType === "GRADE") {
      payload.target.grades = selectedGrades;
    }

    if (targetType === "STUDENTS") {
      payload.target.students = parseStudentIds();
    }

    if (dueDate) {
      payload.dueAt = buildDueAt();
    }

    if (resourceUrl.trim()) {
      payload.resources = [
        {
          kind: resourceKind,
          url: resourceUrl,
          name: resourceName,
        },
      ];
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl + "/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create task");
      }

      setMessage({ type: "success", text: "Task created successfully." });
      setTitle("");
      setDescription("");
      setPoints("50");
      setSelectedGrades([]);
      setTargetStudents("");
      setDueDate("");
      setDueTime("");
      setResourceName("");
      setResourceUrl("");
      setResourceKind("file");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
          Task Creator
        </p>
        <h2 className="text-2xl font-bold text-slate-900">Launch a new eco challenge</h2>
        <p className="text-sm text-slate-500">
          Design engaging tasks for your students, choose who should receive them, and set clear point rewards.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Task title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="E.g. Plant a tree challenge"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Points</span>
            <input
              type="number"
              min="1"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              required
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Share the mission details, tips, and proof requirements"
            rows={4}
            className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Assign to</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "ALL", label: "All" },
                { value: "GRADE", label: "Grade" },
                { value: "STUDENTS", label: "Students" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTargetType(option.value)}
                  className={[
                    "rounded-2xl border px-3 py-2 text-sm font-medium transition",
                    targetType === option.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Due time</span>
              <input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>
        </div>

        {targetType === "GRADE" && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Choose grades</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {gradeOptions.map((grade) => {
                const isSelected = selectedGrades.includes(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => handleGradeToggle(grade)}
                    className={[
                      "rounded-full px-3 py-1 text-sm font-medium transition",
                      isSelected
                        ? "bg-emerald-500 text-white"
                        : "border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600",
                    ].join(" ")}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {targetType === "STUDENTS" && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Student IDs</span>
            <textarea
              placeholder="Enter student IDs separated by spaces or new lines"
              rows={3}
              value={targetStudents}
              onChange={(event) => setTargetStudents(event.target.value)}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <p className="text-xs text-slate-500">
              We will add an improved selector soon. For now, paste student IDs separated by spaces or new lines.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Resource kind</span>
            <select
              value={resourceKind}
              onChange={(event) => setResourceKind(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="file">File</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Resource link</span>
            <input
              type="url"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              placeholder="https://"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <input
              type="text"
              value={resourceName}
              onChange={(event) => setResourceName(event.target.value)}
              placeholder="Optional label"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        </div>

        {message && (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-600",
            ].join(" ")}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="reset"
            onClick={() => {
              setTitle("");
              setDescription("");
              setPoints("50");
              setSelectedGrades([]);
              setTargetStudents("");
              setDueDate("");
              setDueTime("");
              setResourceName("");
              setResourceUrl("");
              setResourceKind("file");
              setMessage(null);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create task"}
          </button>
        </div>
      </form>
    </section>
  );
}
