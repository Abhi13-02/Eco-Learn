import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import StudentAssignedTasks from "@/components/StudentAssignedTasks";
import authOptions from "@/lib/auth/options";
import UserMenu from "@/components/UserMenu";

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;
  if (user.role !== "student") {
    redirect("/");
  }

  const welcomeName = user.name || "Eco Warrior";
  const gradeLabel = user.grade ? "Grade " + user.grade : "Explorer";

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const overviewRes = await fetch(`${apiUrl}/students/${user.id}/overview`, { cache: "no-store" }).catch(() => null);
  let overview = { counts: { accepted: 0, pending: 0, rejected: 0 }, totalPoints: 0, week: { labels: [], points: [] } };
  if (overviewRes && overviewRes.ok) {
    try { overview = await overviewRes.json(); } catch {}
  }

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <StudentSidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <header className="border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">EcoLearn</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Student hub</h1>
              <p className="text-sm text-slate-500">Complete missions, earn points, and rise on the leaderboard.</p>
            </div>
            <UserMenu name={welcomeName} roleLabel={gradeLabel} points={overview.totalPoints} badges={overview.badges || 2} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Quick Stats Cards */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Total Points</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{overview.totalPoints || 0}</p>
                  <p className="text-sm text-slate-500">Earned this month</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3">
                  <span className="text-2xl">🌟</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Tasks Completed</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{overview.counts.accepted || 0}</p>
                  <p className="text-sm text-slate-500">Successfully submitted</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Badges Earned</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{overview.badges || 2}</p>
                  <p className="text-sm text-slate-500">Achievement unlocked</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3">
                  <span className="text-2xl">🏆</span>
                </div>
              </div>
            </div>
          </section>

          {/* Welcome Banner */}
          <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Welcome back, {welcomeName}! 🌿</p>
                <h2 className="mt-2 text-3xl font-bold">Ready for your next eco challenge?</h2>
                <p className="mt-2 max-w-xl text-sm text-emerald-50">
                  Complete tasks to earn points, unlock badges, and inspire your classmates with eco-friendly actions.
                </p>
              </div>
              <div className="flex gap-3">
                <a 
                  href="/dashboard/student/overview" 
                  className="rounded-2xl bg-white/90 p-4 text-center shadow-sm text-slate-900 hover:bg-white transition-colors"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">View Overview</p>
                  <p className="mt-2 text-[11px] text-slate-500">See charts & progress</p>
                </a>
              </div>
            </div>
          </section>

          {/* Assigned Tasks */}
          <StudentAssignedTasks studentId={user.id} />

          {/* Quick Actions */}
          <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-500">Explore more features and track your progress.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <a 
                href="/dashboard/student/overview" 
                className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center hover:bg-emerald-100/70 transition-colors"
              >
                <p className="text-2xl">📊</p>
                <p className="mt-2 font-semibold text-emerald-700">View Overview</p>
                <p className="text-xs text-emerald-600">Charts & analytics</p>
              </a>
              <a 
                href="/dashboard/student/ngo" 
                className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center hover:bg-blue-100/70 transition-colors"
              >
                <p className="text-2xl">🤝</p>
                <p className="mt-2 font-semibold text-blue-700">NGO Partners</p>
                <p className="text-xs text-blue-600">Explore collaborations</p>
              </a>
              <a 
                href="/dashboard/blog" 
                className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center hover:bg-amber-100/70 transition-colors"
              >
                <p className="text-2xl">📝</p>
                <p className="mt-2 font-semibold text-amber-700">Blog Posts</p>
                <p className="text-xs text-amber-600">Read latest updates</p>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
