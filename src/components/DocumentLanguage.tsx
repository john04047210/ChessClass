"use client";

import { useEffect } from "react";
import type { SupportedLocale } from "@/lib/types";

export function DocumentLanguage({ locale }: { locale: SupportedLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
