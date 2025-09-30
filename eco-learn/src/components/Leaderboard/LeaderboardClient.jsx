"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BADGE_THEMES = {
  emerald: {
    chip: "border border-emerald-200 bg-emerald-50/80 text-emerald-700",
    banner: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-sky-500/10",
    accent: "text-emerald-600",
  },
  amber: {
    chip: "border border-amber-200 bg-amber-50/80 text-amber-700",
    banner: "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-400/10",
    accent: "text-amber-600",
  },
  slate: {
    chip: "border border-slate-200 bg-slate-50/80 text-slate-600",
    banner: "bg-gradient-to-r from-slate-500/15 via-slate-400/10 to-slate-300/10",
    accent: "text-slate-600",
  },
  yellow: {
    chip: "border border-yellow-200 bg-yellow-50/80 text-yellow-700",
    banner: "bg-gradient-to-r from-yellow-400/20 via-amber-300/15 to-emerald-200/10",
    accent: "text-yellow-600",
  },
  sky: {
    chip: "border border-sky-200 bg-sky-50/80 text-sky-700",
    banner: "bg-gradient-to-r from-sky-500/20 via-cyan-400/15 to-emerald-200/10",
    accent: "text-sky-600",
  },
  violet: {
    chip: "border border-violet-200 bg-violet-50/80 text-violet-700",
    banner: "bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-pink-400/10",
    accent: "text-violet-600",
  },
  default: {
    chip: "border border-slate-200 bg-slate-50/70 text-slate-600",
    banner: "bg-gradient-to-r from-slate-500/15 via-slate-400/10 to-emerald-200/5",
    accent: "text-slate-600",
  },
};

const HIGHLIGHT_THEMES = {
  podium: "border-emerald-300 bg-emerald-50/80 text-emerald-700 shadow-lg shadow-emerald-200/40",
  badge: "border-amber-300 bg-amber-50/80 text-amber-700 shadow-lg shadow-amber-200/30",
  self: "border-sky-300 bg-sky-50/80 text-sky-700 shadow-lg shadow-sky-200/30",
};

const HIGHLIGHT_LABELS = {
  podium: "Podium",
  badge: "Elite badge",
  self: "You",
};

const gradePattern = /^(?:[1-9]|1[0-2])$/;
const joinClasses = (...values) => values.filter(Boolean).join(" ");

const ensureDataShape = (value) => {
  if (!value || typeof value !== "object") {
    return { meta: { availableGrades: [] }, badges: [], leaderboard: [], podium: [] };
  }
  const meta = value.meta && typeof value.meta === "object" ? value.meta : {};
  return {
    meta: {
      availableGrades: Array.isArray(meta.availableGrades) ? meta.availableGrades : [],
      grade: meta.grade ?? null,
      limit: meta.limit ?? 20,
      includeSelf: Boolean(meta.includeSelf),
      totalEntries: meta.totalEntries ?? 0,
      totalParticipants: meta.totalParticipants ?? 0,
      self: meta.self ?? null,
    },
    badges: Array.isArray(value.badges) ? value.badges : [],
    leaderboard: Array.isArray(value.leaderboard) ? value.leaderboard : [],
    podium: Array.isArray(value.podium) ? value.podium : [],
  };
};

const getBadgeTheme = (theme) => BADGE_THEMES[theme] || BADGE_THEMES.default;

