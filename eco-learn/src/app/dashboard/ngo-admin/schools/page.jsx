import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth/options";
import NgoSidebar from "@/components/NgoSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import NgoSchoolsClient from "@/components/ngo/NgoSchoolsClient";

export const metadata = { title: "NGO • Schools | Eco-Learn" };

export default async function NgoSchoolsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user || {};
  return (
    <div className="flex">
      <NgoSidebar />
      <div className="flex-1">
        <DashboardShell title="Schools Directory" subtitle="Find registered schools and invite them to collaborate." accent="🤝">
          <NgoSchoolsClient user={user} />
        </DashboardShell>
      </div>
    </div>
  );
}
