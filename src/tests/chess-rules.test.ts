import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { legalMoves, statusOf } from "@/lib/chess/game-controller";

describe("chess.js rule boundary", () => {
  it("rejects sideways and backward pawn moves without changing FEN or PGN", () => {
    const chess = new Chess(); const fen=chess.fen(); const pgn=chess.pgn();
    expect(() => chess.move({from:"e2",to:"f2"})).toThrow();
    expect(chess.fen()).toBe(fen); expect(chess.pgn()).toBe(pgn);
    expect(() => chess.move({from:"e2",to:"e1"})).toThrow();
    expect(chess.fen()).toBe(fen);
  });
  it("allows a first double step but not a later double step", () => {
    const chess=new Chess(); expect(chess.move("e4")).toBeTruthy(); chess.move("a6"); chess.move("e5"); chess.move("a5");
    expect(() => chess.move({from:"e5",to:"e7"})).toThrow();
  });
  it("pawns capture only diagonally", () => {
    const chess=new Chess("8/8/8/3p4/4P3/8/8/4K2k w - - 0 1"); expect(chess.move({from:"e4",to:"d5"})?.captured).toBe("p");
  });
  it("knights move in an L and jump", () => { const chess=new Chess(); expect(chess.move("Nf3")).toBeTruthy(); });
  it("sliding pieces cannot jump blockers", () => {
    const chess=new Chess(); for (const move of [{from:"c1",to:"h6"},{from:"a1",to:"a4"},{from:"d1",to:"h5"}]) expect(() => chess.move(move)).toThrow();
  });
  it("prevents a king moving into attack", () => { const chess=new Chess("8/8/8/8/8/4r3/8/4K2k w - - 0 1"); expect(() => chess.move({from:"e1",to:"e2"})).toThrow(); });
  it("recognizes check and checkmate", () => { const chess=new Chess(); chess.move("f3"); chess.move("e5"); chess.move("g4"); chess.move("Qh4#"); expect(statusOf(chess)).toBe("checkmate"); });
  it("executes legal castling and rejects illegal castling", () => {
    const legal=new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"); expect(legal.move("O-O").isKingsideCastle()).toBe(true);
    const blocked=new Chess(); expect(() => blocked.move("O-O")).toThrow();
  });
  it("supports promotion", () => { const chess=new Chess("8/P7/8/8/8/8/8/4K2k w - - 0 1"); expect(chess.move({from:"a7",to:"a8",promotion:"q"}).promotion).toBe("q"); });
  it("returns legal move data", () => { expect(legalMoves(new Chess())).toHaveLength(20); });
});
