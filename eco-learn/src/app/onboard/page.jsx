"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { getDashboardPath } from "@/lib/dashboardRoutes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function OnboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    async function finalizeOnboarding() {
      if (status === "loading") return;
      if (status !== "authenticated") {
        showErrorToast("You need to be signed in to finish onboarding.");
        return;
      }

      // Safely access storage (try both localStorage and sessionStorage)
      let raw;
      let storageType = "";
      
      try {
        // Try localStorage first
        if (typeof window !== "undefined" && window.localStorage) {
          raw = window.localStorage.getItem("onboard");
          if (raw) {
            storageType = "localStorage";
            console.log("Found onboard data in localStorage");
          }
        }
        
        // If not found, try sessionStorage
        if (!raw && typeof window !== "undefined" && window.sessionStorage) {
          raw = window.sessionStorage.getItem("onboard");
          if (raw) {
            storageType = "sessionStorage";
            console.log("Found onboard data in sessionStorage");
          }
        }
        
        // Check for separate role storage if main data is missing
        if (!raw && typeof window !== "undefined") {
          const role = window.localStorage.getItem("onboard_role") || 
                       window.sessionStorage.getItem("onboard_role");
          
          if (role === "ngoAdmin") {
            // Reconstruct basic payload for NGO
            console.log("Using fallback from onboard_role:", role);
            raw = JSON.stringify({
              role: "ngoAdmin",
              provider: "google",
              ngoName: session?.user?.name + "'s Organization",
              adminName: session?.user?.name
            });
            storageType = "fallback";
          }
        }
        
        console.log("Onboard data source:", storageType);
        console.log("Raw onboard data:", raw ? raw.substring(0, 100) : "null");
      } catch (err) {
        console.error("Error reading from storage:", err);
        raw = null;
      }

      if (!raw) {
        console.log("No onboarding data found in any storage. Session:", session);
        const fallbackRole = session?.user?.role;
        router.replace(fallbackRole ? getDashboardPath(fallbackRole) : "/");
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (!parsed || !parsed.role) {
        showErrorToast("Signup details were incomplete. Please start over.");
        localStorage.removeItem("onboard");
        return;
      }

      const role = parsed.role;
      const currentUser = session?.user ?? {};
      let request;
      let buildSessionPatch;

      if (role === "student" || role === "teacher") {
        const code = typeof parsed.code === "string" ? parsed.code.trim() : "";
        if (!code) {
          showErrorToast("Missing school code. Please start the signup again.");
          localStorage.removeItem("onboard");
          return;
        }

        const payload = {
          code,
          role,
          name: parsed.name || currentUser.name,
          email: currentUser.email,
        };

        if (role === "student") {
          const grade = parsed.grade ? String(parsed.grade).trim() : "";
          if (!grade) {
            showErrorToast("Grade is required to finish student onboarding. Please start again.");
            localStorage.removeItem("onboard");
            return;
          }
          payload.grade = grade;
        }

        if (role === "teacher") {
          const teacherBio = typeof parsed.teacherBio === "string" ? parsed.teacherBio.trim() : "";
          if (!teacherBio) {
            showErrorToast("Teacher bio is required to finish onboarding. Please start again.");
            localStorage.removeItem("onboard");
            return;
          }
          payload.teacherBio = teacherBio;
        }

        request = {
          url: API + "/auth/join-school-social",
          body: payload,
        };

        buildSessionPatch = (data) => {
          const user = data?.user ?? {};
          return {
            ...currentUser,
            id: user.id ?? currentUser.id,
            name: user.name ?? currentUser.name,
            email: user.email ?? currentUser.email,
            role: user.role ?? role,
            orgType: user.orgType ?? "SCHOOL",
            orgId: user.orgId ?? user.schoolId ?? null,
            grade: user.grade ?? null,
            teacherBio: user.teacherBio ?? null,
          };
        };
      } else if (role === "schoolAdmin") {
        const schoolName = typeof parsed.schoolName === "string" ? parsed.schoolName.trim() : "";
        const adminName = typeof parsed.adminName === "string" && parsed.adminName.trim()
          ? parsed.adminName.trim()
          : currentUser.name || currentUser.email;
        if (!schoolName) {
          showErrorToast("School name is required. Please start again.");
          localStorage.removeItem("onboard");
          return;
        }

        request = {
          url: API + "/auth/school",
          body: {
            schoolName,
            adminName,
            adminEmail: currentUser.email,
            provider: "google",
          },
        };

        buildSessionPatch = (data) => {
          const school = data?.school ?? {};
          const admin = data?.admin ?? {};
          return {
            ...currentUser,
            id: admin.id ?? currentUser.id,
            name: admin.name ?? adminName,
            email: admin.email ?? currentUser.email,
            role: "schoolAdmin",
            orgType: "SCHOOL",
            orgId: school.id ?? null,
            grade: null,
            teacherBio: null,
          };
        };
      } else if (role === "ngoAdmin") {
        const ngoName = typeof parsed.ngoName === "string" ? parsed.ngoName.trim() : "";
        const adminName = typeof parsed.adminName === "string" && parsed.adminName.trim()
          ? parsed.adminName.trim()
          : currentUser.name || currentUser.email;
        if (!ngoName) {
          showErrorToast("NGO name is required. Please start again.");
          localStorage.removeItem("onboard");
          return;
        }

        request = {
          url: API + "/auth/join-ngo-social",
          body: {
            ngoName,
            adminName,
            adminEmail: currentUser.email,
            provider: "google",
          },
        };

        buildSessionPatch = (data) => {
          const ngo = data?.ngo ?? {};
          const admin = data?.admin ?? {};
          return {
            ...currentUser,
            id: admin.id ?? currentUser.id,
            name: admin.name ?? adminName,
            email: admin.email ?? currentUser.email,
            role: "ngoAdmin",
            orgType: "NGO",
            orgId: ngo.id ?? null,
            grade: null,
            teacherBio: null,
          };
        };
      } else {
        showErrorToast("Unsupported signup role. Please start again.");
        localStorage.removeItem("onboard");
        return;
      }

      try {
        console.log("Making API request to:", request.url);
        console.log("Request body:", JSON.stringify(request.body));
        
        const response = await fetch(request.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request.body),
        });
        
        console.log("API response status:", response.status);
        const data = await response.json();
        console.log("API response data:", data);
        
        if (!response.ok) {
          throw new Error(data?.error || `Onboarding failed with status ${response.status}`);
        }

        let destination = getDashboardPath(role);

        if (typeof update === "function") {
          const nextUser = buildSessionPatch(data);
          await update({ user: nextUser });
          destination = getDashboardPath(nextUser.role ?? role);
        }

        // Clean up all storage items
        try {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("onboard");
            window.localStorage.removeItem("onboard_role");
            window.sessionStorage.removeItem("onboard");
            window.sessionStorage.removeItem("onboard_role");
          }
        } catch (e) {
          console.error("Error cleaning up storage:", e);
        }
        
        router.replace(destination);
        showSuccessToast("You're all set! Redirecting to your dashboard...");
      } catch (err) {
        console.error("Onboarding error:", err);
        
        // Handle fetch errors differently from API errors
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          showErrorToast("Network error: Please check your connection and try again");
        } else {
          showErrorToast(err instanceof Error ? err.message : "Onboarding failed");
        }
        
        // For network errors, keep data for retry
        if (err.name !== 'TypeError') {
          try {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("onboard");
              window.localStorage.removeItem("onboard_role");
              window.sessionStorage.removeItem("onboard");
              window.sessionStorage.removeItem("onboard_role");
            }
          } catch (e) {
            console.error("Error cleaning up storage after error:", e);
          }
        }
      }
    }

    finalizeOnboarding();
  }, [status, session, update, router]);

  return (
    <main className="p-6 space-y-2">
      <p>Finalizing your account...</p>
    </main>
  );
}
