"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import FeedCard from "@/components/Blog/FeedCard";
import BlogComposer from "@/components/Blog/BlogComposer";

export default function BlogList() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);
  const [openComposer, setOpenComposer] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl + "/blogs");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load posts");
      const raw = Array.isArray(data?.posts) ? data.posts : Array.isArray(data?.items) ? data.items : [];
      const normalized = raw.map((p) => ({
        id: p.id || p._id || p.slug,
        title: p.title,
        slug: p.slug,
        createdAt: p.createdAt || p.publishedAt || Date.now(),
        excerpt: p.excerpt || (typeof p.content === "string" ? p.content.slice(0, 220) : ""),
        authorName: p.authorName || "Community Member",
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

  useEffect(() => {
    load();
  }, []);

  function openModal() { setOpenComposer(true); }
  function closeModal() { setOpenComposer(false); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Social Feed</h2>
        {(session?.user?.role === "student" || session?.user?.role === "teacher" || session?.user?.role === "schoolAdmin") && (
          <button onClick={openModal} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Write Blog</button>
        )}
      </div>

      {loading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">Loading…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-6">
        {posts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
      </div>

      {openComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-white p-3 shadow">
              <p className="text-sm font-semibold text-slate-800">Write Blog</p>
              <button onClick={closeModal} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-600">Close</button>
            </div>
            <BlogComposer onCreated={() => { closeModal(); load(); }} />
          </div>
        </div>
      )}
    </div>
  );
}


