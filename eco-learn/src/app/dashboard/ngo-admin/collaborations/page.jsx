import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth/options";
import NgoSidebar from "@/components/NgoSidebar";
import DashboardShell from "@/components/dashboard/DashboardShell";
import NgoCollabsClient from "@/components/ngo/NgoCollabsClient";

export const metadata = { title: "NGO • Collaborations | Eco-Learn" };

export default async function NgoCollabsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user || {};
  return (
    <div className="flex">
      <NgoSidebar />
      <div className="flex-1">
        <DashboardShell title="Collaborations" subtitle="Track pending and accepted partnerships." accent="🤝">
          <NgoCollabsClient user={user} />
        </DashboardShell>
      </div>
    </div>
  );
}
