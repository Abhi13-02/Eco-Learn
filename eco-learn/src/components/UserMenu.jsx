"use client";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

export default function UserMenu({ name, roleLabel, points, badges, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function handleLogout() {
    signOut({ callbackUrl: "/" });
  }

  const containerClass =
    className || "relative inline-flex items-center";

  return (
    <div className={containerClass} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-3xl bg-white px-4 py-2 shadow-sm border border-slate-100 hover:border-emerald-200"
      >
        <div className="h-10 w-10 rounded-full bg-emerald-100" />
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{name || "Member"}</p>
          <p className="text-xs text-emerald-500 leading-tight">{roleLabel}</p>
        </div>
        <div className="ml-2 text-slate-400">▾</div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
          <div className="grid grid-cols-2 gap-2 p-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Points</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{Number(points ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">Badges</p>
              <p className="mt-1 text-xl font-bold text-sky-700">{Number(badges ?? 0)}</p>
            </div>
          </div>

          <div className="mt-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}


