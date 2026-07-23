import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChessLearningApp } from "@/components/ChessLearningApp";
import { DocumentLanguage } from "@/components/DocumentLanguage";
import { SeoLanding } from "@/components/SeoLanding";
import { getMessages } from "@/lib/i18n/messages";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { localizedMetadata } from "@/lib/seo/site";

export function generateStaticParams() { return [{locale:"zh-CN"},{locale:"en"},{locale:"ja"}]; }

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata> {
  const {locale}=await params;
  if (!isSupportedLocale(locale)) return {};
  return localizedMetadata(locale);
}

export default async function LocalePage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if (!isSupportedLocale(locale)) notFound();
  return <>
    <DocumentLanguage locale={locale} />
    <div id="practice"><ChessLearningApp locale={locale} messages={getMessages(locale)} /></div>
    <SeoLanding locale={locale} />
  </>;
}
