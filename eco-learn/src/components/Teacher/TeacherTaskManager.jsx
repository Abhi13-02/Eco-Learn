"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import SectionHeading from "@/components/dashboard/SectionHeading";
import CreateTaskForm from "@/components/CreateTaskForm";

const statusOptions = [
  { value: "accepted", label: "Accept", color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { value: "rejected", label: "Reject", color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100" },
  { value: "pending", label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" },
];

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function TeacherTaskManager() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    grade: "all",
    search: "",
  });

  // Load submissions
  useEffect(() => {
    if (!session?.user?.id) return;
    
    let abort = false;
    setLoading(true);
    setError(null);

    fetch(`${apiUrl}/teacher/submissions?teacherId=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (abort) return;
        if (Array.isArray(data.submissions)) {
          setSubmissions(data.submissions);
        } else {
          setError("Failed to load submissions");
        }
      })
      .catch((err) => {
        if (abort) return;
        setError(err.message || "An error occurred while fetching submissions");
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });

    return () => {
      abort = true;
    };
  }, [apiUrl, session?.user?.id]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      // Filter by status
      if (filters.status !== "all" && submission.status !== filters.status) {
        return false;
      }
      
      // Filter by grade
      if (filters.grade !== "all" && submission.studentGrade !== filters.grade) {
        return false;
      }
      
      // Search by student name or task title
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const studentName = (submission.studentName || "").toLowerCase();
        const taskTitle = (submission.taskTitle || "").toLowerCase();
        
        if (!studentName.includes(searchTerm) && !taskTitle.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [submissions, filters]);

  // Handle review submission
  const handleReviewSubmission = async (newStatus) => {
    if (!activeSubmission || !session?.user?.id) return;
    
    setIsReviewing(true);
    
    try {
      const response = await fetch(`${apiUrl}/tasks/submissions/${activeSubmission.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          feedback: feedback.trim() || undefined,
          reviewerId: session.user.id,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update submission status");
      }
      
      // Update local state
      setSubmissions((prev) => 
        prev.map((sub) => 
          sub.id === activeSubmission.id ? { ...sub, status: newStatus, feedback: feedback.trim() || sub.feedback } : sub
        )
      );
      
      toast.success(`Submission ${newStatus === "accepted" ? "accepted" : newStatus === "rejected" ? "rejected" : "marked as pending"}`);
      setActiveSubmission(null);
      setFeedback("");
    } catch (error) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsReviewing(false);
    }
  };

  // Reset review state
  const resetReview = () => {
    setActiveSubmission(null);
    setFeedback("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeading
          title="Task Manager"
          description="Review student submissions and create new educational tasks"
        />
        <button
          onClick={() => setIsTaskFormOpen(!isTaskFormOpen)}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
        >
          {isTaskFormOpen ? "Cancel" : "Create New Task"}
        </button>
      </div>

      {isTaskFormOpen && (
        <div className="rounded-3xl bg-white p-6 shadow-md">
          <CreateTaskForm />
        </div>
      )}

      <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Student Submissions</h2>
        
        {/* Filters */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Grade</label>
            <select
              value={filters.grade}
              onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All Grades</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Grade {i + 1}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Search</label>
            <input
              type="text"
              placeholder="Search by student name or task..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
        
        {/* Submissions List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4 text-center text-emerald-700">
              Loading submissions...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-red-50/50 p-4 text-center text-red-700">
              {error}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-center text-slate-500">
              No submissions match your filters.
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">{submission.taskTitle}</h3>
                    <p className="text-sm text-slate-600">
                      By <span className="font-medium">{submission.studentName || "Unknown Student"}</span>
                      {submission.studentGrade && ` • Grade ${submission.studentGrade}`}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                        {submission.taskPoints || 0} points
                      </span>
                      <span className={`rounded-full px-3 py-1 ${
                        submission.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : submission.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {submission.status === "accepted"
                          ? "Accepted"
                          : submission.status === "rejected"
                          ? "Rejected"
                          : "Pending"}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setActiveSubmission(submission)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-100"
                  >
                    Review
                  </button>
                </div>

                {submission === activeSubmission && (
                  <div className="mt-4 space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                    {/* Submission details */}
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Submitted {formatDate(submission.submittedAt || submission.createdAt)}
                      </p>
                      
                      {submission.textResponse && (
                        <div className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                          {submission.textResponse}
                        </div>
                      )}
                      
                      {Array.isArray(submission.attachments) && submission.attachments.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-slate-700">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {submission.attachments.map((attachment, index) => (
                              <a
                                key={index}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-emerald-200 hover:text-emerald-600"
                              >
                                <span>
                                  {attachment.kind === "image"
                                    ? "🖼️"
                                    : attachment.kind === "video"
                                    ? "🎬"
                                    : "📎"}
                                </span>
                                <span>{attachment.name || `Attachment ${index + 1}`}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Feedback field */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Feedback</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Enter feedback for the student..."
                          rows={3}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={resetReview}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
                      >
                        Cancel
                      </button>
                      
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleReviewSubmission(option.value)}
                          disabled={isReviewing}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold ${option.color} disabled:opacity-50`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

