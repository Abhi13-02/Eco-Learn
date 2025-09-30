"use client";
import { useEffect, useMemo, useState } from "react";

export default function NgoCollabsClient({ user }) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!user?.orgId) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiUrl}/ngo/collaborations?ngoId=${encodeURIComponent(user.orgId)}&status=${encodeURIComponent(status)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setRows(Array.isArray(data?.collaborations) ? data.collaborations : []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      {loading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">Loading…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">{row.schoolName}</p>
              <p className="text-xs text-slate-500">Code: {row.schoolCode || "—"}</p>
            </div>
            <span className={{ accepted: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700", pending: "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700", rejected: "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700" }[row.status] || "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
