import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Student Dashboard | Eco-Learn",
};

export default function StudentDashboardPage() {
  return (
    <DashboardShell
      title="Student Dashboard"
      subtitle="Track your progress, explore new eco-missions, and celebrate wins with your classmates."
      accent="🎓"
    >
      <div className="grid gap-4 text-slate-600">
        <p>
          Welcome back! Soon this space will highlight your current challenges, showcase recent achievements, and
          recommend lessons tailored to your grade.
        </p>
        <p>
          While we build the full experience, use this page as your home base after signing in. From here you will
          launch lessons, view leaderboards, and connect with your eco-team.
        </p>
      </div>
    </DashboardShell>
  );
}
