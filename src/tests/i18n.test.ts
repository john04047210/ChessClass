import { describe,expect,it } from "vitest";
import en from "@/messages/en.json"; import ja from "@/messages/ja.json"; import zh from "@/messages/zh-CN.json";
import { matchLocale } from "@/lib/i18n/locale";
function keys(value:unknown,prefix=""):string[]{ if(!value||typeof value!=="object")return[prefix]; return Object.entries(value).flatMap(([k,v])=>keys(v,prefix?`${prefix}.${k}`:k)); }
describe("internationalization",()=>{
  it("has identical keys in all languages",()=>{expect(keys(en).sort()).toEqual(keys(zh).sort());expect(keys(ja).sort()).toEqual(keys(zh).sort());});
  it("matches supported browser locales safely",()=>{expect(matchLocale("zh-SG")).toBe("zh-CN");expect(matchLocale("ja-JP")).toBe("ja");expect(matchLocale("fr-FR")).toBe("en");expect(matchLocale()).toBe("zh-CN");});
});
