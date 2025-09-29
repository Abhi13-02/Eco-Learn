import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StudentSidebar from "@/components/StudentSidebar";
import TeacherSidebar from "@/components/TeacherSidebar";
import authOptions from "@/lib/auth/options";
import BlogPostView from "@/components/Blog/BlogPostView";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  const Sidebar = role === "teacher" || role === "schoolAdmin" ? TeacherSidebar : StudentSidebar;
  const slug = params.slug;

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
          <BlogPostView slugOrId={slug} />
        </div>
      </main>
    </div>
  );
}


