"use client";
import { useState, type FormEvent } from "react";
import type { Messages } from "@/lib/i18n/messages";
import type {PlayerGender,SupportedLocale} from "@/lib/types";

export function WelcomeDialog({ messages,locale,onLocale,onStart }: { messages: Messages;locale:SupportedLocale;onLocale:(locale:SupportedLocale)=>void; onStart: (nickname: string,gender:PlayerGender) => void }) {
  const [nickname, setNickname] = useState(""); const [error, setError] = useState(false);const [gender,setGender]=useState<PlayerGender>("undisclosed");
  function submit(e: FormEvent) { e.preventDefault(); const value = nickname.trim(); if (!value || value.length > 20) { setError(true); return; } onStart(value,gender); }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <div className="welcome-language"><label htmlFor="welcome-locale">🌐 {messages.header.language}</label><select id="welcome-locale" value={locale} onChange={event=>onLocale(event.target.value as SupportedLocale)}><option value="zh-CN">简体中文</option><option value="en">English</option><option value="ja">日本語</option></select></div>
    <div className="eyebrow">{messages.welcome.eyebrow}</div><h1>{messages.welcome.title}</h1><p>{messages.welcome.description}</p>
    <div className="field"><label htmlFor="nickname">{messages.welcome.nickname}</label><input id="nickname" maxLength={20} autoFocus autoComplete="nickname" value={nickname} placeholder={messages.welcome.placeholder} onChange={(e) => { setNickname(e.target.value); setError(false); }} />{error && <div className="error" role="alert">{messages.welcome.required}</div>}</div>
    <fieldset className="gender-field"><legend>{messages.welcome.gender}</legend><div className="gender-options">{([['male','👨',messages.welcome.male],['female','👩',messages.welcome.female],['undisclosed','🧑',messages.welcome.undisclosed]] as const).map(([value,icon,label])=><label className={gender===value?"selected":""} key={value}><input type="radio" name="gender" value={value} checked={gender===value} onChange={()=>setGender(value)}/><span>{icon}</span><b>{label}</b></label>)}</div></fieldset>
    <button className="primary" style={{width:"100%"}} type="submit">{messages.welcome.start} →</button>
  </form></div>;
}
