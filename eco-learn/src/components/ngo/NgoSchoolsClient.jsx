"use client";
import { useEffect, useMemo, useState } from "react";

export default function NgoSchoolsClient({ user }) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  async function load() {
    if (!user?.orgId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/ngo/schools?ngoId=${encodeURIComponent(user.orgId)}&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load schools");
      setRows(Array.isArray(data?.schools) ? data.schools : []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function invite(schoolId) {
    if (!user?.orgId) return;
    try {
      const res = await fetch(`${apiUrl}/ngo/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ngoId: user.orgId, schoolId, actorId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send invite");
      await load();
    } catch (e) {
      alert(e.message || "Failed to invite");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or code" className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <button onClick={load} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Search</button>
      </div>
      {loading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">Loading…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-900">{row.name}</p>
              <p className="text-xs text-slate-500">Code: {row.code}</p>
            </div>
            <div className="flex items-center gap-2">
              {row.status === "accepted" && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Collaborating</span>}
              {row.status === "pending" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Invite Sent</span>}
              {row.status === "rejected" && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Rejected</span>}
              {(!row.status || row.status === "none" || row.status === "cancelled") && (
                <button onClick={() => invite(row.id)} className="rounded-full border border-emerald-200 px-4 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Invite</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
