"use client";
import type { CoachResponse, PlayerProfile, RequestedDetail } from "@/lib/types";
import type { Messages } from "@/lib/i18n/messages";

export function CoachPanel({ messages, response, loading, profile, onDetail }: { messages: Messages; response: CoachResponse | null; loading: boolean; profile: PlayerProfile; onDetail: (detail: RequestedDetail) => void }) {
  const items = response ? [[messages.coach.happened,response.userMoveSummary],[messages.coach.intent,response.inferredIntent.text],[messages.coach.opponent,response.opponentMoveExplanation],[messages.coach.observe,response.nextObservation]] : [];
  return <aside className="coach-card" aria-live="polite"><div className="coach-head"><div className="coach-title"><span>♞</span>{messages.coach.title}</div><span className="coach-badge">{response?.provider === "openai" ? messages.coach.openai : messages.coach.local}</span></div>
    <div className="coach-body">{loading ? <div className="coach-empty"><div className="coach-empty-icon">♞</div>{messages.coach.thinking}</div> : !response ? <div className="coach-empty"><div className="coach-empty-icon">♞</div>{messages.coach.empty}</div> : <>
      {response.ruleTaught && <div className="rule-toast">✦ {messages.game.newRule} · <strong>{response.ruleTaught.title}</strong></div>}
      {items.map(([label,text], index) => <section className="coach-section" key={label}><span className="coach-number">{index+1}</span><div className="coach-label">{label}</div><div className="coach-text">{text}</div></section>)}</>}
    </div>
    <div className="coach-actions"><button className="secondary" disabled={!response || loading} onClick={() => onDetail("more")}>{messages.coach.more}</button><button className="primary" disabled={!response || loading} onClick={() => onDetail("hint_1")}>{messages.coach.hint}</button><button className="secondary" disabled={!response || loading} onClick={() => onDetail("hint_2")}>{messages.coach.hint2}</button><button className="secondary" disabled={!response || loading} onClick={() => onDetail("hint_3")}>{messages.coach.hint3}</button></div>
    <div className="progress-card"><div className="progress-row">{[[profile.lessonProgress.learnedRules.length,messages.progress.rules],[profile.lessonProgress.gamesPlayed,messages.progress.games],[profile.lessonProgress.legalMovesMade,messages.progress.moves],[profile.lessonProgress.illegalMoveAttempts,messages.progress.mistakes]].map(([v,l]) => <div key={String(l)}><div className="progress-value">{v}</div><div className="progress-label">{l}</div></div>)}</div></div>
  </aside>;
}
