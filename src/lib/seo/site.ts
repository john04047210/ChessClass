import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import type { SupportedLocale } from "@/lib/types";

export const SITE_URL = "https://chess9527.com";
export const SITE_NAME = "Chess9527";

export type PublicPageKind = "practice" | "rules" | "tips";

const localeTags: Record<SupportedLocale, string> = {
  "zh-CN": "zh-Hans",
  en: "en",
  ja: "ja",
};

const openGraphLocales: Record<SupportedLocale, string> = {
  "zh-CN": "zh_CN",
  en: "en_US",
  ja: "ja_JP",
};

const pageSuffix: Record<PublicPageKind, string> = {
  practice: "",
  rules: "rules/",
  tips: "tips/",
};

export function localePath(locale: SupportedLocale, kind: PublicPageKind = "practice"): string {
  return `/${locale}/${pageSuffix[kind]}`;
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}

export function localizedAlternates(kind: PublicPageKind = "practice") {
  return {
    "zh-Hans": absoluteUrl(localePath("zh-CN", kind)),
    en: absoluteUrl(localePath("en", kind)),
    ja: absoluteUrl(localePath("ja", kind)),
    "x-default": absoluteUrl("/"),
  };
}

export function localizedMetadata(locale: SupportedLocale, kind: PublicPageKind = "practice"): Metadata {
  const messages = getMessages(locale);
  const title = kind === "rules"
    ? `${messages.seo.rulesLink} | ${SITE_NAME}`
    : kind === "tips"
      ? `${messages.seo.tipsLink} | ${SITE_NAME}`
      : messages.meta.title;
  const description = kind === "rules"
    ? messages.seo.rulesDescription
    : kind === "tips"
      ? messages.seo.tipsDescription
      : messages.meta.description;
  const canonical = absoluteUrl(localePath(locale, kind));

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: localizedAlternates(kind),
    },
    keywords: locale === "zh-CN"
      ? ["国际象棋入门", "国际象棋陪练", "国际象棋规则", "免费下棋"]
      : locale === "ja"
        ? ["チェス 初心者", "チェス 練習", "チェス ルール", "無料 チェス"]
        : ["chess for beginners", "learn chess", "chess practice", "free chess"],
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: openGraphLocales[locale],
      alternateLocale: Object.values(openGraphLocales).filter((item) => item !== openGraphLocales[locale]),
      images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: messages.meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/og-image.png")],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function localeTag(locale: SupportedLocale): string {
  return localeTags[locale];
}
