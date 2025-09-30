"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import SectionHeading from "@/components/dashboard/SectionHeading";
import { PieCard } from "@/components/Charts";

export default function StudentManager() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeGrade, setActiveGrade] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load students for the teacher's school
  useEffect(() => {
    if (!session?.user?.id || !session?.user?.orgId) return;
    
    let abort = false;
    setLoading(true);
    setError(null);

    fetch(`${apiUrl}/teacher/students?teacherId=${session.user.id}&schoolId=${session.user.orgId}`)
      .then((res) => res.json())
      .then((data) => {
        if (abort) return;
        if (Array.isArray(data.students)) {
          setStudents(data.students);
        } else {
          setError("Failed to load students");
        }
      })
      .catch((err) => {
        if (abort) return;
        setError(err.message || "An error occurred while fetching students");
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });

    return () => {
      abort = true;
    };
  }, [apiUrl, session?.user?.id, session?.user?.orgId]);

  // Load student details when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setStudentDetails(null);
      return;
    }
    
    let abort = false;
    setDetailsLoading(true);

    fetch(`${apiUrl}/students/${selectedStudent.id}/overview`)
      .then((res) => res.json())
      .then((data) => {
        if (abort) return;
        setStudentDetails(data);
      })
      .catch(() => {
        if (abort) return;
        setStudentDetails({ error: "Failed to load student details" });
      })
      .finally(() => {
        if (!abort) setDetailsLoading(false);
      });

    return () => {
      abort = true;
    };
  }, [apiUrl, selectedStudent]);

  // Filter and group students by grade
  const studentsByGrade = useMemo(() => {
    // Filter by search query
    const filtered = searchQuery 
      ? students.filter((s) => 
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          s.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : students;
    
    // Filter by selected grade
    const gradeFiltered = activeGrade === "all" 
      ? filtered 
      : filtered.filter((s) => s.grade === activeGrade);
    
    // Group by grade
    return gradeFiltered.reduce((acc, student) => {
      const grade = student.grade || "Unassigned";
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);
      return acc;
    }, {});
  }, [students, activeGrade, searchQuery]);

  // Get all unique grades
  const grades = useMemo(() => {
    const gradeSet = new Set(students.map((s) => s.grade).filter(Boolean));
    return Array.from(gradeSet).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Student Manager"
        description="View student progress, track completed tasks, and analyze performance"
      />

      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
        {/* Students List Panel */}
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Students</h2>
            
            <div className="w-full max-w-xs">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveGrade("all")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                activeGrade === "all"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600"
              }`}
            >
              All Grades
            </button>
            
            {grades.map((grade) => (
              <button
                key={grade}
                onClick={() => setActiveGrade(grade)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  activeGrade === grade
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600"
                }`}
              >
                Grade {grade}
              </button>
            ))}
          </div>
          
          <div className="space-y-6">
            {loading ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center text-emerald-700">
                Loading students...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-center text-red-700">
                {error}
              </div>
            ) : Object.keys(studentsByGrade).length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-center text-slate-500">
                No students match your search.
              </div>
            ) : (
              Object.entries(studentsByGrade)
                .sort(([gradeA], [gradeB]) => Number(gradeA) - Number(gradeB))
                .map(([grade, gradeStudents]) => (
                  <div key={grade} className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {grade === "Unassigned" ? "Unassigned" : `Grade ${grade}`} • {gradeStudents.length} student{gradeStudents.length !== 1 ? "s" : ""}
                    </h3>
                    
                    <div className="grid gap-2 sm:grid-cols-2">
                      {gradeStudents.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-emerald-200 ${
                            selectedStudent?.id === student.id
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">
                            {student.name ? student.name[0] : "S"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.name || "Unnamed"}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
        
        {/* Student Details Panel */}
        <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          {!selectedStudent ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              <p className="text-lg font-medium">Select a student</p>
              <p className="mt-1 text-sm">View detailed student information and performance metrics</p>
            </div>
          ) : detailsLoading ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center text-emerald-700">
              Loading details...
            </div>
          ) : studentDetails?.error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 text-center text-red-700">
              {studentDetails.error}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xl text-white">
                    {selectedStudent.name ? selectedStudent.name[0] : "S"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedStudent.name || "Student"}</h2>
                    <p className="text-sm text-slate-500">
                      Grade {selectedStudent.grade || "Unassigned"} • {selectedStudent.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              
              {/* Task Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-emerald-600">Total Points</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{studentDetails?.totalPoints || 0}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-emerald-600">Tasks Completed</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{studentDetails?.counts?.accepted || 0}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-emerald-600">Challenges Completed</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{studentDetails?.challengesCompleted || 0}</p>
                </div>
              </div>
              
              {/* Task Status Distribution */}
              <PieCard 
                title="Task Status Distribution" 
                labels={["Accepted", "Pending", "Rejected"]}
                data={[
                  studentDetails?.counts?.accepted || 0,
                  studentDetails?.counts?.pending || 0,
                  studentDetails?.counts?.rejected || 0,
                ]}
              />
              
              {/* Recent submissions */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Activity</h3>
                {studentDetails?.recentActivity?.length > 0 ? (
                  <div className="space-y-3">
                    {studentDetails.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                        <span className={`mt-1 text-lg ${
                          activity.type === "submission" ? "text-emerald-500" :
                          activity.type === "points" ? "text-amber-500" : "text-blue-500"
                        }`}>
                          {activity.type === "submission" ? "📝" :
                          activity.type === "points" ? "🏆" : "📣"}
                        </span>
                        <div>
                          <p className="text-sm text-slate-700">{activity.description}</p>
                          <p className="text-xs text-slate-500">{activity.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-slate-500">No recent activity.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

