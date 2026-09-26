import { getAllSettings } from "@/lib/settings";

export default async function PrivacyPage() {
  const settings = await getAllSettings();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-700">
        <p>
          We collect the information you provide when registering (full name, email, optional phone number) and
          records of your payment and learning activity (reading progress, course progress) in order to operate
          your account.
        </p>
        <p>
          Payment card details are handled entirely by our payment provider, Paystack — we never see or store
          your card number. We store the transaction reference, amount, and status returned by Paystack.
        </p>
        <p>
          We do not sell your personal information. Data is used only to provide the service, respond to support
          requests, and send account-related notifications (payment confirmation, password reset, etc).
        </p>
        <p>Contact {settings.contact_email} to request access to or deletion of your data.</p>
      </div>
    </div>
  );
}
