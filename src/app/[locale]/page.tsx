import { notFound } from "next/navigation";
import { ChessLearningApp } from "@/components/ChessLearningApp";
import { getMessages } from "@/lib/i18n/messages";
import { isSupportedLocale } from "@/lib/i18n/locale";

export function generateStaticParams() { return [{locale:"zh-CN"},{locale:"en"},{locale:"ja"}]; }
export default async function LocalePage({params}:{params:Promise<{locale:string}>}) { const {locale}=await params; if (!isSupportedLocale(locale)) notFound(); return <ChessLearningApp locale={locale} messages={getMessages(locale)} />; }
