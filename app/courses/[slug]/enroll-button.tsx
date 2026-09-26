"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnrollButton({
  courseId,
  slug,
  firstLessonId,
}: {
  courseId: string;
  slug: string;
  firstLessonId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      if (firstLessonId) {
        router.push(`/courses/${slug}/learn/${firstLessonId}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={enroll}
        disabled={busy}
        className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Enrolling…" : "Enroll and Start Learning"}
      </button>
    </div>
  );
}
