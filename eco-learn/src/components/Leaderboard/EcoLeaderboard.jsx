import LeaderboardClient from "./LeaderboardClient";

const EMPTY_STATE = {
  meta: { availableGrades: [], grade: null, limit: 20, includeSelf: false, totalEntries: 0, totalParticipants: 0, self: null },
  badges: [],
  leaderboard: [],
  podium: [],
};

const buildUrl = (baseUrl, params) => {
  const query = params.toString();
  return query ? baseUrl + "?" + query : baseUrl;
};

async function fetchInitialLeaderboard(apiUrl, params) {
  const endpoint = buildUrl(apiUrl + "/leaderboard", params);
  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      return EMPTY_STATE;
    }
    const json = await response.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return EMPTY_STATE;
    }
    return {
      meta: json.meta || EMPTY_STATE.meta,
      badges: Array.isArray(json.badges) ? json.badges : [],
      leaderboard: Array.isArray(json.leaderboard) ? json.leaderboard : [],
      podium: Array.isArray(json.podium) ? json.podium : [],
    };
  } catch (error) {
    return EMPTY_STATE;
  }
}

export default async function EcoLeaderboard({
  userId,
  schoolId,
  defaultGrade = null,
  limit = 20,
  title = "Eco leaderboard",
  description = "Track the top point earners and badge holders across the mission.",
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  if (defaultGrade && defaultGrade !== "all") {
    params.set("grade", String(defaultGrade));
  }
  if (schoolId) {
    params.set("school", String(schoolId));
  }
  if (userId) {
    params.set("userId", String(userId));
  }

  const initialData = await fetchInitialLeaderboard(apiUrl, params);
  const initialGrade = initialData.meta && typeof initialData.meta.grade === "string" && initialData.meta.grade
    ? initialData.meta.grade
    : (defaultGrade || "all");

  return (
    <LeaderboardClient
      initialData={initialData}
      initialGrade={initialGrade}
      userId={userId ? String(userId) : null}
      schoolId={schoolId ? String(schoolId) : null}
      limit={limit}
      title={title}
      description={description}
    />
  );
}
