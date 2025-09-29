import DashboardShell from "@/components/dashboard/DashboardShell";
import UserMenu from "@/components/UserMenu";

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
        <div className="flex items-center justify-end">
          <UserMenu name="NGO Admin" roleLabel="NGO Admin" points={0} badges={0} />
        </div>
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
