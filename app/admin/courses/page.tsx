"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  slug: string;
  level: string;
  isPremium: boolean;
  published: boolean;
  modules: { lessons: { id: string }[] }[];
  _count: { enrollments: number };
};
type Category = { id: string; name: string };

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  instructor: "",
  level: "beginner",
  categoryId: "",
  thumbnailUrl: "",
  isPremium: true,
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [coursesRes, categoriesRes] = await Promise.all([
      fetch("/api/admin/courses"),
      fetch("/api/admin/categories"),
    ]);
    setCourses((await coursesRes.json()).courses ?? []);
    setCategories((await categoriesRes.json()).categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePublished(id: string, value: boolean) {
    await fetch(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: value }),
    });
    load();
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, categoryId: form.categoryId || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCourse} className="mb-8 space-y-3 rounded-xl border border-gray-200 p-5">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} required />
            <Field label="Instructor" value={form.instructor} onChange={(v) => setForm({ ...form, instructor: v })} />
            <Field label="Thumbnail URL" value={form.thumbnailUrl} onChange={(v) => setForm({ ...form, thumbnailUrl: v })} />
            <label className="block text-sm font-medium text-gray-700">
              Level
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Category
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPremium}
              onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
            />
            Premium (requires ₦1,000 paid access)
          </label>
          <button
            disabled={busy}
            className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create Course"}
          </button>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Title</th>
            <th className="py-2">Level</th>
            <th className="py-2">Lessons</th>
            <th className="py-2">Enrolled</th>
            <th className="py-2">Published</th>
            <th className="py-2">Manage</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => {
            const lessonCount = c.modules.reduce((sum, m) => sum + m.lessons.length, 0);
            return (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{c.title}</td>
                <td className="py-2 capitalize text-gray-500">{c.level}</td>
                <td className="py-2">{lessonCount}</td>
                <td className="py-2">{c._count.enrollments}</td>
                <td className="py-2">
                  <button
                    onClick={() => togglePublished(c.id, !c.published)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.published ? "Published" : "Unpublished"}
                  </button>
                </td>
                <td className="py-2">
                  <Link href={`/admin/courses/${c.id}`} className="text-brand-600">
                    Manage modules &amp; lessons
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
