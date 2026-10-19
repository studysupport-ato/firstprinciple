import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/reset-password", "/_next/"],
      },
    ],
    sitemap: "https://www.b2bwithkwamina.com/sitemap.xml",
    host: "https://www.b2bwithkwamina.com",
  };
}
