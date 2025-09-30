import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import TeacherSidebar from "@/components/TeacherSidebar";
import UserMenu from "@/components/UserMenu";
import CollabInvitesForSchool from "@/components/ngo/CollabInvitesForSchool";
import SchoolCodeCard from "@/components/dashboard/SchoolCodeCard";
import SchoolAdminOverview from "@/components/School/SchoolAdminOverview";
import EcoLeaderboard from "@/components/Leaderboard/EcoLeaderboard";
import authOptions from "@/lib/auth/options";

export const metadata = { title: "School Admin Dashboard | Eco-Learn" };

export default async function SchoolAdminDashboardPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;
  if (user.role !== "schoolAdmin") {
    redirect("/");
  }

  const activeTab = searchParams?.tab || "overview";
  const welcomeName = user.name || user.email || "School Admin";
  
  const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let schoolCode = user.orgCode || user.schoolCode || null;
  let fetchError = null;

  if (!schoolCode && user.orgType === "SCHOOL" && user.orgId) {
    try {
      const response = await fetch(`${backendUrl}/auth/school/${user.orgId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok) {
        schoolCode = data?.code || schoolCode;
      } else {
        fetchError = data?.error || `API error: ${response.status}`;
      }
    } catch (error) {
      fetchError = error.message || "Network error while fetching school code";
    }
  } else if (!user.orgId || user.orgType !== "SCHOOL") {
    try {
      if (user?.email) {
        const url = `${backendUrl}/auth/school?email=${encodeURIComponent(user.email)}`;
        const response = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
        const data = await response.json();
        if (response.ok) {
          schoolCode = data?.code || schoolCode;
        } else {
          fetchError = data?.error || `API error (fallback): ${response.status}`;
        }
      }
    } catch (error) {
      fetchError = error.message || "Network error during fallback request";
    }
  }

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <TeacherSidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <header className="border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">EcoLearn</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">School Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Oversee your institution's sustainability journey at a glance.</p>
            </div>
            <UserMenu name={welcomeName} roleLabel="School Admin" points={0} badges={0} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "users", label: "Manage Users" },
              { id: "analytics", label: "School Analytics" },
              { id: "blog", label: "Blog Posts", href: "/dashboard/blog" },
              { id: "leaderboard", label: "Leaderboard" },
            ].map((tab) => (
              <a
                key={tab.id}
                href={tab.href || `/dashboard/school-admin?tab=${tab.id}`}
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

          {/* School Code and Error Message */}
          <SchoolCodeCard code={schoolCode} />
          
          {fetchError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              <h3 className="font-semibold">Error fetching school code</h3>
              <p className="mt-1 text-sm">{fetchError}</p>
              <p className="mt-2 text-xs text-red-600">Please ensure your account is properly configured and the backend server is running.</p>
            </div>
          )}
          
          {/* NGO Collaboration Invites */}
          <CollabInvitesForSchool schoolAdminUser={user} />

          {activeTab === "overview" && (
            <>
              {/* Welcome Banner */}
              <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Welcome back, {welcomeName}! 🏫</p>
                    <h2 className="mt-2 text-3xl font-bold">Lead your school's environmental journey</h2>
                    <p className="mt-2 max-w-xl text-sm text-emerald-50">
                      Monitor school-wide progress, manage educators and students, and foster a culture of sustainability.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm text-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">NGO Partnerships</p>
                      <p className="mt-1 text-2xl font-bold">3</p>
                      <p className="text-[11px] text-slate-500">Active collaborations</p>
                    </div>
                    <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm text-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">School Code</p>
                      <p className="mt-1 text-2xl font-bold">{schoolCode || "—"}</p>
                      <p className="text-[11px] text-slate-500">For registration</p>
                    </div>
                  </div>
                </div>
              </section>

              <SchoolAdminOverview />
            </>
          )}

          {activeTab === "users" && (
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
              <p className="mt-1 text-sm text-slate-500">Add, edit, and manage teachers and students accounts.</p>
              <div className="mt-8 flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <p className="text-slate-400">User management interface will be available soon</p>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">School Analytics</h2>
              <p className="mt-1 text-sm text-slate-500">Detailed analytics about your school's environmental impact.</p>
              <div className="mt-8 flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <p className="text-slate-400">Detailed analytics will be available soon</p>
              </div>
            </div>
          )}
          
          {activeTab === "leaderboard" && (
            <div className="mt-4">
              <EcoLeaderboard
                userId={null}
                schoolId={user.orgType === "SCHOOL" ? user.orgId : null}
                defaultGrade={searchParams?.grade || "all"}
                limit={50}
                title="School leaderboard"
                description="Monitor school-wide performance, celebrate achievements, and track environmental impact across all grades."
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
