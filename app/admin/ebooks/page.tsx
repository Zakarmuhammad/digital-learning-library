"use client";

import { useEffect, useState } from "react";

type Ebook = {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  isPremium: boolean;
  downloadEnabled: boolean;
  published: boolean;
  categoryId: string | null;
  _count: { readingProgress: number };
};
type Category = { id: string; name: string };

const emptyForm = {
  title: "",
  slug: "",
  author: "",
  description: "",
  categoryId: "",
  pageCount: "",
  isPremium: true,
  downloadEnabled: false,
};

export default function AdminEbooksPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [ebooksRes, categoriesRes] = await Promise.all([
      fetch("/api/admin/ebooks"),
      fetch("/api/admin/categories"),
    ]);
    setEbooks((await ebooksRes.json()).ebooks ?? []);
    setCategories((await categoriesRes.json()).categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, field: "published" | "downloadEnabled", value: boolean) {
    await fetch(`/api/admin/ebooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  }

  async function createEbook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a PDF file to upload.");
      return;
    }
    setBusy(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("kind", "ebook-file");

      const uploadRes = await fetch("/api/admin/uploads", { method: "POST", body: uploadForm });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadJson.error);
        return;
      }

      const createRes = await fetch("/api/admin/ebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pageCount: Number(form.pageCount),
          categoryId: form.categoryId || null,
          fileStorageKey: uploadJson.storageKey,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        setError(createJson.error);
        return;
      }

      setForm(emptyForm);
      setFile(null);
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
        <h1 className="text-2xl font-bold">E-Books</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? "Cancel" : "+ New E-Book"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createEbook} className="mb-8 space-y-3 rounded-xl border border-gray-200 p-5">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <TextInput label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} required />
            <TextInput label="Author" value={form.author} onChange={(v) => setForm({ ...form, author: v })} required />
            <TextInput
              label="Page count"
              type="number"
              value={form.pageCount}
              onChange={(v) => setForm({ ...form, pageCount: v })}
              required
            />
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
            <label className="block text-sm font-medium text-gray-700">
              PDF file
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm"
                required
              />
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
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPremium}
                onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
              />
              Premium (requires paid access)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.downloadEnabled}
                onChange={(e) => setForm({ ...form, downloadEnabled: e.target.checked })}
              />
              Allow download
            </label>
          </div>
          <button
            disabled={busy}
            className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Create E-Book"}
          </button>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Title</th>
            <th className="py-2">Author</th>
            <th className="py-2">Pages</th>
            <th className="py-2">Readers</th>
            <th className="py-2">Published</th>
            <th className="py-2">Download</th>
          </tr>
        </thead>
        <tbody>
          {ebooks.map((b) => (
            <tr key={b.id} className="border-b border-gray-100">
              <td className="py-2 font-medium">{b.title}</td>
              <td className="py-2 text-gray-500">{b.author}</td>
              <td className="py-2">{b.pageCount}</td>
              <td className="py-2">{b._count.readingProgress}</td>
              <td className="py-2">
                <button
                  onClick={() => toggle(b.id, "published", !b.published)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    b.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {b.published ? "Published" : "Unpublished"}
                </button>
              </td>
              <td className="py-2">
                <button
                  onClick={() => toggle(b.id, "downloadEnabled", !b.downloadEnabled)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    b.downloadEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {b.downloadEnabled ? "Enabled" : "Disabled"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
