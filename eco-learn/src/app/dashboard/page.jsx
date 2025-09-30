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

  // Check if user needs onboarding (new Google user)
  if (session?.user?.needsOnboard) {
    console.log("User needs onboarding, redirecting to onboard");
    redirect("/onboard");
  }

  // Handle role from different sources
  let role;
  
  // 1. Try from session
  if (session?.user?.role) {
    role = session.user.role;
    console.log("Using role from session:", role);
  } 
  // 2. Try from search params
  else if (typeof searchParams?.role === "string" && searchParams.role) {
    role = searchParams.role;
    console.log("Using role from URL params:", role);
  }
  
  // Storage access won't work on server component, 
  // Only rely on session and searchParams for server-side rendering

  if (!role) {
    console.log("No role found, redirecting to onboard");
    redirect("/onboard");
  }

  redirect(getDashboardPath(role));
}
