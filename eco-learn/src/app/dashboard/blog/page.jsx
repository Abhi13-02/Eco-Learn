import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import TeacherSidebar from "@/components/TeacherSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import authOptions from "@/lib/auth/options";
import BlogList from "@/components/Blog/BlogList";
import BlogComposer from "@/components/Blog/BlogComposer";

export const metadata = { title: "Blog Posts | Eco-Learn" };

export default async function BlogIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = session.user.role;

  // Sidebar chosen by role (admin reuses teacher sidebar look for now)
  const Sidebar = role === "teacher" || role === "schoolAdmin" ? TeacherSidebar : StudentSidebar;

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <DashboardShell title="Blog Posts" subtitle="Share and discover eco stories from your community." accent="📝">
          <div className="grid gap-6">
            <BlogList />
            <div id="composer">
              <BlogComposer />
            </div>
          </div>
        </DashboardShell>
      </main>
    </div>
  );
}


