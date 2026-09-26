import { getAllSettings } from "@/lib/settings";

export default async function AboutPage() {
  const settings = await getAllSettings();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">About {settings.app_name}</h1>
      <p className="mt-6 text-sm text-gray-700">
        {settings.app_name} is a digital learning platform offering premium e-books and courses for a single,
        one-time registration fee — no subscriptions, no recurring charges.
      </p>
    </div>
  );
}
