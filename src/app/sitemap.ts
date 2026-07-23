import type { MetadataRoute } from "next";
import { absoluteUrl, localePath } from "@/lib/seo/site";
import { supportedLocales } from "@/lib/types";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 0.8 },
    ...supportedLocales.flatMap((locale) => [
      { url: absoluteUrl(localePath(locale)), changeFrequency: "weekly" as const, priority: 1 },
      { url: absoluteUrl(localePath(locale,"rules")), changeFrequency: "monthly" as const, priority: 0.8 },
      { url: absoluteUrl(localePath(locale,"tips")), changeFrequency: "monthly" as const, priority: 0.8 },
    ]),
  ];
}
