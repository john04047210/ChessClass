import { describe,expect,it } from "vitest";
import { LocalCoachService, localIllegalMessage } from "@/lib/coach/local-coach-service";
import type { CoachRequest, SupportedLocale } from "@/lib/types";

function request(locale:SupportedLocale):CoachRequest{return{locale,gameId:"game",turnId:"turn",player:{nickname:"A",level:"absolute_beginner",learnedRules:[],recurringMistakes:[]},game:{fenBeforeUserMove:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",fenAfterUserMove:"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",pgn:"1. e4",turnNumber:1,status:"playing"},userMove:{san:"e4",from:"e2",to:"e4",piece:"pawn"},legalMovesBeforeUserMove:["e4"],legalMovesAfterOpponentMove:["Nf3"],requestedDetail:"default"};}
describe("LocalCoachService",()=>{
  it.each(["zh-CN","en","ja"] as SupportedLocale[])("returns localized output for %s",async(locale)=>{const result=await new LocalCoachService().explainTurn(request(locale));expect(result.locale).toBe(locale);expect(result.userMoveSummary.length).toBeGreaterThan(5);expect(result.provider).toBe("local_fallback");});
  it("expands SAN notation for a complete beginner",async()=>{const input=request("zh-CN");input.opponentMove={san:"Nf6",from:"g8",to:"f6",piece:"knight"};const result=await new LocalCoachService().explainTurn(input);expect(result.opponentMoveExplanation).toContain("Nf6（马从 g8 走到 f6）");});
  it("explains queenside castling with check as one special move",async()=>{const input=request("zh-CN");input.opponentMove={san:"O-O-O+",from:"e8",to:"c8",piece:"king"};const result=await new LocalCoachService().explainTurn(input);expect(result.opponentMoveExplanation).toContain("王从 e8 到 c8，车同时从 a8 到 d8");expect(result.opponentMoveExplanation).toContain("+ 表示这一步还形成了将军");expect(result.ruleTaught?.key).toBe("castling");});
  it("explains an illegal sideways pawn in every language",()=>{expect(localIllegalMessage("zh-CN","pawn")).toContain("横");expect(localIllegalMessage("en","pawn")).toContain("sideways");expect(localIllegalMessage("ja","pawn")).toContain("横");});
});
