import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Teacher Dashboard | Eco-Learn",
};

export default function TeacherDashboardPage() {
  return (
    <DashboardShell
      title="Teacher Dashboard"
      subtitle="Plan classroom missions, monitor participation, and inspire greener habits."
      accent="🧑‍🏫"
    >
      <div className="grid gap-4 text-slate-600">
        <p>
          This hub will soon surface your active classrooms, upcoming sustainability themes, and suggested resources to
          share with students.
        </p>
        <p>
          For now, treat it as a starting point after login. We will expand it with mission builders, progress tracking,
          and communication tools tailored for educators.
        </p>
      </div>
    </DashboardShell>
  );
}
