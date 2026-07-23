import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLearningPage } from "@/components/PublicLearningPage";
import { isSupportedLocale } from "@/lib/i18n/locale";
import { localizedMetadata } from "@/lib/seo/site";

export function generateStaticParams() { return [{locale:"zh-CN"},{locale:"en"},{locale:"ja"}]; }

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata> {
  const {locale}=await params;
  if (!isSupportedLocale(locale)) return {};
  return localizedMetadata(locale,"rules");
}

export default async function RulesPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if (!isSupportedLocale(locale)) notFound();
  return <PublicLearningPage locale={locale} kind="rules"/>;
}
