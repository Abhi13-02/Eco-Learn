import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import authOptions from "@/lib/auth/options";
import UserMenu from "@/components/UserMenu";
import NgoSidebar from "@/components/NgoSidebar";
import NGOImpactDashboard from "@/components/ngo/NGOImpactDashboard";
import EcoLeaderboard from "@/components/Leaderboard/EcoLeaderboard";
import Link from "next/link";

export const metadata = { title: "NGO Admin Dashboard | Eco-Learn" };

export default async function NgoAdminDashboardPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;
  if (user.role !== "ngoAdmin") {
    redirect("/");
  }
  
  const activeTab = searchParams?.tab || "overview";
  const welcomeName = user.name || user.email || "NGO Admin";

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <NgoSidebar />
      
      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <header className="border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">EcoLearn</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">NGO hub</h1>
              <p className="text-sm text-slate-500">Coordinate environmental initiatives and track your organization's impact.</p>
            </div>
            <UserMenu name={welcomeName} roleLabel="NGO Admin" points={0} badges={0} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "overview", label: "Impact Dashboard" },
              { id: "schools", label: "Browse Schools", href: "/dashboard/ngo-admin/schools" },
              { id: "collaborations", label: "Collaborations", href: "/dashboard/ngo-admin/collaborations" },
              { id: "leaderboard", label: "Leaderboard" },
              { id: "blog", label: "Campaigns", href: "/dashboard/blog" },
            ].map((tab) => (
              <a
                key={tab.id}
                href={tab.href || `/dashboard/ngo-admin?tab=${tab.id}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
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
              {/* Welcome Banner */}
              <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Welcome back, {welcomeName}! 🌍</p>
                    <h2 className="mt-2 text-3xl font-bold">Empower schools with environmental education</h2>
                    <p className="mt-2 max-w-xl text-sm text-emerald-50">
                      Connect with schools, launch environmental campaigns, and track your organization's impact on students' environmental awareness.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Link 
                      href="/dashboard/ngo-admin/schools" 
                      className="rounded-2xl bg-white/90 p-4 text-center shadow-sm text-slate-900 hover:bg-white"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Partner with Schools</p>
                      <p className="mt-2 text-[11px] text-slate-500">Find and collaborate with educational institutions</p>
                    </Link>
                    <Link 
                      href="/dashboard/blog" 
                      className="rounded-2xl bg-white/90 p-4 text-center shadow-sm text-slate-900 hover:bg-white"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Launch Campaigns</p>
                      <p className="mt-2 text-[11px] text-slate-500">Create and share environmental campaigns</p>
                    </Link>
                  </div>
                </div>
              </section>

              <NGOImpactDashboard />
            </>
          )}

          {activeTab === "leaderboard" && (
            <div className="mt-4">
              <EcoLeaderboard
                userId={null}
                schoolId={null}
                defaultGrade={searchParams?.grade || "all"}
                limit={50}
                title="Global eco leaderboard"
                description="Track environmental impact across all schools and see the top eco-warriors making a difference worldwide."
              />
            </div>
          )}
          
          {/* Other tabs are handled by their respective pages */}
        </div>
      </main>
    </div>
  );
}
