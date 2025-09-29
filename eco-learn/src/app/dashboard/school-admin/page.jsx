import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "School Admin Dashboard | Eco-Learn",
};

export default function SchoolAdminDashboardPage() {
  return (
    <DashboardShell
      title="School Admin Dashboard"
      subtitle="Oversee your institution’s sustainability journey at a glance."
      accent="🏫"
    >
      <div className="grid gap-4 text-slate-600">
        <p>
          Soon you will configure programs, invite teachers, and review participation metrics directly from here.
        </p>
        <p>
          Until those modules arrive, this page serves as the landing spot for admins after signing in—ensuring everyone
          routes to the right space.
        </p>
      </div>
    </DashboardShell>
  );
}
