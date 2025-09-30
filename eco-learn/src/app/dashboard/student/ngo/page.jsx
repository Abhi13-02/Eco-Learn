import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth/options";
import StudentSidebar from "@/components/StudentSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import NgoFeedClient from "@/components/ngo/NgoFeedClient";

export const metadata = { title: "NGO Updates | Eco-Learn" };

export default async function StudentNgoFeedPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user || {};
  return (
    <div className="flex">
      <StudentSidebar />
      <div className="flex-1">
        <DashboardShell title="NGO Updates" subtitle="Campaigns and resources from partner NGOs." accent="🌍">
          <NgoFeedClient user={user} />
        </DashboardShell>
      </div>
    </div>
  );
}
