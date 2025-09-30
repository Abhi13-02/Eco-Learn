"use client";
import { useEffect, useMemo, useState } from "react";
import { PieCard, BarCard, LineCard } from "@/components/Charts";
import SectionHeading from "@/components/dashboard/SectionHeading";

const defaultOverview = {
  counts: { accepted: 0, pending: 0, rejected: 0 },
  totalPoints: 0,
  week: { labels: [], points: [] },
};

export default function StudentOverviewSection({ studentId }) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [overview, setOverview] = useState(defaultOverview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return undefined;
    let abort = false;
    setLoading(true);
    setError("");

    const endpoint = apiUrl + "/students/" + studentId + "/overview";

    fetch(endpoint, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Failed to load overview");
        }
        return data;
      })
      .then((data) => {
        if (!abort) {
          setOverview({ ...defaultOverview, ...data });
        }
      })
      .catch((err) => {
        if (!abort) setError(err.message || "Unable to load overview");
      })
      .finally(() => {
        if (!abort) setLoading(false);
      });

    return () => {
      abort = true;
    };
  }, [apiUrl, studentId]);

  const stats = [
    { label: "Tasks approved", value: overview.counts.accepted, tone: "text-emerald-600" },
    { label: "Pending reviews", value: overview.counts.pending, tone: "text-amber-600" },
    { label: "Rejected", value: overview.counts.rejected, tone: "text-red-600" },
    { label: "Total points", value: overview.totalPoints, tone: "text-sky-600" },
  ];

  return (
    <section className="space-y-4">
      <SectionHeading
        title="Overview"
        description="Track your learning impact and recent activity at a glance."
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const toneClass = loading ? "text-slate-400" : stat.tone;
          return (
            <div key={stat.label} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {stat.label}
              </p>
              <p className={"mt-2 text-2xl font-bold " + toneClass}>
                {loading ? "—" : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PieCard
          title="Task status"
          labels={["Accepted", "Pending", "Rejected"]}
          data={[overview.counts.accepted, overview.counts.pending, overview.counts.rejected]}
        />
        <BarCard
          title="Points earned this week"
          labels={overview.week.labels}
          seriesLabel="Points"
          data={overview.week.points}
          color="#34d399"
        />
        <LineCard
          title="Weekly streak"
          labels={overview.week.labels}
          seriesLabel="Points"
          data={overview.week.points}
          color="#38bdf8"
        />
      </div>
    </section>
  );
}
