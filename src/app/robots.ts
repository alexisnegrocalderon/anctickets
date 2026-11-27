import type { MetadataRoute } from "next";

/** El panel de administración no se indexa. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }],
  };
}
