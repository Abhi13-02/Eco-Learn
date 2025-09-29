"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

export default function BlogPostView({ slugOrId }) {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myReaction, setMyReaction] = useState(null);
  const [commentText, setCommentText] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl + "/blogs/" + slugOrId);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setPost(data?.post || null);
      setMyReaction(data?.post?.myReaction || null);
      const cr = await fetch(apiUrl + "/blogs/" + (data?.post?.id || slugOrId) + "/comments");
      const cd = await cr.json();
      setComments(Array.isArray(cd?.items) ? cd.items : []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slugOrId]);

  async function react(type) {
    try {
      const res = await fetch(apiUrl + "/blogs/" + (post?.id || slugOrId) + "/reactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to react");
      setMyReaction(type);
      setPost((p) => ({ ...p, likeCount: data?.counts?.likes ?? p?.likeCount, dislikeCount: data?.counts?.dislikes ?? p?.dislikeCount }));
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  }

  async function removeReaction() {
    try {
      const res = await fetch(apiUrl + "/blogs/" + (post?.id || slugOrId) + "/reactions", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove reaction");
      setMyReaction(null);
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(apiUrl + "/blogs/" + (post?.id || slugOrId) + "/comments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to comment");
      setCommentText("");
      setComments((prev) => [data?.comment, ...prev]);
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  }

  if (loading) return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">Loading…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>;
  if (!post) return null;

  const reactedLike = myReaction === 'like';
  const reactedDislike = myReaction === 'dislike';

  return (
    <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
        <p className="text-xs text-slate-500">By {post.authorName} • {new Date(post.createdAt).toLocaleString()}</p>
      </header>
      <div className="prose prose-slate mt-4 max-w-none">
        <p className="whitespace-pre-wrap text-slate-800">{post.content}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={() => (reactedLike ? removeReaction() : react('like'))} className={["rounded-full border px-3 py-1 text-sm font-semibold", reactedLike ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600"].join(" ")}>👍 {post.likeCount ?? 0}</button>
        <button onClick={() => (reactedDislike ? removeReaction() : react('dislike'))} className={["rounded-full border px-3 py-1 text-sm font-semibold", reactedDislike ? "border-red-500 text-red-600 bg-red-50" : "border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600"].join(" ")}>👎 {post.dislikeCount ?? 0}</button>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button onClick={submitComment} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Post</button>
        </div>

        <div className="mt-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{c.authorName} • {new Date(c.createdAt).toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-700">{c.text}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-500">Be the first to comment.</p>}
        </div>
      </section>
    </article>
  );
}


