"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton({ className }) {
  function handleLogout() {
    signOut({ callbackUrl: "/" });
  }

  const classes =
    className ||
    "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600";

  return (
    <button type="button" onClick={handleLogout} className={classes}>
      <span>Logout</span>
    </button>
  );
}


