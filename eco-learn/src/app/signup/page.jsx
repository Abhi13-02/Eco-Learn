"use client";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { getDashboardPath } from "@/lib/dashboardRoutes";
import { showErrorToast, showSuccessToast, showInfoToast } from "@/lib/toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const GRADE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));

const SIGNUP_CONFIG = {
  student: {
    label: "Student",
    icon: "🎓",
    description: "Access lessons, challenges, and leaderboards curated for your grade.",
    headline: "Join as a Student",
    subheading: "Use your school's access code to connect with classmates and start learning.",
    cta: "Create Student Account",
    supportsGoogle: true,
    googleWarning: "Add your school code, name, and grade before continuing with Google.",
    endpoint: "/auth/join-school",
    required: ["schoolCode", "name", "email", "password", "grade"],
    googleRequired: ["schoolCode", "name", "grade"],
    fields: [
      {
        name: "schoolCode",
        label: "School Code",
        placeholder: "E.g. ECO123",
        autoComplete: "off",
        required: true,
      },
      {
        name: "name",
        label: "Full Name",
        placeholder: "Your full name",
        autoComplete: "name",
        required: true,
      },
      {
        name: "email",
        label: "Email Address",
        placeholder: "name@example.com",
        type: "email",
        autoComplete: "email",
        required: true,
        hideForGoogle: true,
      },
      {
        name: "password",
        label: "Password",
        placeholder: "Create a password",
        type: "password",
        autoComplete: "new-password",
        required: true,
        hideForGoogle: true,
      },
      {
        name: "grade",
        label: "Grade",
        type: "select",
        options: GRADE_OPTIONS,
        placeholder: "Select your grade",
        required: true,
        help: "Grade helps us deliver the right level of content.",
      },
    ],
    initialValues: {
      schoolCode: "",
      name: "",
      email: "",
      password: "",
      grade: "",
    },
    buildPayload: (form) => ({
      code: form.schoolCode,
      role: "student",
      name: form.name,
      email: form.email,
      password: form.password,
      grade: form.grade,
    }),
    credentials: (form) => ({ email: form.email, password: form.password }),
    buildGooglePayload: (form) => ({
      role: "student",
      code: form.schoolCode,
      name: form.name,
      grade: form.grade,
      provider: "google",
    }),
  },
  teacher: {
    label: "Teacher",
    icon: "🧑‍🏫",
    description: "Lead classes, assign eco-missions, and track collective impact.",
    headline: "Join as a Teacher",
    subheading: "Enter your school's access code so we can link you to your community.",
    cta: "Create Teacher Account",
    supportsGoogle: true,
    googleWarning: "Add your school code, name, and bio before continuing with Google.",
    endpoint: "/auth/join-school",
    required: ["schoolCode", "name", "email", "password", "bio"],
    googleRequired: ["schoolCode", "name", "bio"],
    fields: [
      {
        name: "schoolCode",
        label: "School Code",
        placeholder: "E.g. ECO123",
        autoComplete: "off",
        required: true,
      },
      {
        name: "name",
        label: "Full Name",
        placeholder: "Your full name",
        autoComplete: "name",
        required: true,
      },
      {
        name: "email",
        label: "Email Address",
        placeholder: "name@example.com",
        type: "email",
        autoComplete: "email",
        required: true,
        hideForGoogle: true,
      },
      {
        name: "password",
        label: "Password",
        placeholder: "Create a password",
        type: "password",
        autoComplete: "new-password",
        required: true,
        hideForGoogle: true,
      },
      {
        name: "bio",
        label: "Short Bio",
        placeholder: "Tell students about your teaching focus",
        type: "textarea",
        autoComplete: "off",
        required: true,
        help: "Share a quick intro students will see in their dashboards.",
      },
    ],
    initialValues: {
      schoolCode: "",
      name: "",
      email: "",
      password: "",
      bio: "",
    },
    buildPayload: (form) => ({
      code: form.schoolCode,
      role: "teacher",
      name: form.name,
      email: form.email,
      password: form.password,
      teacherBio: form.bio,
    }),
    credentials: (form) => ({ email: form.email, password: form.password }),
    buildGooglePayload: (form) => ({
      role: "teacher",
      code: form.schoolCode,
      name: form.name,
      teacherBio: form.bio,
      provider: "google",
    }),
  },
  schoolAdmin: {
    label: "School Admin",
    icon: "🏫",
    description: "Set up your school, invite staff, and monitor participation.",
    headline: "Create a School Admin Account",
    subheading: "Launch Eco-Learn for your institution in a few steps.",
    cta: "Create School Account",
    supportsGoogle: true,
    googleWarning: "Add your school details before continuing with Google.",
    endpoint: "/auth/school",
    required: ["schoolName", "adminName", "adminEmail", "password"],
    googleRequired: ["schoolName", "adminName"],
    fields: [
      {
        name: "schoolName",
        label: "School Name",
        placeholder: "E.g. Green Valley High",
        autoComplete: "organization",
        required: true,
      },
      {
        name: "adminName",
        label: "Your Name",
        placeholder: "Full name",
        autoComplete: "name",
        required: true,
      },
      {
        name: "adminEmail",
        label: "Work Email",
        placeholder: "you@school.edu",
        type: "email",
        autoComplete: "email",
        required: true,
        hideForGoogle: true,
      },
      {
        name: "password",
        label: "Password",
        placeholder: "Create a password",
        type: "password",
        autoComplete: "new-password",
        required: true,
        hideForGoogle: true,
      },
    ],
    initialValues: {
      schoolName: "",
      adminName: "",
      adminEmail: "",
      password: "",
    },
    buildPayload: (form) => ({
      schoolName: form.schoolName,
      adminName: form.adminName,
      adminEmail: form.adminEmail,
      password: form.password,
    }),
    credentials: (form) => ({ email: form.adminEmail, password: form.password }),
    buildGooglePayload: (form) => ({
      role: "schoolAdmin",
      schoolName: form.schoolName,
      adminName: form.adminName,
      provider: "google",
    }),
  },
  ngoAdmin: {
    label: "NGO Admin",
    icon: "🌍",
    description: "Coordinate sustainable missions and report on your impact.",
    headline: "Create an NGO Admin Account",
    subheading: "Register your organisation and start inviting volunteers.",
    cta: "Create NGO Account",
    supportsGoogle: true,
    googleWarning: "Add your NGO details before continuing with Google.",
    endpoint: "/auth/ngo",
    required: ["ngoName", "adminName", "adminEmail", "password"],
    googleRequired: ["ngoName", "adminName"],
    fields: [
      {
        name: "ngoName",
        label: "NGO Name",
        placeholder: "E.g. Earth Allies",
        autoComplete: "organization",
        required: true,
      },
      {
        name: "adminName",
        label: "Your Name",
        placeholder: "Full name",
        autoComplete: "name",
        required: true,
      },
      {
        name: "adminEmail",
        label: "Work Email",
        placeholder: "you@ngo.org",
        type: "email",
        autoComplete: "email",
        required: true,
        hideForGoogle: true,
      },
      {
        name: "password",
        label: "Password",
        placeholder: "Create a password",
        type: "password",
        autoComplete: "new-password",
        required: true,
        hideForGoogle: true,
      },
    ],
    initialValues: {
      ngoName: "",
      adminName: "",
      adminEmail: "",
      password: "",
    },
    buildPayload: (form) => ({
      ngoName: form.ngoName,
      adminName: form.adminName,
      adminEmail: form.adminEmail,
      password: form.password,
    }),
    credentials: (form) => ({ email: form.adminEmail, password: form.password }),
    buildGooglePayload: (form) => ({
      role: "ngoAdmin",
      ngoName: form.ngoName,
      adminName: form.adminName,
      provider: "google",
    }),
  },
};

