import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import TeacherSidebar from "@/components/TeacherSidebar";
import authOptions from "@/lib/auth/options";
import TeacherOverview from "@/components/Teacher/TeacherOverview";
import EcoLeaderboard from "@/components/Leaderboard/EcoLeaderboard";
import TeacherTaskManager from "@/components/Teacher/TeacherTaskManager";
import StudentManager from "@/components/Teacher/StudentManager";
import UserMenu from "@/components/UserMenu";

const allowedRoles = new Set(["teacher", "schoolAdmin"]);

export default async function TeacherDashboardPage({ searchParams }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;
  if (!allowedRoles.has(user.role)) {
    redirect("/");
  }

  const welcomeName = user.name || "Eco Educator";
  const activeTab = searchParams?.tab || "overview";

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <TeacherSidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <header className="border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">EcoLearn</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Teacher hub</h1>
              <p className="text-sm text-slate-500">Manage your class, track progress, and launch new eco missions.</p>
            </div>
            <UserMenu 
              name={welcomeName} 
              roleLabel={user.role === "schoolAdmin" ? "School Admin" : "Teacher"} 
              points={2450} 
              badges={3} 
            />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "tasks", label: "Task Manager" },
              { id: "students", label: "Student Manager" },
              { id: "blog", label: "Blog Posts", href: "/dashboard/blog" },
              { id: "leaderboard", label: "Leaderboard" },
            ].map((tab) => (
              <a
                key={tab.id}
                href={tab.href || `/dashboard/teacher?tab=${tab.id}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab.disabled
                    ? "cursor-not-allowed opacity-50"
                    : activeTab === tab.id
                    ? "bg-emerald-500 text-white"
                    : "hover:bg-emerald-100 hover:text-emerald-600"
                }`}
              >
                {tab.label}
              </a>
            ))}
          </div>

          {activeTab === "overview" && (
            <>
              <section id="welcome-banner" className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Welcome back, {welcomeName}! 🌱</p>
                    <h2 className="mt-2 text-3xl font-bold">Inspire your eco-warriors today.</h2>
                    <p className="mt-2 max-w-xl text-sm text-emerald-50">
                      Share a new challenge, review pending submissions, and celebrate the positive impact your class is making this week.
                    </p>
                  </div>
                  <div className="grid gap-3 text-slate-900 md:grid-cols-3">
                    <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Students</p>
                      <p className="mt-1 text-2xl font-bold">32</p>
                      <p className="text-[11px] text-slate-500">Active this week</p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Pending</p>
                      <p className="mt-1 text-2xl font-bold">5</p>
                      <p className="text-[11px] text-slate-500">Waiting for review</p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Total points</p>
                      <p className="mt-1 text-2xl font-bold">2,450</p>
                      <p className="text-[11px] text-slate-500">Collected this month</p>
                    </div>
                  </div>
                </div>
              </section>

              <TeacherOverview />

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Pending submissions</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep an eye on new student evidence and encourage timely feedback.
                  </p>
                  <div className="mt-4 space-y-3">
                    {[1, 2].map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                      >
                        <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">Arjun Kumar</p>
                          <p className="text-xs text-emerald-600">Waste Segregation Drive • 50 pts</p>
                          <p className="mt-1 text-xs text-slate-500">Submitted 2h ago • Grade 6</p>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href="/dashboard/teacher?tab=tasks" 
                            className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                          >
                            Review
                          </a>
                        </div>
                      </div>
                    ))}
                    <div className="mt-2 text-center">
                      <a 
                        href="/dashboard/teacher?tab=tasks" 
                        className="inline-block rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        View All Submissions
                      </a>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
                  <ul className="mt-3 space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 text-lg">✅</span>
                      <div>
                        <p><strong>Neha Patel</strong> completed <span className="text-emerald-600">Plastic Audit</span>.</p>
                        <p className="text-xs text-slate-400">2 hours ago</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 text-lg">🌟</span>
                      <div>
                        <p><strong>Grade 7</strong> reached <span className="text-emerald-600">500 points</span>.</p>
                        <p className="text-xs text-slate-400">Yesterday</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 text-lg">🎯</span>
                      <div>
                        <p><strong>You</strong> created <span className="text-emerald-600">Biodiversity Survey</span> task.</p>
                        <p className="text-xs text-slate-400">2 days ago</p>
                      </div>
                    </li>
                  </ul>
                  <div className="mt-4 text-center">
                    <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-emerald-200 hover:bg-emerald-50">
                      View All Activity
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}

          {activeTab === "tasks" && <TeacherTaskManager />}
          
          {activeTab === "students" && <StudentManager />}
          
          {activeTab === "leaderboard" && (
            <div className="mt-4">
              <EcoLeaderboard
                userId={user.id}
                schoolId={user.orgType === "SCHOOL" ? user.orgId : null}
                defaultGrade={searchParams?.grade || null}
                limit={30}
                title="School leaderboard"
                description="Monitor class performance, celebrate badge milestones, and spotlight eco leaders across grades."
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
