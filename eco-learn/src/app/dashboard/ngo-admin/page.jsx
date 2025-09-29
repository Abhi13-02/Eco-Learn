import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "NGO Admin Dashboard | Eco-Learn",
};

export default function NgoAdminDashboardPage() {
  return (
    <DashboardShell
      title="NGO Admin Dashboard"
      subtitle="Coordinate community initiatives and highlight your impact."
      accent="🌍"
    >
      <div className="grid gap-4 text-slate-600">
        <p>
          We are preparing tailored tools to help you manage volunteers, document events, and share success stories
          across partner schools.
        </p>
        <p>
          For the moment, this dashboard gives NGO leads a consistent destination post-login while we expand the
          feature set.
        </p>
      </div>
    </DashboardShell>
  );
}
