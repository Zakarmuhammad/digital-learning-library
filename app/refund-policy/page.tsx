import { getAllSettings } from "@/lib/settings";

export default async function RefundPolicyPage() {
  const settings = await getAllSettings();
  const feeNaira = Number(settings.registration_fee_kobo) / 100;
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Refund Policy</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-700">
        <p>
          The ₦{feeNaira.toLocaleString()} registration fee is a one-time charge for access to the platform's
          premium library. Because access is granted immediately upon successful payment, this fee is generally
          non-refundable once access has been unlocked.
        </p>
        <p>
          If a payment was charged in error or a technical fault prevented you from receiving access after a
          successful charge, contact {settings.contact_email} and we'll review the payment record for you.
        </p>
      </div>
    </div>
  );
}
