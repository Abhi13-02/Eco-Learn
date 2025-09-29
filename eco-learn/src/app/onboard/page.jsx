"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { getDashboardPath } from "@/lib/dashboardRoutes";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function OnboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function finalizeOnboarding() {
      if (status === "loading") return;
      if (status !== "authenticated") {
        setError("You need to be signed in to finish onboarding.");
        return;
      }

      const raw = typeof window !== "undefined" ? localStorage.getItem("onboard") : null;
      if (!raw) {
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
        setError("Signup details were incomplete. Please start over.");
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
          setError("Missing school code. Please start the signup again.");
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
            setError("Grade is required to finish student onboarding. Please start again.");
            localStorage.removeItem("onboard");
            return;
          }
          payload.grade = grade;
        }

        if (role === "teacher") {
          const teacherBio = typeof parsed.teacherBio === "string" ? parsed.teacherBio.trim() : "";
          if (!teacherBio) {
            setError("Teacher bio is required to finish onboarding. Please start again.");
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
          setError("School name is required. Please start again.");
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
          setError("NGO name is required. Please start again.");
          localStorage.removeItem("onboard");
          return;
        }

        request = {
          url: API + "/auth/ngo",
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
        setError("Unsupported signup role. Please start again.");
        localStorage.removeItem("onboard");
        return;
      }

      try {
        const response = await fetch(request.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request.body),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Onboarding failed");
        }

        let destination = getDashboardPath(role);

        if (typeof update === "function") {
          const nextUser = buildSessionPatch(data);
          await update({ user: nextUser });
          destination = getDashboardPath(nextUser.role ?? role);
        }

        localStorage.removeItem("onboard");
        router.replace(destination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onboarding failed");
      }
    }

    finalizeOnboarding();
  }, [status, session, update, router]);

  return (
    <main className="p-6 space-y-2">
      <p>Finalizing your account...</p>
      {error && <p className="text-red-600">{error}</p>}
    </main>
  );
}
