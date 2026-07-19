import { describe,expect,it } from "vitest";
import { Chess } from "chess.js";
import { legalMoves } from "@/lib/chess/game-controller";
import { BeginnerOpponentEngine } from "@/lib/chess/beginner-opponent-engine";

describe("BeginnerOpponentEngine", () => {
  it("always returns a legal move", async () => { const chess=new Chess(); chess.move("e4"); const move=await new BeginnerOpponentEngine(7).chooseMove({fen:chess.fen(),legalMoves:legalMoves(chess),level:"beginner"}); expect(move).not.toBeNull(); expect(() => chess.move(move!)).not.toThrow(); });
  it("is reproducible with a fixed seed", async () => { const chess=new Chess(); chess.move("d4"); const input={fen:chess.fen(),legalMoves:legalMoves(chess),level:"beginner" as const}; expect(await new BeginnerOpponentEngine(42).chooseMove(input)).toEqual(await new BeginnerOpponentEngine(42).chooseMove(input)); });
  it("handles no legal moves", async () => { expect(await new BeginnerOpponentEngine(1).chooseMove({fen:new Chess().fen(),legalMoves:[],level:"beginner"})).toBeNull(); });
  it("finds a legal escape when checked", async () => { const chess=new Chess("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1"); expect(chess.inCheck()).toBe(true); const move=await new BeginnerOpponentEngine(3).chooseMove({fen:chess.fen(),legalMoves:legalMoves(chess),level:"beginner"}); chess.move(move!); expect(chess.inCheck()).toBe(false); });
});
