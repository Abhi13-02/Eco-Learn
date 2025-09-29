"use client";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { getDashboardPath } from "@/lib/dashboardRoutes";
import { showErrorToast, showSuccessToast, showInfoToast } from "@/lib/toast";

const roleOptions = [
  {
    id: "student",
    label: "Student",
    description: "Access lessons and track your eco-progress",
    icon: "🎓",
  },
  {
    id: "teacher",
    label: "Teacher",
    description: "Guide classrooms toward greener choices",
    icon: "🧑‍🏫",
  },
  {
    id: "schoolAdmin",
    label: "Admin",
    description: "Oversee your school's sustainability journey",
    icon: "🏫",
  },
  {
    id: "ngoAdmin",
    label: "NGO",
    description: "Lead community-driven eco programs",
    icon: "🌍",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(roleOptions[0].id);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      showErrorToast("Invalid email or password");
      return;
    }

    const session = await getSession();
    const role = session?.user?.role || selectedRole;
    const destination = getDashboardPath(role);

    showSuccessToast("Signed in successfully");
    router.push(destination);
    router.refresh();
  }

  const activeRole = roleOptions.find((role) => role.id === selectedRole);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl grid gap-10 rounded-3xl border border-emerald-100 bg-white/95 p-10 shadow-lg backdrop-blur">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">Eco-Learn</p>
          <h1 className="text-3xl font-bold text-slate-900">Welcome Back!</h1>
          <p className="text-sm text-slate-500">Sign in to continue your eco-journey.</p>
        </header>

        <section className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Select Your Role</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {roleOptions.map((role) => {
              const isActive = role.id === selectedRole;
              const classes = [
                "rounded-2xl border px-3 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-400",
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                  : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600",
              ].join(" ");
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={classes}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold">{role.label}</p>
                    <p className="text-xs leading-snug text-slate-500">
                      {role.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-lg text-emerald-500">
                ✉️
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-lg text-emerald-500">
                🔒
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing In..." : `Sign in as ${activeRole?.label ?? "Member"}`}
          </button>
        </form>

        <div className="space-y-3">
          <div className="relative flex items-center justify-center">
            <span className="h-px w-full bg-slate-200" aria-hidden="true" />
            <span className="absolute bg-white px-3 text-xs uppercase tracking-wide text-slate-400">
              or continue with
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              showInfoToast("Redirecting to Google sign-in...");
              const target = `/dashboard?role=${selectedRole}`;
              signIn("google", { callbackUrl: target });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
          >
            <span className="text-lg">🔗</span>
            <span>Sign in with Google</span>
          </button>
        </div>

        <p className="text-center text-sm text-slate-500">
          New user?{" "}
          <a href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-500">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
