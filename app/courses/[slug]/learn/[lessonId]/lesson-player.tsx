"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SidebarLesson = { id: string; title: string; completed: boolean };
type SidebarModule = { title: string; lessons: SidebarLesson[] };

export default function LessonPlayer({
  courseSlug,
  courseTitle,
  lesson,
  prevLessonId,
  nextLessonId,
  completed,
  sidebar,
}: {
  courseSlug: string;
  courseTitle: string;
  lesson: {
    id: string;
    title: string;
    description: string | null;
    moduleTitle: string;
    hasVideo: boolean;
    externalVideoUrl: string | null;
    hasStoredVideo: boolean;
    hasResource: boolean;
    externalResourceUrl: string | null;
    hasStoredResource: boolean;
  };
  prevLessonId: string | null;
  nextLessonId: string | null;
  completed: boolean;
  sidebar: SidebarModule[];
}) {
  const router = useRouter();
  const [videoSrc, setVideoSrc] = useState<string | null>(lesson.externalVideoUrl);
  const [isComplete, setIsComplete] = useState(completed);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsComplete(completed);
    setVideoSrc(lesson.externalVideoUrl);
  }, [lesson.id, completed, lesson.externalVideoUrl]);

  useEffect(() => {
    if (!lesson.hasStoredVideo) return;
    (async () => {
      const res = await fetch(`/api/lessons/${lesson.id}/access-token?type=video`);
      if (!res.ok) return;
      const json = await res.json();
      setVideoSrc(json.mode === "redirect" ? json.url : `/api/lessons/${lesson.id}/file?type=video&token=${json.token}`);
    })();
  }, [lesson.id, lesson.hasStoredVideo]);

  async function downloadResource() {
    if (lesson.externalResourceUrl) {
      window.open(lesson.externalResourceUrl, "_blank");
      return;
    }
    const res = await fetch(`/api/lessons/${lesson.id}/access-token?type=resource`);
    const json = await res.json();
    if (!res.ok) return;
    const url = json.mode === "redirect" ? json.url : `/api/lessons/${lesson.id}/file?type=resource&token=${json.token}`;
    window.open(url, "_blank");
  }

  async function markComplete() {
    setBusy(true);
    try {
      await fetch("/api/lesson-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, completed: true }),
      });
      setIsComplete(true);
      if (nextLessonId) {
        router.push(`/courses/${courseSlug}/learn/${nextLessonId}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
        <Link href={`/courses/${courseSlug}`} className="text-xs text-brand-600">
          ← {courseTitle}
        </Link>
        <div className="mt-4 space-y-4">
          {sidebar.map((m) => (
            <div key={m.title}>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{m.title}</p>
              <ul className="space-y-1">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/courses/${courseSlug}/learn/${l.id}`}
                      className={`block rounded-md px-2 py-1.5 text-sm ${
                        l.id === lesson.id ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {l.completed ? "✓ " : ""}
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">
        <p className="text-xs uppercase text-gray-400">{lesson.moduleTitle}</p>
        <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>

        {lesson.hasVideo && (
          <div className="mt-6 aspect-video w-full max-w-3xl overflow-hidden rounded-xl bg-black">
            {lesson.hasStoredVideo ? (
              videoSrc && <video controls src={videoSrc} className="h-full w-full" />
            ) : (
              videoSrc && <iframe src={videoSrc} className="h-full w-full" allowFullScreen />
            )}
          </div>
        )}

        {lesson.description && <p className="mt-4 max-w-2xl text-gray-700">{lesson.description}</p>}

        {lesson.hasResource && (
          <button onClick={downloadResource} className="mt-4 rounded-md border px-4 py-2 text-sm">
            Download lesson resource
          </button>
        )}

        <div className="mt-8 flex items-center gap-3">
          {prevLessonId && (
            <Link href={`/courses/${courseSlug}/learn/${prevLessonId}`} className="rounded-md border px-4 py-2 text-sm">
              Previous
            </Link>
          )}
          {!isComplete ? (
            <button
              onClick={markComplete}
              disabled={busy}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : nextLessonId ? "Mark complete & continue" : "Mark complete"}
            </button>
          ) : nextLessonId ? (
            <Link href={`/courses/${courseSlug}/learn/${nextLessonId}`} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Next lesson
            </Link>
          ) : (
            <span className="text-sm font-medium text-green-700">🎉 Course complete</span>
          )}
        </div>
      </main>
    </div>
  );
}
