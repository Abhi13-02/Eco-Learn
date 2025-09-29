"use client";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

export default function SchoolCodeCard({ code }) {

  const displayCode = code || "Unavailable";
  const isCopyable = Boolean(code);

  async function handleCopy() {
    if (!isCopyable) {
      showErrorToast("Join code not available yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      showSuccessToast("Join code copied to clipboard");
    } catch (_error) {
      showErrorToast("Unable to copy join code. Please try again.");
    }
  }

  const buttonClass = [
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
    isCopyable
      ? "bg-emerald-500 text-white hover:bg-emerald-600"
      : "bg-slate-200 text-slate-500 cursor-not-allowed",
  ].join(" ");

  return (
    <div className="rounded-2xl border border-slate-100 bg-emerald-50/50 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">School Join Code</h2>
      <p className="mt-2 text-sm text-slate-600">
        Share this code with teachers and students so they can connect to your school inside Eco-Learn.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <code className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-lg font-mono tracking-[0.3em] text-emerald-700">
          {displayCode}
        </code>
        <button type="button" onClick={handleCopy} disabled={!isCopyable} className={buttonClass}>
          Copy code
        </button>
      </div>

      {!isCopyable ? (
        <p className="mt-3 text-xs text-emerald-600">
          We couldn't find a join code yet. Once your school is fully set up, it will appear here automatically.
          Check the console for more information.
        </p>
      ) : null}
    </div>
  );
}
