"use client";

import { useState } from "react";

export default function PaymentPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPayment() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/initialize", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      window.location.href = json.authorizationUrl;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">One-Time Registration Fee</p>
      <p className="mt-2 text-5xl font-extrabold">₦1,000</p>
      <p className="mt-3 text-gray-600">
        Pay once to unlock premium e-books and courses. This is a single charge — it does not renew automatically.
      </p>
      {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button
        onClick={startPayment}
        disabled={busy}
        className="mt-6 rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : "Pay ₦1,000"}
      </button>
    </div>
  );
}
