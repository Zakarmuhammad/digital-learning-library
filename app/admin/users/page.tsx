"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  hasPaidAccess: boolean;
  isSuspended: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function action(id: string, action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load(q);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="mb-4 max-w-sm"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Access</th>
              <th className="py-2">Status</th>
              <th className="py-2">Joined</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{u.fullName}</td>
                <td className="py-2 text-gray-500">{u.email}</td>
                <td className="py-2">{u.hasPaidAccess ? "Paid" : "Unpaid"}</td>
                <td className="py-2">{u.isSuspended ? "Suspended" : "Active"}</td>
                <td className="py-2 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="py-2 space-x-2">
                  {u.isSuspended ? (
                    <button onClick={() => action(u.id, "activate")} className="text-brand-600">
                      Activate
                    </button>
                  ) : (
                    <button
                      onClick={() => action(u.id, "suspend", `Suspend ${u.email}?`)}
                      className="text-red-600"
                    >
                      Suspend
                    </button>
                  )}
                  {u.hasPaidAccess ? (
                    <button
                      onClick={() => action(u.id, "revoke_access", `Revoke premium access for ${u.email}?`)}
                      className="text-red-600"
                    >
                      Revoke access
                    </button>
                  ) : (
                    <button onClick={() => action(u.id, "grant_access")} className="text-brand-600">
                      Grant access
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
