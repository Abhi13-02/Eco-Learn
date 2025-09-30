"use client";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

export default function BlogComposer({ onCreated }) {
  const { data: session } = useSession();
  const apiUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function presignAndUpload(file) {
    const presign = await fetch(apiUrl + "/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", prefix: "blog/" + (session?.user?.id || "anon") }),
    });
    const data = await presign.json();
    if (!presign.ok) throw new Error(data?.error || "Failed to presign");
    const up = await fetch(data.uploadUrl, { method: data.method || "PUT", headers: data.headers || { "Content-Type": file.type }, body: file });
    if (!up.ok) throw new Error("Failed to upload");
    return { kind: file.type.startsWith("image/") ? "image" : "file", url: data.publicUrl, name: file.name, size: file.size, key: data.key };
  }

  async function submit() {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSubmitting(true);
    try {
      let coverAttachment = undefined;
      if (bannerFile) coverAttachment = await presignAndUpload(bannerFile);

      const uploaded = [];
      for (const f of files) uploaded.push(await presignAndUpload(f));

      const linkAttachments = links
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((url) => ({ kind: "link", url }));

      const res = await fetch(apiUrl + "/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          content,
          youtubeUrl: youtubeUrl.trim() || undefined,
          coverAttachment,
          attachments: [...uploaded, ...linkAttachments],
          authorId: session?.user?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create post");
      toast.success("Post created");
      setTitle("");
      setContent("");
      setYoutubeUrl("");
      setBannerFile(null);
      setFiles([]);
      setLinks("");
      onCreated?.(data?.post || null);
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Create a post</h3>
      <div className="mt-3 space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Share your eco story…" className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Banner image</label>
            <input type="file" accept="image/*" onChange={(e) => setBannerFile((e.target.files || [])[0] || null)} className="mt-1 w-full rounded-2xl border border-dashed border-emerald-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">YouTube URL</label>
            <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtu.be/..." className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Attachments (files)</label>
            <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="mt-1 w-full rounded-2xl border border-dashed border-emerald-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Links (one per line)</label>
            <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={3} placeholder="https://example.com" className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-4 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button onClick={submit} disabled={submitting} className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-70">{submitting ? "Publishing…" : "Publish"}</button>
        </div>
      </div>
    </div>
  );
}


