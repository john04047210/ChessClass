import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import zhCN from "@/messages/zh-CN.json";
import type { SupportedLocale } from "@/lib/types";

export const messages = { "zh-CN": zhCN, en, ja } as const;
export type Messages = typeof zhCN;
export function getMessages(locale: SupportedLocale): Messages {
  return messages[locale] as Messages;
}
