import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import TeacherSidebar from "@/components/TeacherSidebar";
import authOptions from "@/lib/auth/options";
import TeacherReviewPanel from "@/components/TeacherReviewPanel";

export const metadata = { title: "Verify Submissions | Eco-Learn" };

export default async function TeacherSubmissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!new Set(["teacher", "schoolAdmin"]).has(session.user.role)) redirect("/");

  return (
    <div className="flex min-h-screen bg-emerald-50/60">
      <TeacherSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50/60">
        <header className="border-b border-emerald-100 bg-white/95 px-4 py-4 shadow-sm sm:px-8">
          <h1 className="text-2xl font-bold text-slate-900">Verify submissions</h1>
          <p className="text-sm text-slate-500">Review, accept or reject, and leave feedback.</p>
        </header>
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
          <TeacherReviewPanel />
        </div>
      </main>
    </div>
  );
}


