import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import EcoLeaderboard from "@/components/Leaderboard/EcoLeaderboard";
import authOptions from "@/lib/auth/options";
import UserMenu from "@/components/UserMenu";

export default async function StudentLeaderboardPage() {
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
  let overview = { totalPoints: 0 };
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
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Leaderboard</h1>
              <p className="text-sm text-slate-500">See how you stack up against your classmates and unlock new eco titles.</p>
            </div>
            <UserMenu name={welcomeName} roleLabel={gradeLabel} points={overview.totalPoints} badges={overview.badges || 2} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Achievement Banner */}
          <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Ready to climb the ranks, {welcomeName}? 🏆</p>
                <h2 className="mt-2 text-3xl font-bold">Your Eco Journey</h2>
                <p className="mt-2 max-w-xl text-sm text-emerald-50">
                  Complete tasks, earn points, and unlock badges to rise through the leaderboard ranks. 
                  Every eco-friendly action counts!
                </p>
              </div>
              <div className="grid gap-3 text-slate-900 md:grid-cols-3">
                <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Your Points</p>
                  <p className="mt-1 text-2xl font-bold">{overview.totalPoints || 0}</p>
                  <p className="text-[11px] text-slate-500">Keep earning more</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Badges Earned</p>
                  <p className="mt-1 text-2xl font-bold">{overview.badges || 2}</p>
                  <p className="text-[11px] text-slate-500">Collect them all</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Current Streak</p>
                  <p className="mt-1 text-2xl font-bold">{overview.streak || 3} days</p>
                  <p className="text-[11px] text-slate-500">Stay consistent</p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Leaderboard */}
          <div className="mt-8">
            <EcoLeaderboard
              userId={user.id}
              schoolId={user.orgType === "SCHOOL" ? user.orgId : null}
              defaultGrade={user.grade || null}
              limit={50}
              title="Class Leaderboard"
              description="See how you stack up against classmates and unlock new eco titles."
            />
          </div>

          {/* Badge Showcase */}
          <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Badge Collection</h2>
            <p className="mt-1 text-sm text-slate-500">Unlock new badges by reaching point milestones and completing challenges.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center">
                <p className="text-2xl">🌱</p>
                <p className="mt-2 font-semibold text-emerald-700">Eco Starter</p>
                <p className="text-xs text-emerald-600">0+ points</p>
                <div className="mt-2 h-2 rounded-full bg-emerald-200">
                  <div className="h-2 w-full rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center">
                <p className="text-2xl">🌿</p>
                <p className="mt-2 font-semibold text-amber-700">Green Thumb</p>
                <p className="text-xs text-amber-600">100+ points</p>
                <div className="mt-2 h-2 rounded-full bg-amber-200">
                  <div className="h-2 w-3/4 rounded-full bg-amber-500"></div>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
                <p className="text-2xl">🌊</p>
                <p className="mt-2 font-semibold text-blue-700">Ocean Protector</p>
                <p className="text-xs text-blue-600">250+ points</p>
                <div className="mt-2 h-2 rounded-full bg-blue-200">
                  <div className="h-2 w-1/2 rounded-full bg-blue-500"></div>
                </div>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4 text-center">
                <p className="text-2xl">🌍</p>
                <p className="mt-2 font-semibold text-purple-700">Earth Guardian</p>
                <p className="text-xs text-purple-600">500+ points</p>
                <div className="mt-2 h-2 rounded-full bg-purple-200">
                  <div className="h-2 w-1/4 rounded-full bg-purple-500"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-500">Take action to climb the leaderboard and earn more points.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <a 
                href="/dashboard/student" 
                className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center hover:bg-emerald-100/70 transition-colors"
              >
                <p className="text-2xl">📋</p>
                <p className="mt-2 font-semibold text-emerald-700">Complete Tasks</p>
                <p className="text-xs text-emerald-600">Earn points & badges</p>
              </a>
              <a 
                href="/dashboard/student/overview" 
                className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center hover:bg-blue-100/70 transition-colors"
              >
                <p className="text-2xl">📊</p>
                <p className="mt-2 font-semibold text-blue-700">View Progress</p>
                <p className="text-xs text-blue-600">Track your growth</p>
              </a>
              <a 
                href="/dashboard/student/ngo" 
                className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-center hover:bg-amber-100/70 transition-colors"
              >
                <p className="text-2xl">🤝</p>
                <p className="mt-2 font-semibold text-amber-700">NGO Partners</p>
                <p className="text-xs text-amber-600">Join collaborations</p>
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
