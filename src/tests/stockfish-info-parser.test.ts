import {describe,expect,it} from "vitest";
import {analysisSnapshot,parseStockfishInfo} from "@/lib/chess/stockfish-info-parser";

describe("Stockfish info parser",()=>{
  it("parses cp, depth, multipv and pv",()=>{const parsed=parseStockfishInfo("info depth 12 seldepth 18 multipv 2 score cp 73 nodes 1234 nps 50000 time 25 pv d7d6 d2d4",false)!;expect(parsed.score).toEqual({type:"centipawn",value:-73,perspective:"white"});expect(parsed.rank).toBe(2);expect(parsed.principalVariationUci).toEqual(["d7d6","d2d4"]);});
  it("parses mate and flips the side-to-move perspective",()=>{expect(parseStockfishInfo("info depth 9 score mate -3 pv h7h8q",false)?.score).toEqual({type:"mate",value:3,perspective:"white"});});
  it("ignores incomplete and malformed lines",()=>{expect(parseStockfishInfo("info depth 4 nodes 20",true)).toBeNull();expect(parseStockfishInfo("bestmove e2e4",true)).toBeNull();});
  it("keeps the latest depth for each candidate",()=>{const lines=["info depth 5 multipv 1 score cp 10 pv e2e4","info depth 7 multipv 1 score cp 20 pv d2d4","info depth 6 multipv 2 score cp 15 pv g1f3"].map(line=>parseStockfishInfo(line,true)!);const result=analysisSnapshot("s",lines)!;expect(result.depth).toBe(7);expect(result.candidates.map(c=>c.moveUci)).toEqual(["d2d4","g1f3"]);});
});
