"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { defaultLocale, isSupportedLocale, matchLocale } from "@/lib/i18n/locale";
import { getMessages } from "@/lib/i18n/messages";
import { PROFILE_KEY } from "@/lib/player/storage";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    let savedLocale: string | undefined;
    try { savedLocale = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null")?.preferredLocale; } catch { /* use another signal */ }
    const cookieLocale = document.cookie.split(";").map((item)=>item.trim()).find((item)=>item.startsWith("chess-locale="))?.split("=")[1];
    const locale = savedLocale && isSupportedLocale(savedLocale) ? savedLocale : cookieLocale && isSupportedLocale(cookieLocale) ? cookieLocale : matchLocale(navigator.languages?.[0] || navigator.language);
    router.replace(`/${locale}`);
  }, [router]);
  return <div className="app-shell">{getMessages(defaultLocale).common.loading}</div>;
}
