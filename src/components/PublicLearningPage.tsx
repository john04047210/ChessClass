import Link from "next/link";
import { DocumentLanguage } from "@/components/DocumentLanguage";
import { referenceContent } from "@/lib/learning/reference-content";
import { getMessages } from "@/lib/i18n/messages";
import { localePath, localeTag } from "@/lib/seo/site";
import type { SupportedLocale } from "@/lib/types";

const back = ["♜","♞","♝","♛","♚","♝","♞","♜"];

export function PublicLearningPage({ locale, kind }: { locale: SupportedLocale; kind: "rules" | "tips" }) {
  const messages = getMessages(locale);
  const reference = referenceContent[locale];
  const sections = kind === "rules" ? reference.rules : reference.tips;
  const title = kind === "rules" ? reference.rulesTitle : reference.tipsTitle;
  const description = kind === "rules" ? messages.seo.rulesDescription : messages.seo.tipsDescription;

  return <main className="learning-page" lang={localeTag(locale)}>
    <DocumentLanguage locale={locale} />
    <header className="learning-page-head">
      <Link className="brand learning-brand" href={localePath(locale)}>
        <span className="brand-mark">♞</span>
        <span><b>{messages.header.product}</b><small>{messages.header.stage}</small></span>
      </Link>
      <nav aria-label={messages.seo.languageLinks}>
        <Link href={localePath("zh-CN", kind)} hrefLang="zh-Hans">简体中文</Link>
        <Link href={localePath("en", kind)} hrefLang="en">English</Link>
        <Link href={localePath("ja", kind)} hrefLang="ja">日本語</Link>
      </nav>
    </header>
    <article className="learning-article">
      <div className="eyebrow">{kind === "rules" ? reference.rulesButton : reference.tipsButton}</div>
      <h1>{title}</h1>
      <p className="learning-lead">{description}</p>
      {kind === "rules" && <>
        <div className="reference-board public-reference-board" aria-label={reference.boardCaption}>
          {back.map((piece,index)=><span key={`b-${index}`}>{piece}</span>)}
          {Array.from({length:8},(_,index)=><span key={`bp-${index}`}>♟</span>)}
          {Array.from({length:32},(_,index)=><span className="empty" key={`e-${index}`}/>)}
          {Array.from({length:8},(_,index)=><span key={`wp-${index}`}>♙</span>)}
          {back.map((piece,index)=><span key={`w-${index}`}>{({"♜":"♖","♞":"♘","♝":"♗","♛":"♕","♚":"♔"} as Record<string,string>)[piece]}</span>)}
        </div>
        <p className="reference-caption">{reference.boardCaption}</p>
      </>}
      <div className="learning-section-list">
        {sections.map((section) => <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
      </div>
      <div className="learning-page-actions">
        <Link className="primary seo-link-button" href={localePath(locale)}>{messages.seo.backToPractice}</Link>
        <Link className="secondary seo-link-button" href={localePath(locale, kind === "rules" ? "tips" : "rules")}>
          {kind === "rules" ? messages.seo.tipsLink : messages.seo.rulesLink}
        </Link>
      </div>
    </article>
  </main>;
}
