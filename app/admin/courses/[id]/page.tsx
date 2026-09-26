"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  videoStorageKey: string | null;
  resourceUrl: string | null;
  resourceStorageKey: string | null;
  durationSeconds: number | null;
  published: boolean;
};
type Module = { id: string; title: string; lessons: Lesson[] };
type Course = { id: string; title: string; published: boolean; modules: Module[] };

// Uploads a file for a lesson asset, choosing proxy vs presigned-direct
// automatically based on size — see lib/upload-validation.ts for the
// proxy ceiling.
async function uploadLessonAsset(file: File, kind: "lesson-video" | "lesson-resource"): Promise<string> {
  const PROXY_MAX = 25 * 1024 * 1024;
  if (file.size <= PROXY_MAX) {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch("/api/admin/uploads", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.storageKey;
  }

  const presignRes = await fetch("/api/admin/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, filename: file.name, contentType: file.type, sizeBytes: file.size }),
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignJson.error);

  const putRes = await fetch(presignJson.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!putRes.ok) throw new Error("Direct upload to storage failed.");

  return presignJson.storageKey;
}

export default function AdminCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/courses/${id}`);
    const json = await res.json();
    setCourse(json.course ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;
    await fetch(`/api/admin/courses/${id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModuleTitle }),
    });
    setNewModuleTitle("");
    load();
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Delete this module and all its lessons?")) return;
    await fetch(`/api/admin/modules/${moduleId}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p>Loading…</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{course.title}</h1>
      <p className="mb-6 text-sm text-gray-500">{course.published ? "Published" : "Unpublished"}</p>

      <div className="space-y-6">
        {course.modules.map((m) => (
          <div key={m.id} className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{m.title}</h2>
              <button onClick={() => deleteModule(m.id)} className="text-xs text-red-600">
                Delete module
              </button>
            </div>

            <div className="space-y-3">
              {m.lessons.map((l) => (
                <LessonRow key={l.id} lesson={l} onChanged={load} />
              ))}
            </div>

            <NewLessonForm moduleId={m.id} onCreated={load} />
          </div>
        ))}
      </div>

      <form onSubmit={addModule} className="mt-6 flex max-w-md gap-2">
        <input
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          placeholder="New module title…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Add module
        </button>
      </form>
    </div>
  );
}

function LessonRow({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
  async function togglePublished() {
    await fetch(`/api/admin/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !lesson.published }),
    });
    onChanged();
  }

  async function remove() {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    await fetch(`/api/admin/lessons/${lesson.id}`, { method: "DELETE" });
    onChanged();
  }

  const hasVideo = lesson.videoUrl || lesson.videoStorageKey;
  const hasResource = lesson.resourceUrl || lesson.resourceStorageKey;

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{lesson.title}</p>
        <p className="text-xs text-gray-400">
          {hasVideo ? "🎬 video" : "no video"} · {hasResource ? "📎 resource" : "no resource"}
          {lesson.durationSeconds ? ` · ${Math.round(lesson.durationSeconds / 60)} min` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePublished}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            lesson.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {lesson.published ? "Published" : "Draft"}
        </button>
        <button onClick={remove} className="text-xs text-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}

function NewLessonForm({ moduleId, onCreated }: { moduleId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let videoStorageKey: string | undefined;
      let resourceStorageKey: string | undefined;

      if (videoFile) videoStorageKey = await uploadLessonAsset(videoFile, "lesson-video");
      if (resourceFile) resourceStorageKey = await uploadLessonAsset(resourceFile, "lesson-resource");

      const res = await fetch(`/api/admin/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          videoUrl: videoUrl || null,
          videoStorageKey,
          resourceUrl: resourceUrl || null,
          resourceStorageKey,
          durationSeconds: durationMinutes ? Number(durationMinutes) * 60 : null,
          published: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setVideoFile(null);
      setResourceUrl("");
      setResourceFile(null);
      setDurationMinutes("");
      setOpen(false);
      onCreated();
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-sm text-brand-600">
        + Add lesson
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-md border border-gray-200 p-3">
      {error && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lesson title"
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-600">Video — external link (YouTube, Vimeo, etc)</label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">…or upload a video file</label>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Resource — external link</label>
          <input
            value={resourceUrl}
            onChange={(e) => setResourceUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">…or upload a resource file</label>
          <input
            type="file"
            accept="application/pdf,.docx,.zip"
            onChange={(e) => setResourceFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </div>
      </div>
      <input
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(e.target.value)}
        type="number"
        placeholder="Duration (minutes, optional)"
        className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add lesson"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
