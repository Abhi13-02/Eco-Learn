"use client";
import { useState } from "react";

export default function FeedCard({ post }) {
  const created = new Date(post.createdAt);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);

  function toggleLike() {
    setLiked((v) => !v);
    setLikes((n) => (liked ? Math.max(0, n - 1) : n + 1));
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-emerald-100">
            {post.authorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.authorImage} alt={post.authorName || "Author"} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">{post.authorName || "Community Member"}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{created.toLocaleDateString()}</span>
              <span>•</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">public</span>
              <span>•</span>
              <span className="text-slate-500">Photo</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-3">
        <a href={`/dashboard/blog/${post.slug || post.id}`} className="text-lg font-semibold text-slate-900 hover:text-emerald-600">
          {post.title}
        </a>
        {post.excerpt && <p className="mt-1 text-sm text-slate-700">{post.excerpt}</p>}
      </div>

      {post.coverUrl && (
        <div className="mt-4 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl} alt={post.title} className="h-72 w-full object-cover" />
        </div>
      )}

      {Array.isArray(post.tags) && post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">#{t}</span>
          ))}
        </div>
      )}

      <footer className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <button type="button" onClick={toggleLike} className={["flex items-center gap-2", liked ? "text-emerald-600" : "hover:text-emerald-600"].join(" ")}>❤ <span>{likes}</span></button>
            <button type="button" onClick={() => setShowComments((v) => !v)} className="flex items-center gap-2 hover:text-emerald-600">💬 <span>Comment</span></button>
            <button type="button" className="flex items-center gap-2 hover:text-emerald-600">🔗 <span>Share</span></button>
          </div>
          <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-600">
            Challenge Submission
          </button>
        </div>

        {showComments && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>Comments will appear here. Click to open the post to add yours.</p>
          </div>
        )}
      </footer>
    </article>
  );
}


