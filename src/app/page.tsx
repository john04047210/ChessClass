import type { Metadata } from "next";
import { LocaleRedirect } from "@/components/LocaleRedirect";
import { RootLanding } from "@/components/RootLanding";
import { getMessages } from "@/lib/i18n/messages";
import { absoluteUrl, localizedAlternates, SITE_NAME } from "@/lib/seo/site";

const messages = getMessages("zh-CN");

export const metadata: Metadata = {
  title: messages.seo.rootTitle,
  description: messages.seo.rootDescription,
  alternates: {
    canonical: absoluteUrl("/"),
    languages: localizedAlternates(),
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: messages.seo.rootTitle,
    description: messages.seo.rootDescription,
    url: absoluteUrl("/"),
    images: [{ url: absoluteUrl("/og-image.png"), width: 1200, height: 630, alt: messages.seo.rootTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: messages.seo.rootTitle,
    description: messages.seo.rootDescription,
    images: [absoluteUrl("/og-image.png")],
  },
};

export default function Home() {
  return <>
    <LocaleRedirect />
    <RootLanding />
  </>;
}
