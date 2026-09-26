"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; _count: { ebooks: number; courses: number } };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/categories");
    const json = await res.json();
    setCategories(json.categories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setName("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error);
      return;
    }
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>

      <form onSubmit={create} className="mb-6 flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Add
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">E-Books</th>
              <th className="py-2">Courses</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{c.name}</td>
                <td className="py-2">{c._count.ebooks}</td>
                <td className="py-2">{c._count.courses}</td>
                <td className="py-2">
                  <button onClick={() => remove(c.id)} className="text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
