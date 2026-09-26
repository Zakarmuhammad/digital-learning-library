import { getAllSettings } from "@/lib/settings";

export default async function TermsPage() {
  const settings = await getAllSettings();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-sm text-gray-700">
        <p>
          By registering for {settings.app_name}, you agree to pay a one-time registration fee of
          ₦{(Number(settings.registration_fee_kobo) / 100).toLocaleString()} in exchange for access to the
          premium e-books and courses made available on the platform at the time of your access, subject to the
          access rules set by the administrator.
        </p>
        <p>
          This fee is a single, one-time charge. It does not renew automatically and no recurring billing is
          associated with your account.
        </p>
        <p>
          Content is provided for personal learning use. Redistribution, resale, or unauthorized sharing of
          e-books or course materials is not permitted.
        </p>
        <p>
          We may suspend accounts found to be in violation of these terms. Contact {settings.contact_email} with
          any questions.
        </p>
      </div>
    </div>
  );
}
