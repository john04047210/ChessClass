import { supportedLocales, type SupportedLocale } from "@/lib/types";

export const defaultLocale: SupportedLocale = "zh-CN";

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function matchLocale(value?: string | null): SupportedLocale {
  if (!value) return defaultLocale;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ja")) return "ja";
  return "en";
}
