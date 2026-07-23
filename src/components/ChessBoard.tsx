"use client";

import type { Square } from "chess.js";
import { Chess } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";

const glyphs: Record<string, string> = { wk:"♔", wq:"♕", wr:"♖", wb:"♗", wn:"♘", wp:"♙", bk:"♚", bq:"♛", br:"♜", bb:"♝", bn:"♞", bp:"♟" };
const pieceKeys = { k:"king", q:"queen", r:"rook", b:"bishop", n:"knight", p:"pawn" } as const;

interface Props {
  fen: string; selected: string | null; legalTargets: string[]; lastMove?: { from: string; to: string };
  flipped: boolean; locked: boolean; onSquare: (square: string) => void; onDrop: (from: string, to: string) => void;
  pieceLabels: Record<(typeof pieceKeys)[keyof typeof pieceKeys], string>;
  sideLabels: { white: string; black: string };
  boardLabel: string;
  emptySquareLabel: string;
  opponentPreview?: { from: string; to: string; phase: "preparing" | "landed" } | null;
}

export function ChessBoard({ fen, selected, legalTargets, lastMove, flipped, locked, onSquare, onDrop, pieceLabels, sideLabels, boardLabel, emptySquareLabel, opponentPreview }: Props) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const tooltipShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const checkedKing = chess.inCheck() ? chess.board().flat().find((p) => p?.type === "k" && p.color === chess.turn())?.square : undefined;

  useEffect(() => () => {
    if (tooltipShowTimer.current) clearTimeout(tooltipShowTimer.current);
    if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
  }, []);

  function queueTooltip(element: HTMLElement, text: string) {
    if (tooltipShowTimer.current) clearTimeout(tooltipShowTimer.current);
    if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
    setTooltip(null);
    const rect = element.getBoundingClientRect();
    tooltipShowTimer.current = setTimeout(() => {
      setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 7 });
      tooltipShowTimer.current = null;
      tooltipHideTimer.current = setTimeout(() => {
        setTooltip(null);
        tooltipHideTimer.current = null;
      }, 2000);
    }, 1000);
  }

  function hideTooltip() {
    if (tooltipShowTimer.current) clearTimeout(tooltipShowTimer.current);
    if (tooltipHideTimer.current) clearTimeout(tooltipHideTimer.current);
    tooltipShowTimer.current = null;
    tooltipHideTimer.current = null;
    setTooltip(null);
  }

  return <div className="board-coordinate-frame" data-animation-phase={opponentPreview?.phase}>
    <div className="file-axis file-axis-top" aria-hidden="true">{files.map((file) => <span key={file}>{file.toUpperCase()}</span>)}</div>
    <div className="rank-axis rank-axis-left" aria-hidden="true">{ranks.map((rank) => <span key={rank}>{rank}</span>)}</div>
    <div className="board-wrap" aria-label={boardLabel}>
      <div className="board">
      {ranks.flatMap((rank) => files.map((file) => {
        const square = `${file}${rank}` as Square;
        const piece = chess.get(square);
        const pieceLabel = piece ? `${piece.color === "w" ? sideLabels.white : sideLabels.black} · ${pieceLabels[pieceKeys[piece.type]]}` : "";
        const target = legalTargets.includes(square);
        const isLast = lastMove?.from === square || lastMove?.to === square;
        const isPreparingTarget = opponentPreview?.phase === "preparing" && opponentPreview.to === square;
        const isLandedTarget = opponentPreview?.phase === "landed" && opponentPreview.to === square;
        const className = ["square", (Number(file.charCodeAt(0)) + rank) % 2 ? "light" : "dark", selected === square ? "selected" : "", isLast ? "last" : "", checkedKing === square ? "check" : "", isPreparingTarget ? "opponent-target" : "", isLandedTarget ? "opponent-landed-square" : ""].filter(Boolean).join(" ");
        return <button key={square} type="button" data-square={square} className={className} aria-disabled={locked}
          aria-label={`${square}${piece ? ` ${pieceLabel}` : ` ${emptySquareLabel}`}`}
          onClick={() => onSquare(square)} onDragOver={(e) => { if (!locked) e.preventDefault(); }}
          onMouseEnter={(e) => { if (piece) queueTooltip(e.currentTarget, pieceLabel); }} onMouseLeave={hideTooltip}
          onFocus={(e) => { if (piece) queueTooltip(e.currentTarget, pieceLabel); }} onBlur={hideTooltip}
          onDrop={(e) => { e.preventDefault(); const from = e.dataTransfer.getData("text/plain"); if (from) onDrop(from, square); }}>
          {piece && <span draggable={!locked && piece.color === "w"} onDragStart={(e) => e.dataTransfer.setData("text/plain", square)} className={["piece",piece.color === "w" ? "white" : "black",opponentPreview?.phase === "preparing" && opponentPreview.from === square ? "opponent-preparing" : "",isLandedTarget ? "opponent-landed" : ""].filter(Boolean).join(" ")} aria-hidden="true">{glyphs[`${piece.color}${piece.type}`]}</span>}
          {target && <span className={`legal-dot ${piece ? "capture" : ""}`} aria-hidden="true" />}
        </button>;
      }))}
      </div>
    </div>
    <div className="rank-axis rank-axis-right" aria-hidden="true">{ranks.map((rank) => <span key={rank}>{rank}</span>)}</div>
    <div className="file-axis file-axis-bottom" aria-hidden="true">{files.map((file) => <span key={file}>{file.toUpperCase()}</span>)}</div>
    {tooltip && <div className="piece-tooltip" role="tooltip" style={{ left:tooltip.x, top:tooltip.y }}>{tooltip.text}</div>}
  </div>;
}
