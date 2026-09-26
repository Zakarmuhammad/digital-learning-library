import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/dashboard", "/ebooks/*/read"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/sitemap.xml`,
  };
}
