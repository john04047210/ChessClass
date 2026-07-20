import type { EngineAnalysisSnapshot, EngineCandidate, EngineScore } from "@/lib/types";

type ParsedInfo = Omit<EngineCandidate,"moveSan"|"principalVariationSan"> & {depth:number;selDepth?:number;nodes?:number;nps?:number;elapsedMs?:number};

function numberAfter(tokens:string[],key:string):number|undefined { const index=tokens.indexOf(key); if(index<0)return; const value=Number(tokens[index+1]); return Number.isFinite(value)?value:undefined; }

export function parseStockfishInfo(line:string,whiteToMove:boolean):ParsedInfo|null {
  const tokens=line.trim().split(/\s+/); if(tokens[0]!=="info"||!tokens.includes("score")||!tokens.includes("pv"))return null;
  const depth=numberAfter(tokens,"depth"); const scoreIndex=tokens.indexOf("score"); const pvIndex=tokens.indexOf("pv");
  if(depth===undefined||scoreIndex<0||pvIndex<0||pvIndex+1>=tokens.length)return null;
  const raw=Number(tokens[scoreIndex+2]); if(!Number.isFinite(raw))return null;
  const factor=whiteToMove?1:-1; const kind=tokens[scoreIndex+1]; let score:EngineScore;
  if(kind==="cp")score={type:"centipawn",value:raw*factor,perspective:"white"};
  else if(kind==="mate")score={type:"mate",value:raw*factor,perspective:"white"}; else return null;
  const pv=tokens.slice(pvIndex+1); if(!pv.length)return null;
  return {rank:numberAfter(tokens,"multipv")||1,moveUci:pv[0],score,principalVariationUci:pv,depth,selDepth:numberAfter(tokens,"seldepth"),nodes:numberAfter(tokens,"nodes"),nps:numberAfter(tokens,"nps"),elapsedMs:numberAfter(tokens,"time")};
}

export function analysisSnapshot(searchId:string,items:ParsedInfo[]):EngineAnalysisSnapshot|undefined {
  if(!items.length)return; const latest=new Map<number,ParsedInfo>();
  for(const item of items){const current=latest.get(item.rank);if(!current||item.depth>=current.depth)latest.set(item.rank,item);}
  const candidates=[...latest.values()].sort((a,b)=>a.rank-b.rank).slice(0,3);
  const depth=Math.max(...candidates.map(item=>item.depth));
  return {searchId,depth,selDepth:Math.max(...candidates.map(item=>item.selDepth||0))||undefined,nodes:Math.max(...candidates.map(item=>item.nodes||0))||undefined,nps:Math.max(...candidates.map(item=>item.nps||0))||undefined,elapsedMs:Math.max(...candidates.map(item=>item.elapsedMs||0))||undefined,candidates:candidates.map(item=>({rank:item.rank,moveUci:item.moveUci,score:item.score,principalVariationUci:item.principalVariationUci}))};
}
