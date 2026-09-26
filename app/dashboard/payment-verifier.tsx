"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaymentVerifier() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    (async () => {
      setMessage("Confirming your payment…");
      const res = await fetch(`/api/payment/verify?reference=${encodeURIComponent(ref)}`);
      const json = await res.json();
      if (json.status === "successful") {
        setMessage("Payment confirmed — your access is now active.");
        router.refresh();
      } else if (json.status === "failed") {
        setMessage("That payment failed. You can try again below.");
      } else {
        setMessage("We couldn't confirm that payment yet — it may still be processing.");
      }
    })();
  }, [searchParams, router]);

  if (!message) return null;
  return <div className="mb-6 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{message}</div>;
}
