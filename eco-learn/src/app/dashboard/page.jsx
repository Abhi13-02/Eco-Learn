import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import authOptions from "@/lib/auth/options";
import { getDashboardPath } from "@/lib/dashboardRoutes";

export const metadata = {
  title: "Dashboard | Eco-Learn",
};

export default async function DashboardIndexPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!role) {
    redirect("/login");
  }

  redirect(getDashboardPath(role));
}
