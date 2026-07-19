"use client";
import { useState, type FormEvent } from "react";
import type { Messages } from "@/lib/i18n/messages";

export function WelcomeDialog({ messages, onStart }: { messages: Messages; onStart: (nickname: string) => void }) {
  const [nickname, setNickname] = useState(""); const [error, setError] = useState(false);
  function submit(e: FormEvent) { e.preventDefault(); const value = nickname.trim(); if (!value || value.length > 20) { setError(true); return; } onStart(value); }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <div className="eyebrow">{messages.welcome.eyebrow}</div><h1>{messages.welcome.title}</h1><p>{messages.welcome.description}</p>
    <div className="field"><label htmlFor="nickname">{messages.welcome.nickname}</label><input id="nickname" maxLength={20} autoFocus autoComplete="nickname" value={nickname} placeholder={messages.welcome.placeholder} onChange={(e) => { setNickname(e.target.value); setError(false); }} />{error && <div className="error" role="alert">{messages.welcome.required}</div>}</div>
    <button className="primary" style={{width:"100%"}} type="submit">{messages.welcome.start} →</button>
  </form></div>;
}
