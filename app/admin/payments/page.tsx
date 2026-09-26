"use client";

import { useEffect, useState } from "react";

type PaymentRow = {
  id: string;
  transactionReference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  user: { fullName: string; email: string };
};

const STATUSES = ["", "pending", "successful", "failed", "refunded"];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/payments?${params.toString()}`);
    const json = await res.json();
    setPayments(json.payments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payments</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, or reference…"
            className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </form>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">User</th>
              <th className="py-2">Email</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Reference</th>
              <th className="py-2">Status</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <td className="py-2 font-medium">{p.user.fullName}</td>
                <td className="py-2 text-gray-500">{p.user.email}</td>
                <td className="py-2">₦{(p.amount / 100).toLocaleString()}</td>
                <td className="py-2 font-mono text-xs text-gray-500">{p.transactionReference}</td>
                <td className="py-2 capitalize">{p.status}</td>
                <td className="py-2 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