const formatPoints = (points) => {
  const safe = Number(points) || 0;
  return safe.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const gradeLabel = (grade) => {
  if (!grade || grade === "all") return "All grades";
  return "Grade " + grade;
};

export default function LeaderboardClient({
  initialData,
  initialGrade = "all",
  userId,
  schoolId,
  limit = 20,
  title = "Eco leaderboard",
  description = "Celebrate the top eco-warriors and challenge friends to climb the ranks.",
}) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const baseData = ensureDataShape(initialData);
  const [payload, setPayload] = useState(baseData);
  const [grade, setGrade] = useState(initialGrade || baseData.meta.grade || "all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const firstLoadRef = useRef(true);

  const gradeOptions = useMemo(() => {
    const rawGrades = payload.meta.availableGrades
      .filter((value) => typeof value === "string" && gradePattern.test(value.trim()))
      .map((value) => value.trim());
    const uniqueGrades = Array.from(new Set(rawGrades)).sort((a, b) => Number(a) - Number(b));
    return ["all", ...uniqueGrades];
  }, [payload.meta.availableGrades]);

  const podium = payload.podium;
  const entries = payload.leaderboard;
  const badges = payload.badges;
  const selfMeta = payload.meta.self;

  const fetchLeaderboard = useCallback(
    async (targetGrade, controller) => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (targetGrade && targetGrade !== "all") {
        params.set("grade", targetGrade);
      }
      if (schoolId) params.set("school", schoolId);
      if (userId) params.set("userId", userId);

      const requestUrl = apiUrl + "/leaderboard?" + params.toString();

      try {
        const response = await fetch(requestUrl, {
          cache: "no-store",
          signal: controller?.signal,
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json?.error || "Failed to load leaderboard data");
        }
        if (!controller?.signal?.aborted) {
          setPayload(ensureDataShape(json));
          setError("");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!controller?.signal?.aborted) {
          setError(err.message || "Failed to load leaderboard data");
        }
      }
    },
    [apiUrl, limit, schoolId, userId]
  );

  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return; // Already have server-side data
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetchLeaderboard(grade, controller).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [fetchLeaderboard, grade]);

  const handleRefresh = async () => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    try {
      await fetchLeaderboard(grade, controller);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const renderBadgeChip = (badge, size = "md") => {
    if (!badge) return null;
    const theme = getBadgeTheme(badge.theme);
    const sizeClasses =
      size === "lg"
        ? "px-4 py-2 text-sm"
        : size === "sm"
        ? "px-2 py-1 text-[11px]"
        : "px-3 py-1 text-xs";

    return (
      <span
        key={badge.code}
        className={joinClasses(
          "inline-flex items-center gap-2 rounded-full font-semibold",
          theme.chip,
          sizeClasses
        )}
      >
        <span className="text-lg">{badge.icon || "🎖️"}</span>
        <span>{badge.name}</span>
      </span>
    );
  };

  const isEmpty = entries.length === 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl">
      <div className="pointer-events-none absolute -left-32 top-[-20%] h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-[-10%] h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />

      <header className="flex flex-col gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-500/5 via-teal-500/10 to-sky-500/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-500">Eco leaderboard</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-emerald-600 shadow-sm">
            <span className="hidden text-xs uppercase tracking-[0.25em] text-emerald-400 sm:inline">Grade</span>
            <select
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="rounded-full bg-transparent text-sm font-semibold text-emerald-700 outline-none"
              disabled={loading}
            >
              {gradeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All grades" : "Grade " + option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className={joinClasses(
              "rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50",
              loading && "cursor-not-allowed opacity-60"
            )}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="space-y-6 px-6 py-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading && !error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4 text-sm text-emerald-600 shadow-sm">
            <span className="inline-block h-3 w-3 animate-ping rounded-full bg-emerald-500" />
            Updating leaderboard…
          </div>
        ) : null}

        {isEmpty && !loading ? (
          <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-8 text-center shadow-inner">
            <p className="text-lg font-semibold text-slate-700">No eco missions scored yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Complete tasks to earn points and watch the leaderboard come alive.
            </p>
          </div>
        ) : null}

        {!isEmpty ? (
          <>
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-sky-500/10 p-6 shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Podium</h3>
                  <p className="text-xs font-semibold text-emerald-700">Top {Math.min(3, entries.length)} performers</p>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {podium.map((entry) => {
                    const theme = entry.currentBadge ? getBadgeTheme(entry.currentBadge.theme) : BADGE_THEMES.default;
                    const crown = entry.rank === 1 ? "👑" : entry.rank === 2 ? "🥈" : "🥉";
                    const scale = entry.rank === 1 ? "md:scale-105" : entry.rank === 2 ? "md:-translate-y-2" : "md:translate-y-1";
                    return (
                      <div
                        key={entry.userId}
                        className={joinClasses(
                          "relative flex flex-col items-center justify-center rounded-3xl border bg-white/90 p-5 text-center shadow-lg shadow-emerald-900/5 transition",
                          theme.banner,
                          scale
                        )}
                      >
                        <div className="absolute -top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl shadow">
                          {crown}
                        </div>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">Rank {entry.rank}</p>
                        <h4 className="mt-2 text-lg font-bold text-slate-900">{entry.name}</h4>
                        <p className="text-xs text-slate-500">
                          {entry.grade ? "Grade " + entry.grade : "All grades"}
                          {entry.schoolName ? " • " + entry.schoolName : ""}
                        </p>
                        <p className="mt-3 text-3xl font-extrabold text-emerald-700">{formatPoints(entry.points)} pts</p>
                        {entry.currentBadge ? (
                          <div className="mt-3">{renderBadgeChip(entry.currentBadge)}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {selfMeta ? (
                  <div className="rounded-3xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-sky-700">Your standing</p>
                    <p className="mt-2 text-3xl font-extrabold text-sky-800">#{selfMeta.rank ?? "—"}</p>
                    <p className="text-xs text-sky-600">
                      {formatPoints(selfMeta.points)} pts {selfMeta.grade ? "• Grade " + selfMeta.grade : ""}
                    </p>
                    <p className="mt-3 text-xs text-sky-600">
                      Keep completing eco missions to climb the ladder and unlock new badges.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-100 bg-white/80 p-5 text-sm text-slate-600 shadow-sm">
                    Log in as a student to see your personal rank and progress.
                  </div>
                )}

                <div className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-emerald-700">Leaderboard stats</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Players tracked</p>
                      <p className="text-lg font-bold text-slate-900">{payload.meta.totalParticipants}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Showing</p>
                      <p className="text-lg font-bold text-slate-900">Top {payload.meta.limit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Filter</p>
                      <p className="text-lg font-bold text-slate-900">{gradeLabel(grade)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Leaderboard tiers</h3>
              {entries.map((entry) => {
                const highlightClasses = entry.highlightReasons
                  .map((reason) => HIGHLIGHT_THEMES[reason])
                  .filter(Boolean);

                const cardClasses = highlightClasses.length
                  ? highlightClasses[0]
                  : "border-slate-100 bg-white/80 text-slate-700 hover:border-emerald-200/60 hover:shadow-md";

                return (
                  <article
                    key={entry.userId}
                    className={joinClasses(
                      "rounded-3xl border p-5 transition-all duration-300",
                      cardClasses
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl font-extrabold text-emerald-600">
                          #{entry.rank}
                        </span>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{entry.name}</p>
                          <p className="text-xs text-slate-500">
                            {entry.grade ? "Grade " + entry.grade : "All grades"}
                            {entry.schoolName ? " • " + entry.schoolName : ""}
                          </p>
                          {entry.highlightReasons.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.highlightReasons.map((reason) => (
                                <span
                                  key={reason}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                                >
                                  {HIGHLIGHT_LABELS[reason] || reason}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.currentBadge ? (
                            <div className="flex items-center gap-2">
                              {renderBadgeChip(entry.currentBadge, "lg")}
                              <span className="text-xs font-semibold text-slate-500">
                                {entry.badges.length} badge{entry.badges.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500">No badges yet</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-500">Total points</p>
                          <p className="text-3xl font-extrabold text-emerald-700">{formatPoints(entry.points)}</p>
                          {entry.nextBadge ? (
                            <p className="text-xs text-slate-500">
                              {entry.pointsToNextBadge > 0
                                ? entry.pointsToNextBadge + " pts to " + entry.nextBadge.name
                                : "Eligible for " + entry.nextBadge.name}
                            </p>
                          ) : (
                            <p className="text-xs text-emerald-700">Max badge unlocked!</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {entry.badges.length > 1 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.badges.slice(0, 6).map((badge) => renderBadgeChip(badge, "sm"))}
                        {entry.badges.length > 6 ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            +{entry.badges.length - 6} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {badges.length ? (
          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 shadow-inner">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Badge ladder</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {badges.map((badge) => {
                const theme = getBadgeTheme(badge.theme);
                return (
                  <div
                    key={badge.code}
                    className={joinClasses(
                      "flex flex-col gap-1 rounded-2xl border bg-white/90 p-3 text-sm shadow-sm",
                      theme.banner
                    )}
                  >
                    <span className={joinClasses("text-lg", theme.accent)}>{badge.icon || "🎖️"}</span>
                    <span className="font-semibold text-slate-800">{badge.name}</span>
                    <span className="text-xs text-slate-500">{badge.threshold} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
