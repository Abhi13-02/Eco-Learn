import { getServerSession } from "next-auth";

import DashboardShell from "@/components/dashboard/DashboardShell";
import SchoolCodeCard from "@/components/dashboard/SchoolCodeCard";
import authOptions from "@/lib/auth/options";

export const metadata = {
  title: "School Admin Dashboard | Eco-Learn",
};

export default async function SchoolAdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? {};
  
  // Debug session data
  console.log("School admin page - session user data:", JSON.stringify(user, null, 2));
  const backendUrl =
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  let schoolCode = user.orgCode || user.schoolCode || null;
  let fetchError = null;

  if (!schoolCode && user.orgType === "SCHOOL" && user.orgId) {
    console.log("Fetching school code for orgId:", user.orgId);
    try {
      const response = await fetch(`${backendUrl}/auth/school/${user.orgId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await response.json();

      if (response.ok) {
        console.log("School data received:", data);
        schoolCode = data?.code || schoolCode;
        if (!data?.code) {
          console.warn("No school code found in API response:", data);
        }
      } else {
        fetchError = data?.error || `API error: ${response.status}`;
        console.error("Failed to fetch school code:", fetchError, data);
      }
    } catch (error) {
      fetchError = error.message || "Network error while fetching school code";
      console.error("Exception while fetching school code:", error);
    }
  } else if (!user.orgId || user.orgType !== "SCHOOL") {
    console.warn("Cannot fetch school code - missing orgId or invalid orgType:", { 
      orgId: user.orgId, 
      orgType: user.orgType 
    });

    // Fallback: try to resolve via admin email
    try {
      if (user?.email) {
        const url = `${backendUrl}/auth/school?email=${encodeURIComponent(user.email)}`;
        console.log("Fallback fetch by email:", url);
        const response = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
        const data = await response.json();
        if (response.ok) {
          console.log("Fallback school data received:", data);
          schoolCode = data?.code || schoolCode;
          if (!schoolCode) {
            console.warn("No code in fallback response", data);
          }
        } else {
          fetchError = data?.error || `API error (fallback): ${response.status}`;
          console.error("Fallback request failed:", fetchError, data);
        }
      }
    } catch (error) {
      fetchError = error.message || "Network error during fallback request";
      console.error("Fallback exception:", error);
    }
  }

  return (
    <DashboardShell
      title="School Admin Dashboard"
      subtitle="Oversee your institution’s sustainability journey at a glance."
      accent="🏫"
    >
      <div className="grid gap-6 text-slate-600">
        <SchoolCodeCard code={schoolCode} />
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            <h3 className="font-semibold">Error fetching school code</h3>
            <p className="mt-1 text-sm">{fetchError}</p>
            <p className="mt-2 text-xs text-red-600">
              Please ensure your account is properly configured and the backend server is running.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p>
            Soon you will configure programs, invite teachers, and review participation metrics directly from here.
          </p>
          <p className="mt-3">
            Until those modules arrive, this page serves as the landing spot for admins after signing in—ensuring
            everyone routes to the right space.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
