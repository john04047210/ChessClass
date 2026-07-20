import { Chess } from "chess.js";
import type { EngineAnalysisSnapshot, EngineSearchResult, LegalMove, PromotionPiece } from "@/lib/types";
import { analysisSnapshot, parseStockfishInfo } from "./stockfish-info-parser";
import type { OpponentEngine } from "./opponent-engine";

type MoveChoice=Pick<LegalMove,"from"|"to"|"promotion">;
type SearchInput={fen:string;legalMoves:LegalMove[];level:"beginner";multiPv?:number;moveTimeMs?:number;signal?:AbortSignal;onAnalysis?:(snapshot:EngineAnalysisSnapshot)=>void};
type PendingSearch={resolve:(result:EngineSearchResult|null)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;flushTimer:ReturnType<typeof setTimeout>|null;fen:string;whiteToMove:boolean;searchId:string;info:NonNullable<ReturnType<typeof parseStockfishInfo>>[];onAnalysis?:SearchInput["onAnalysis"];abort?:()=>void};

const WORKER_PATH="/stockfish/stockfish-18-lite-single.js";
function workerUrl(){const script=document.querySelector<HTMLScriptElement>('script[src*="/_next/"]');if(!script?.src)return WORKER_PATH;const url=new URL(script.src);return `${url.pathname.split("/_next/")[0]}${WORKER_PATH}`;}
function choiceFromUci(uci:string):MoveChoice{return{from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4] as PromotionPiece|undefined};}
function sanForPv(fen:string,pv:string[]){const chess=new Chess(fen);const san:string[]=[];for(const uci of pv.slice(0,8)){try{const move=chess.move(choiceFromUci(uci));if(!move)break;san.push(move.san);}catch{break;}}return san;}

export class StockfishOpponentEngine implements OpponentEngine{
  private worker:Worker|null=null;private ready:Promise<void>|null=null;private readyResolve:(()=>void)|null=null;private readyReject:((error:Error)=>void)|null=null;private pending:PendingSearch|null=null;private sequence=0;

  async chooseMove(input:{fen:string;legalMoves:LegalMove[];level:"beginner"}){return(await this.searchMove(input))?.bestMove||null;}

  async searchMove(input:SearchInput):Promise<EngineSearchResult|null>{
    if(!input.legalMoves.length)return null;await this.ensureReady();if(!this.worker)throw new Error("Stockfish worker is unavailable");if(this.pending)this.cancelSearch("Superseded by a new search");
    const searchId=`stockfish-${Date.now()}-${++this.sequence}`;const whiteToMove=new Chess(input.fen).turn()==="w";
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.cancelSearch("Stockfish search timed out");},8_000);
      const pending:PendingSearch={resolve,reject,timer,flushTimer:null,fen:input.fen,whiteToMove,searchId,info:[],onAnalysis:input.onAnalysis};
      if(input.signal){const abort=()=>this.cancelSearch("Stockfish search cancelled");pending.abort=abort;if(input.signal.aborted){clearTimeout(timer);reject(new Error("Stockfish search cancelled"));return;}input.signal.addEventListener("abort",abort,{once:true});}
      this.pending=pending;this.worker!.postMessage("ucinewgame");this.worker!.postMessage("setoption name Skill Level value 0");this.worker!.postMessage("setoption name UCI_LimitStrength value true");this.worker!.postMessage("setoption name UCI_Elo value 1320");this.worker!.postMessage(`setoption name MultiPV value ${Math.max(1,Math.min(input.multiPv||1,3))}`);this.worker!.postMessage(`position fen ${input.fen}`);this.worker!.postMessage(`go movetime ${input.moveTimeMs||350}`);
    });
  }

  cancelSearch(reason="Stockfish search cancelled"){const pending=this.pending;if(!pending)return;this.worker?.postMessage("stop");this.pending=null;clearTimeout(pending.timer);if(pending.flushTimer)clearTimeout(pending.flushTimer);pending.reject(new Error(reason));}
  dispose(){this.cancelSearch("Stockfish was disposed");this.worker?.terminate();this.worker=null;this.ready=null;}

  private ensureReady(){if(this.ready)return this.ready;if(typeof Worker==="undefined"||typeof WebAssembly==="undefined")return Promise.reject(new Error("This browser does not support Stockfish WebAssembly"));this.ready=new Promise<void>((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;try{this.worker=new Worker(workerUrl());this.worker.addEventListener("message",event=>this.onMessage(String(event.data)));this.worker.addEventListener("error",()=>this.fail(new Error("Stockfish worker failed to load")));this.worker.postMessage("uci");setTimeout(()=>{if(this.readyResolve)this.fail(new Error("Stockfish startup timed out"));},8_000);}catch(error){this.fail(error instanceof Error?error:new Error("Stockfish could not start"));}});return this.ready;}

  private onMessage(message:string){
    if(message==="uciok"){this.worker?.postMessage("isready");return;}if(message==="readyok"&&this.readyResolve){this.readyResolve();this.readyResolve=null;this.readyReject=null;return;}
    const pending=this.pending;if(!pending)return;
    if(message.startsWith("info ")){const parsed=parseStockfishInfo(message,pending.whiteToMove);if(!parsed)return;pending.info.push(parsed);if(!pending.flushTimer&&pending.onAnalysis)pending.flushTimer=setTimeout(()=>{if(this.pending!==pending)return;pending.flushTimer=null;const snapshot=this.snapshot(pending);if(snapshot)pending.onAnalysis?.(snapshot);},300);return;}
    if(!message.startsWith("bestmove "))return;this.pending=null;clearTimeout(pending.timer);if(pending.flushTimer)clearTimeout(pending.flushTimer);
    const tokens=message.split(/\s+/);const uci=tokens[1];if(!uci||uci==="(none)"){pending.resolve(null);return;}const bestMove=choiceFromUci(uci);
    try{const verified=new Chess(pending.fen).move(bestMove);if(!verified)throw new Error("illegal");pending.resolve({bestMove,ponder:tokens[2]==="ponder"?tokens[3]:undefined,finalAnalysis:this.snapshot(pending)});}catch{pending.reject(new Error(`Stockfish returned an illegal move: ${uci}`));}
  }
  private snapshot(pending:PendingSearch){const base=analysisSnapshot(pending.searchId,pending.info);if(!base)return;return{...base,candidates:base.candidates.map(candidate=>{const san=sanForPv(pending.fen,candidate.principalVariationUci);return{...candidate,moveSan:san[0],principalVariationSan:san};})};}
  private fail(error:Error){this.readyReject?.(error);this.readyResolve=null;this.readyReject=null;if(this.pending){const pending=this.pending;this.pending=null;clearTimeout(pending.timer);if(pending.flushTimer)clearTimeout(pending.flushTimer);pending.reject(error);}this.worker?.terminate();this.worker=null;this.ready=null;}
}
