"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export default function BlogList() {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl + "/blogs");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load posts");
      const raw = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.posts)
        ? data.posts
        : [];
      const normalized = raw.map((p) => ({
        id: p.id || p._id || p.slug,
        title: p.title,
        slug: p.slug,
        createdAt: p.createdAt || p.publishedAt || Date.now(),
        excerpt: p.excerpt || (typeof p.content === "string" ? p.content.slice(0, 280) : ""),
        authorName: p.authorName || "Community Member",
        likeCount: typeof p.likesCount === "number" ? p.likesCount : p.likeCount || 0,
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

  function scrollToComposer() {
    const el = typeof document !== "undefined" ? document.getElementById("composer") : null;
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Community Blog</h2>
        {(session?.user?.role === "student" || session?.user?.role === "teacher" || session?.user?.role === "schoolAdmin") && (
          <button onClick={scrollToComposer} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">New post</button>
        )}
      </div>

      {loading && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">Loading…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{post.title}</h3>
                <p className="text-xs text-slate-500">by {post.authorName} • {new Date(post.createdAt).toLocaleDateString()}</p>
              </div>
              {typeof post.likeCount === "number" && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{post.likeCount} likes</span>
              )}
            </header>
            {post.excerpt && <p className="mt-2 text-sm text-slate-700">{post.excerpt}</p>}
            <a href={`/dashboard/blog/${post.slug || post.id}`} className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700">Read more →</a>
          </article>
        ))}
      </div>
    </div>
  );
}


