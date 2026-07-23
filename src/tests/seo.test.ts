import { describe,expect,it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { localizedMetadata, localizedAlternates, SITE_URL } from "@/lib/seo/site";
import { getMessages } from "@/lib/i18n/messages";
import { supportedLocales } from "@/lib/types";

describe("search metadata",()=>{
  it("publishes canonical localized pages and an x-default",()=>{
    const alternates=localizedAlternates();
    expect(alternates["zh-Hans"]).toBe(`${SITE_URL}/zh-CN/`);
    expect(alternates.en).toBe(`${SITE_URL}/en/`);
    expect(alternates.ja).toBe(`${SITE_URL}/ja/`);
    expect(alternates["x-default"]).toBe(`${SITE_URL}/`);
  });

  it("uses localized beginner-practice metadata without AI positioning",()=>{
    for(const locale of supportedLocales){
      const messages=getMessages(locale);
      const metadata=localizedMetadata(locale);
      expect(metadata.title).toBe(messages.meta.title);
      expect(metadata.description).toBe(messages.meta.description);
      expect(`${messages.meta.title} ${messages.meta.description}`).not.toMatch(/\bAI\b/i);
      expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/${locale}/`);
    }
  });

  it("exposes robots and all public canonical URLs in the sitemap",()=>{
    const robotsFile=robots();
    expect(robotsFile.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(robotsFile.host).toBe(SITE_URL);
    const entries=sitemap();
    expect(entries).toHaveLength(10);
    expect(entries.map(item=>item.url)).toContain(`${SITE_URL}/zh-CN/rules/`);
    expect(entries.map(item=>item.url)).toContain(`${SITE_URL}/en/tips/`);
    expect(entries.every(item=>item.url.startsWith(SITE_URL))).toBe(true);
  });
});
