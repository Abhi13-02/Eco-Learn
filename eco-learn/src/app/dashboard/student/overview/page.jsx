import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import { PieCard, BarCard, LineCard } from "@/components/Charts";
import authOptions from "@/lib/auth/options";
import UserMenu from "@/components/UserMenu";

export default async function StudentOverviewPage() {
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
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Student Overview</h1>
              <p className="text-sm text-slate-500">Track your progress, achievements, and environmental impact.</p>
            </div>
            <UserMenu name={welcomeName} roleLabel={gradeLabel} points={overview.totalPoints} badges={overview.badges || 2} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Overview cards with charts */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="h-80">
              <PieCard 
                title="Task Status" 
                labels={["Accepted","Pending","Rejected"]} 
                data={[overview.counts.accepted, overview.counts.pending, overview.counts.rejected]} 
              />
            </div>
            <div className="h-80">
              <BarCard 
                title="Points Over Weeks" 
                labels={overview.week.labels} 
                seriesLabel="Points" 
                data={overview.week.points} 
              />
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Quick Stats</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                <li>Total points: {overview.totalPoints}</li>
                <li>Completed tasks: {overview.counts.accepted}</li>
                <li>Pending tasks: {overview.counts.pending}</li>
                <li>Tasks waiting review: {overview.counts.pending}</li>
                <li>Rejected submissions: {overview.counts.rejected}</li>
              </ul>
            </div>
          </section>

          {/* Achievement Banner */}
          <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Welcome back, {welcomeName}! 🌿</p>
                <h2 className="mt-2 text-3xl font-bold">Your Environmental Impact</h2>
                <p className="mt-2 max-w-xl text-sm text-emerald-50">
                  Track your progress, celebrate achievements, and see how your eco-friendly actions are making a difference.
                </p>
              </div>
              <div className="grid gap-3 text-slate-900 md:grid-cols-3">
                <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Current Streak</p>
                  <p className="mt-1 text-2xl font-bold">{overview.streak || 3} days</p>
                  <p className="text-[11px] text-slate-500">Keep the momentum</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Total Points</p>
                  <p className="mt-1 text-2xl font-bold">{overview.totalPoints || 0}</p>
                  <p className="text-[11px] text-slate-500">Closer to next badge</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Badges Earned</p>
                  <p className="mt-1 text-2xl font-bold">{overview.badges || 2}</p>
                  <p className="text-[11px] text-slate-500">Collect them all</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-500">Explore more features and track your progress.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <a 
                href="/dashboard/student/leaderboard" 
                className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center hover:bg-emerald-100/70 transition-colors"
              >
                <p className="text-2xl">🏆</p>
                <p className="mt-2 font-semibold text-emerald-700">View Leaderboard</p>
                <p className="text-xs text-emerald-600">See your ranking</p>
              </a>
              <a 
                href="/dashboard/student" 
                className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center hover:bg-blue-100/70 transition-colors"
              >
                <p className="text-2xl">📋</p>
                <p className="mt-2 font-semibold text-blue-700">My Tasks</p>
                <p className="text-xs text-blue-600">Complete assignments</p>
              </a>
              <a 
                href="/dashboard/student/ngo" 
                className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center hover:bg-amber-100/70 transition-colors"
              >
                <p className="text-2xl">🤝</p>
                <p className="mt-2 font-semibold text-amber-700">NGO Partners</p>
                <p className="text-xs text-amber-600">Explore collaborations</p>
              </a>
            </div>
          </section>

          {/* Environmental Impact Section */}
          <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Environmental Impact</h2>
            <p className="mt-1 text-sm text-slate-500">Your contributions to environmental sustainability.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center">
                <p className="text-2xl">🌱</p>
                <p className="mt-2 text-lg font-bold text-emerald-700">5.2kg CO₂</p>
                <p className="text-sm text-emerald-600">Reduced</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
                <p className="text-2xl">💧</p>
                <p className="mt-2 text-lg font-bold text-blue-700">125L</p>
                <p className="text-sm text-blue-600">Water Saved</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center">
                <p className="text-2xl">♻️</p>
                <p className="mt-2 text-lg font-bold text-amber-700">8 items</p>
                <p className="text-sm text-amber-600">Recycled</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
