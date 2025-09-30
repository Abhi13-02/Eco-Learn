"use client";
import { useEffect, useMemo, useState } from "react";

export default function CollabInvitesForSchool({ schoolAdminUser }) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    if (!schoolAdminUser?.id) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiUrl}/notifications?userId=${encodeURIComponent(schoolAdminUser.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load notifications");
      const invites = (Array.isArray(data?.notifications) ? data.notifications : []).filter((n) => n.type === 'NGO_COLLAB_INVITE');
      setItems(invites);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function act(collabId, action) {
    try {
      const res = await fetch(`${apiUrl}/ngo/invitations/${collabId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: schoolAdminUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed to ${action}`);
      await load();
    } catch (e) { alert(e.message || 'Failed'); }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Collaboration Requests</h3>
        <button className="text-xs font-semibold text-emerald-700 hover:underline" onClick={load}>Refresh</button>
      </div>
      {loading && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-sm">Loading…</div>}
      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>}
      <div className="mt-3 space-y-2">
        {items.map((n) => (
          <div key={n.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{n.title}</p>
              <p className="text-xs text-slate-600">{n.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => act(n.payload?.collabId, 'accept')} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">Accept</button>
              <button onClick={() => act(n.payload?.collabId, 'reject')} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700">Reject</button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No new requests</div>
        )}
      </div>
    </div>
  );
}