const ROLE_ORDER = Object.keys(SIGNUP_CONFIG);

export default function SignupPage() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState(ROLE_ORDER[0]);
  const [forms, setForms] = useState(() => {
    const initial = {};
    ROLE_ORDER.forEach((role) => {
      initial[role] = { ...SIGNUP_CONFIG[role].initialValues };
    });
    return initial;
  });
  const [methods, setMethods] = useState(() => {
    const initial = {};
    ROLE_ORDER.forEach((role) => {
      initial[role] = "email";
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);

  const config = SIGNUP_CONFIG[activeRole];
  const activeForm = forms[activeRole];
  const signupMethod = config.supportsGoogle ? methods[activeRole] : "email";
  const submitLabel = signupMethod === "google"
    ? "Continue with Google"
    : loading
      ? "Creating account..."
      : config.cta;

  function updateField(name, value) {
    setForms((prev) => ({
      ...prev,
      [activeRole]: { ...prev[activeRole], [name]: value },
    }));
  }

  function changeMethod(method) {
    if (!config.supportsGoogle) return;
    setMethods((prev) => ({
      ...prev,
      [activeRole]: method,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (signupMethod === "google") {
      handleGoogleSignup();
      return;
    }

    const missing = config.required.filter((fieldName) => {
      const fieldConfig = config.fields.find((field) => field.name === fieldName);
      if (signupMethod === "google" && fieldConfig && fieldConfig.hideForGoogle) {
        return false;
      }
      const fieldValue = activeForm[fieldName];
      return !String(fieldValue ?? "").trim();
    });

    if (missing.length > 0) {
      showErrorToast("Please fill in all required fields for this role.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API + config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.buildPayload(activeForm)),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = typeof data?.error === "string" ? data.error : "Signup failed";
        throw new Error(message);
      }

      const credentials = config.credentials(activeForm);
      const loginResult = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });
      if (loginResult?.error) {
        throw new Error("Account created but automatic login failed. Please sign in manually.");
      }

      const session = await getSession();
      const role = session?.user?.role || activeRole;
      const destination = getDashboardPath(role);

      showSuccessToast("Account created successfully");
      router.push(destination);
      router.refresh();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignup() {
    if (!config.supportsGoogle || !config.buildGooglePayload) {
      showErrorToast("Google sign-up is not available for this role.");
      return;
    }

    const requiredForGoogle = config.googleRequired || [];
    const missing = requiredForGoogle.filter((fieldName) => {
      const fieldValue = activeForm[fieldName];
      return !String(fieldValue ?? "").trim();
    });
    if (missing.length > 0) {
      showErrorToast(
        config.googleWarning || "Please complete the highlighted fields before continuing with Google."
      );
      return;
    }

    const payload = config.buildGooglePayload(activeForm);
    try {
      // Store in both localStorage and sessionStorage for better reliability
      window.localStorage.setItem("onboard", JSON.stringify(payload));
      window.sessionStorage.setItem("onboard", JSON.stringify(payload));
      
      // Also store role separately for easier access
      window.localStorage.setItem("onboard_role", payload.role);
      window.sessionStorage.setItem("onboard_role", payload.role);
      
      console.log("Stored onboarding data:", payload);
      showInfoToast("Redirecting to Google sign-up...");
      
      // Use redirect: false to avoid Next.js routing issues
      signIn("google", { 
        callbackUrl: "/onboard",
        redirect: true
      });
    } catch (err) {
      console.error("Error during Google signup:", err);
      showErrorToast("Unable to open Google sign-up. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-3xl border border-emerald-100 bg-white/95 p-8 shadow-xl backdrop-blur md:flex-row md:p-12">
        <aside className="md:w-72">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">Eco-Learn</p>
            <h1 className="mt-4 text-3xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-3 text-sm text-slate-600">
              Choose the role that matches how you take part in Eco-Learn and we will tailor the onboarding to match our model requirements.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {ROLE_ORDER.map((role) => {
              const option = SIGNUP_CONFIG[role];
              const isActive = role === activeRole;
              const baseClass = "w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none";
              const activeClass = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm";
              const inactiveClass = "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600";
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setActiveRole(role);
                  }}
                  className={baseClass + " " + (isActive ? activeClass : inactiveClass)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{option.icon}</div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="text-xs leading-snug text-slate-500">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <header className="space-y-2">
            <p className="text-sm font-medium text-emerald-600">{config.label} Sign-up</p>
            <h2 className="text-2xl font-bold text-slate-900">{config.headline}</h2>
            <p className="text-sm text-slate-600">{config.subheading}</p>
          </header>

          {config.supportsGoogle && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sign up using</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-xs">
                {[
                  { id: "email", label: "Email & Password" },
                  { id: "google", label: "Google" },
                ].map((option) => {
                  const isSelected = signupMethod === option.id;
                  const buttonClass =
                    "rounded-2xl border px-3 py-3 text-sm font-medium transition focus:outline-none" +
                    (isSelected
                      ? " border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : " border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600");
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={buttonClass}
                      onClick={() => changeMethod(option.id)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {signupMethod === "google" && (
                <p className="mt-2 text-xs text-slate-500">
                  Email and password will be handled by Google. We only need the fields below to connect your organisation.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {config.fields.map((field) => {
              if (signupMethod === "google" && field.hideForGoogle) {
                return null;
              }

              const value = activeForm[field.name] ?? "";
              const label = field.label + (field.required ? " *" : "");
              const baseClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100";

              let control = null;
              if (field.type === "textarea") {
                control = (
                  <textarea
                    id={field.name}
                    value={value}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    required={signupMethod === "google" ? false : field.required}
                    rows={4}
                    className={baseClass + " resize-none"}
                  />
                );
              } else if (field.type === "select") {
                control = (
                  <select
                    id={field.name}
                    value={value}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    required={field.required}
                    className={baseClass}
                  >
                    <option value="">Select an option</option>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                );
              } else {
                control = (
                  <input
                    id={field.name}
                    type={field.type || "text"}
                    value={value}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    autoComplete={field.autoComplete}
                    required={signupMethod === "google" ? false : field.required}
                    className={baseClass}
                  />
                );
              }

              return (
                <div key={field.name} className="space-y-1">
                  <label className="text-sm font-medium text-slate-700" htmlFor={field.name}>
                    {label}
                  </label>
                  {control}
                  {field.help ? <p className="text-xs text-slate-500">{field.help}</p> : null}
                </div>
              );
            })}
            <button
              type="submit"
              disabled={signupMethod !== "google" && loading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitLabel}
            </button>
          </form>
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <a href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">
          Sign in here
        </a>
      </p>
    </main>
  );
}
