import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { getAllSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAllSettings();
  return {
    title: settings.app_name,
    description: "Learn. Read. Grow. Access premium e-books and e-courses.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
