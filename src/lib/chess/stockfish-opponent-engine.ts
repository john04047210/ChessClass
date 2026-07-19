import { Chess } from "chess.js";
import type { LegalMove } from "@/lib/types";
import type { OpponentEngine } from "./opponent-engine";

type MoveChoice = Pick<LegalMove, "from" | "to" | "promotion">;
type PendingSearch = {
  resolve: (move: MoveChoice | null) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  fen: string;
};

const WORKER_PATH = "/stockfish/stockfish-18-lite-single.js";

function workerUrl(): string {
  const nextScript = document.querySelector<HTMLScriptElement>('script[src*="/_next/"]');
  if (!nextScript?.src) return WORKER_PATH;
  const url = new URL(nextScript.src);
  const basePath = url.pathname.split("/_next/")[0];
  return `${basePath}${WORKER_PATH}`;
}

export class StockfishOpponentEngine implements OpponentEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((error: Error) => void) | null = null;
  private pending: PendingSearch | null = null;

  async chooseMove({ fen, legalMoves }: { fen: string; legalMoves: LegalMove[]; level: "beginner" }) {
    if (!legalMoves.length) return null;
    await this.ensureReady();
    if (!this.worker) throw new Error("Stockfish worker is unavailable");
    if (this.pending) throw new Error("Stockfish is already searching");

    return new Promise<MoveChoice | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.worker?.postMessage("stop");
        this.pending = null;
        reject(new Error("Stockfish search timed out"));
      }, 8_000);
      this.pending = { resolve, reject, timer, fen };
      this.worker!.postMessage("ucinewgame");
      this.worker!.postMessage("setoption name Skill Level value 0");
      this.worker!.postMessage("setoption name UCI_LimitStrength value true");
      this.worker!.postMessage("setoption name UCI_Elo value 1320");
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage("go movetime 350");
    });
  }

  dispose() {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new Error("Stockfish was disposed"));
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }

  private ensureReady(): Promise<void> {
    if (this.ready) return this.ready;
    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      return Promise.reject(new Error("This browser does not support Stockfish WebAssembly"));
    }
    this.ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      try {
        this.worker = new Worker(workerUrl());
        this.worker.addEventListener("message", (event) => this.onMessage(String(event.data)));
        this.worker.addEventListener("error", () => this.fail(new Error("Stockfish worker failed to load")));
        this.worker.postMessage("uci");
        setTimeout(() => {
          if (this.readyResolve) this.fail(new Error("Stockfish startup timed out"));
        }, 8_000);
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error("Stockfish could not start"));
      }
    });
    return this.ready;
  }

  private onMessage(message: string) {
    if (message === "uciok") { this.worker?.postMessage("isready"); return; }
    if (message === "readyok" && this.readyResolve) {
      this.readyResolve();
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }
    if (!message.startsWith("bestmove ") || !this.pending) return;
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timer);
    const uci = message.split(/\s+/)[1];
    if (!uci || uci === "(none)") { pending.resolve(null); return; }
    const from = uci.slice(0, 2); const to = uci.slice(2, 4);
    const promotion = uci[4] as LegalMove["promotion"];
    try {
      const verified = new Chess(pending.fen).move({ from, to, promotion });
      pending.resolve(verified ? { from, to, promotion } : null);
    } catch {
      pending.reject(new Error(`Stockfish returned an illegal move: ${uci}`));
    }
  }

  private fail(error: Error) {
    this.readyReject?.(error);
    this.readyResolve = null;
    this.readyReject = null;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}
