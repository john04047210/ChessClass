import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { localePath, localeTag } from "@/lib/seo/site";
import type { SupportedLocale } from "@/lib/types";

const localeCards: Array<{ locale: SupportedLocale; name: string; heading: string; body: string }> = [
  { locale: "zh-CN", name: "简体中文", heading: "零基础国际象棋陪练", body: "和电脑棋友边下边学规则、走法与实战技巧。" },
  { locale: "en", name: "English", heading: "Chess practice for complete beginners", body: "Learn the rules and useful habits while playing a computer opponent." },
  { locale: "ja", name: "日本語", heading: "初心者向けチェス練習", body: "コンピューター棋友と対局しながら、ルールと実戦のコツを学べます。" },
];

export function RootLanding() {
  const messages = getMessages("zh-CN");
  return <main className="root-landing" aria-labelledby="root-landing-title">
    <div className="root-landing-inner">
      <div className="brand-mark root-brand">♞</div>
      <h1 id="root-landing-title">{messages.seo.rootTitle}</h1>
      <p>{messages.seo.rootDescription}</p>
      <nav className="root-language-grid" aria-label={messages.seo.languageLinks}>
        {localeCards.map((card) => <Link key={card.locale} href={localePath(card.locale)} hrefLang={localeTag(card.locale)}>
          <strong>{card.name}</strong>
          <span>{card.heading}</span>
          <small>{card.body}</small>
        </Link>)}
      </nav>
    </div>
  </main>;
}
