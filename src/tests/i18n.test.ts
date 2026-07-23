import { describe,expect,it } from "vitest";
import en from "@/messages/en.json"; import ja from "@/messages/ja.json"; import zh from "@/messages/zh-CN.json";
import { matchLocale } from "@/lib/i18n/locale";
import { referenceContent } from "@/lib/learning/reference-content";
import { supportedLocales } from "@/lib/types";
function keys(value:unknown,prefix=""):string[]{ if(!value||typeof value!=="object")return[prefix]; return Object.entries(value).flatMap(([k,v])=>keys(v,prefix?`${prefix}.${k}`:k)); }
describe("internationalization",()=>{
  it("has identical keys in all languages",()=>{expect(keys(en).sort()).toEqual(keys(zh).sort());expect(keys(ja).sort()).toEqual(keys(zh).sort());});
  it("matches supported browser locales safely",()=>{expect(matchLocale("zh-SG")).toBe("zh-CN");expect(matchLocale("ja-JP")).toBe("ja");expect(matchLocale("fr-FR")).toBe("en");expect(matchLocale()).toBe("zh-CN");});
  it("provides complete public rules and tips in every language",()=>{
    for(const locale of supportedLocales){
      const content=referenceContent[locale];
      expect(content.rules.length).toBeGreaterThanOrEqual(6);
      expect(content.tips.length).toBeGreaterThanOrEqual(8);
      expect([...content.rules,...content.tips].every(section=>section.title.length>0&&section.body.length>20)).toBe(true);
    }
  });
});
