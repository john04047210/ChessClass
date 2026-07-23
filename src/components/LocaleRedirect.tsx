"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSupportedLocale, matchLocale } from "@/lib/i18n/locale";
import { PROFILE_KEY } from "@/lib/player/storage";

export function LocaleRedirect() {
  const router = useRouter();
  useEffect(() => {
    let savedLocale: string | undefined;
    try {
      savedLocale = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null")?.preferredLocale;
    } catch {
      // Continue with cookie and browser language.
    }
    const cookieLocale = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("chess-locale="))
      ?.split("=")[1];
    const locale = savedLocale && isSupportedLocale(savedLocale)
      ? savedLocale
      : cookieLocale && isSupportedLocale(cookieLocale)
        ? cookieLocale
        : matchLocale(navigator.languages?.[0] || navigator.language);
    router.replace(`/${locale}`);
  }, [router]);
  return null;
}
