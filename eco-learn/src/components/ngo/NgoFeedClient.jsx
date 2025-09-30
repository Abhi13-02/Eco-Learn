"use client";
import { useEffect, useMemo, useState } from "react";
import FeedCard from "@/components/Blog/FeedCard";

export default function NgoFeedClient({ user }) {
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/ngo/feed?studentId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load feed");
      const raw = Array.isArray(data?.posts) ? data.posts : [];
      const normalized = raw.map((p) => ({
        id: p.id || p._id || p.slug,
        title: p.title,
        slug: p.slug,
        createdAt: p.createdAt || p.publishedAt || Date.now(),
        excerpt: p.excerpt || (typeof p.content === "string" ? p.content.slice(0, 220) : ""),
        authorName: p.authorName || "NGO",
        authorImage: p.authorImage || null,
        likeCount: typeof p.likesCount === "number" ? p.likesCount : p.likeCount || 0,
        coverUrl: p.coverAttachment?.url || null,
        tags: Array.isArray(p.tags) ? p.tags : [],
      }));
      setPosts(normalized);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      {loading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">Loading…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        {posts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && !loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No NGO posts yet.</div>
        )}
      </div>
    </div>
  );
}
