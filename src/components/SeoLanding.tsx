import Link from "next/link";
import { getMessages } from "@/lib/i18n/messages";
import { absoluteUrl, localePath, localeTag, SITE_NAME } from "@/lib/seo/site";
import type { SupportedLocale } from "@/lib/types";

const localeNames: Record<SupportedLocale, string> = {
  "zh-CN": "简体中文",
  en: "English",
  ja: "日本語",
};

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function SeoLanding({ locale }: { locale: SupportedLocale }) {
  const messages = getMessages(locale);
  const content = messages.seo;
  const features = [
    [content.featureOneTitle, content.featureOneBody],
    [content.featureTwoTitle, content.featureTwoBody],
    [content.featureThreeTitle, content.featureThreeBody],
    [content.featureFourTitle, content.featureFourBody],
  ];
  const steps = [content.stepOne, content.stepTwo, content.stepThree];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "EducationalApplication"],
    name: messages.meta.title,
    alternateName: SITE_NAME,
    url: absoluteUrl(localePath(locale)),
    description: messages.meta.description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser with JavaScript enabled",
    isAccessibleForFree: true,
    inLanguage: localeTag(locale),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return <section className="seo-landing" lang={localeTag(locale)} aria-labelledby={`seo-heading-${locale}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(structuredData) }} />
    <div className="seo-landing-inner">
      <div className="seo-hero">
        <div className="eyebrow">{content.eyebrow}</div>
        <h1 id={`seo-heading-${locale}`}>{content.heading}</h1>
        <p>{content.intro}</p>
        <div className="seo-actions">
          <a className="primary seo-link-button" href="#practice">{content.practiceLink}</a>
          <Link className="secondary seo-link-button" href={localePath(locale, "rules")}>{content.rulesLink}</Link>
          <Link className="secondary seo-link-button" href={localePath(locale, "tips")}>{content.tipsLink}</Link>
        </div>
      </div>

      <div className="seo-section">
        <h2>{content.featuresTitle}</h2>
        <div className="seo-feature-grid">
          {features.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </div>

      <div className="seo-section seo-steps">
        <h2>{content.stepsTitle}</h2>
        <ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
      </div>

      <nav className="seo-language-nav" aria-label={content.languageLinks}>
        <strong>{content.languageLinks}</strong>
        {Object.entries(localeNames).map(([value, label]) =>
          <Link key={value} href={localePath(value as SupportedLocale)} hrefLang={localeTag(value as SupportedLocale)}>{label}</Link>
        )}
      </nav>
    </div>
  </section>;
}
