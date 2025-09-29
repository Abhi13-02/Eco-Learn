import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import authOptions from "@/lib/auth/options";
import { getDashboardPath } from "@/lib/dashboardRoutes";

export const metadata = {
  title: "Dashboard | Eco-Learn",
};

export default async function DashboardIndexPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const hintedRole = typeof searchParams?.role === "string" ? searchParams.role : undefined;
  const role = session.user?.role || hintedRole;

  if (!role) {
    redirect("/onboard");
  }

  redirect(getDashboardPath(role));
}
