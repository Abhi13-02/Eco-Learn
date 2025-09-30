"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PieCard, BarCard } from "@/components/Charts";

export default function TeacherOverview() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    let abort = false;
    setLoading(true);
    fetch(`${apiUrl}/teacher/tasks/summary?teacherId=${session.user.id}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (abort) return;
        if (ok) setItems(Array.isArray(d.items) ? d.items : []);
      })
      .finally(() => !abort && setLoading(false));
    return () => { abort = true; };
  }, [apiUrl, session?.user?.id]);

  const totals = items.reduce(
    (acc, it) => {
      acc.accepted += it.accepted || 0;
      acc.pending += it.pending || 0;
      acc.rejected += it.rejected || 0;
      return acc;
    },
    { accepted: 0, pending: 0, rejected: 0 }
  );

  const top = [...items].sort((a, b) => (b.accepted || 0) - (a.accepted || 0)).slice(0, 5);
  const barLabels = top.map((t) => t.title);
  const barData = top.map((t) => t.accepted || 0);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Overview</h2>
        <button
          onClick={() => {
            const el = typeof document !== 'undefined' ? document.getElementById('create-task') : null;
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Create task
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PieCard title="Submissions status" labels={["Accepted","Pending","Rejected"]} data={[totals.accepted, totals.pending, totals.rejected]} />
        <BarCard title="Accepted by task (Top 5)" labels={barLabels} seriesLabel="Accepted" data={barData} />
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Quick stats</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>Total tasks: {items.length}</li>
            <li>Accepted: {totals.accepted}</li>
            <li>Pending: {totals.pending}</li>
            <li>Rejected: {totals.rejected}</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Your tasks</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Accepted</th>
                <th className="px-3 py-2">Pending</th>
                <th className="px-3 py-2">Rejected</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{it.title}</td>
                  <td className="px-3 py-2">{it.points}</td>
                  <td className="px-3 py-2 text-emerald-700">{it.accepted || 0}</td>
                  <td className="px-3 py-2 text-slate-600">{it.pending || 0}</td>
                  <td className="px-3 py-2 text-red-600">{it.rejected || 0}</td>
                  <td className="px-3 py-2 font-semibold">{it.total || 0}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td className="px-3 py-4 text-slate-500" colSpan={6}>{loading ? 'Loading…' : 'No tasks yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


