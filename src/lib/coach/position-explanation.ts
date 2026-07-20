import {Chess,type Color,type Square} from "chess.js";
import {getMessages} from "@/lib/i18n/messages";
import type {MoveRecord,SupportedLocale} from "@/lib/types";

const centers=["d4","e4","d5","e5"] as Square[];
const starts:Record<string,string[]>={knight:["b1","g1","b8","g8"],bishop:["c1","f1","c8","f8"]};
const sliders=["bishop","rook","queen"] as const;
function withTurn(fen:string,color:Color){const fields=fen.split(" ");fields[1]=color;try{return new Chess(fields.join(" "));}catch{return new Chess(fen);}}
function mobility(fen:string,color:Color,piece:string){const chess=withTurn(fen,color);let total=0;for(const row of chess.board())for(const item of row)if(item?.color===color&&item.type===({bishop:"b",rook:"r",queen:"q"} as Record<string,string>)[piece]){try{total+=chess.moves({square:item.square,verbose:true}).length;}catch{/* ignore checked positions */}}return total;}
function newlyAttacked(beforeFen:string,afterFen:string,color:Color){const before=new Chess(beforeFen),after=new Chess(afterFen),enemy=color==="w"?"b":"w";const result:string[]=[];for(const row of after.board())for(const item of row)if(item?.color===enemy&&!before.isAttacked(item.square,color)&&after.isAttacked(item.square,color))result.push(item.square);return result;}

export function explainOpponentMove(locale:SupportedLocale,beforeFen:string,afterFen:string,move:MoveRecord){
  const m=getMessages(locale),color=new Chess(afterFen).turn()==="w"?"b":"w";const piece=m.pieces[move.piece];const facts:string[]=[];const core=move.san.replace(/[+#]+$/,"");
  if(core==="O-O"||core==="O-O-O")facts.push(locale==="zh-CN"?"它同时把王移向安全位置，并让车更快参加战斗":locale==="ja"?"キングを安全な側へ移し、同時にルークを働かせました":"It moved the king toward safety and activated a rook at the same time");
  if(move.san.endsWith("#"))facts.push(locale==="zh-CN"?"这一步形成了将死":locale==="ja"?"この手でチェックメイトです":"This move gives checkmate");else if(move.san.endsWith("+"))facts.push(locale==="zh-CN"?"这一步直接将军，你必须先处理王的安全":locale==="ja"?"この手はチェックなので、まずキングの安全を確保する必要があります":"This move gives check, so you must deal with your king's safety first");
  if(move.captured)facts.push(locale==="zh-CN"?`它直接吃掉了你的${m.pieces[move.captured]}`:locale==="ja"?`あなたの${m.pieces[move.captured]}を取りました`:`It directly captured your ${m.pieces[move.captured]}`);
  if((move.piece==="knight"||move.piece==="bishop")&&starts[move.piece].includes(move.from))facts.push(locale==="zh-CN"?`它把${piece}从初始位置走出，让这枚棋子开始参与中心争夺`:locale==="ja"?`${piece}を初期位置から展開し、中央に働かせました`:`It developed the ${piece} from its starting square toward the center`);
  for(const slider of sliders)if(mobility(afterFen,color,slider)>mobility(beforeFen,color,slider)){facts.push(locale==="zh-CN"?`这一步打开了${m.pieces[slider]}的活动路线`:locale==="ja"?`この手で${m.pieces[slider]}の通り道が開きました`:`This move opened a line for the ${m.pieces[slider]}`);break;}
  if(centers.includes(move.to as Square))facts.push(locale==="zh-CN"?`它直接占据了中心格 ${move.to}`:locale==="ja"?`中央の ${move.to} を直接占めました`:`It directly occupied the central square ${move.to}`);
  const attacks=newlyAttacked(beforeFen,afterFen,color);if(attacks.length)facts.push(locale==="zh-CN"?`走完后新攻击了 ${attacks.slice(0,2).join("、")} 上的棋子`:locale==="ja"?`指した後、${attacks.slice(0,2).join("、")} の駒を新しく攻撃しています`:`After moving, it newly attacks the piece${attacks.length>1?"s":""} on ${attacks.slice(0,2).join(" and ")}`);
  const moveText=locale==="zh-CN"?`电脑走了 ${move.san}（${piece}从 ${move.from} ${move.captured?"吃到":"走到"} ${move.to}）`:locale==="ja"?`コンピューターは ${move.san}（${piece}を ${move.from} から ${move.to} へ${move.captured?"動かして駒を取る":"動かす"}）`:`The computer played ${move.san} (${piece} ${move.captured?"captures on":`moves from ${move.from} to`} ${move.to})`;
  const reason=facts.slice(0,2).join(locale==="en"?". ":"；");
  const fallback=locale==="zh-CN"?"这一步没有立即吃子或将军；它是当前搜索中评分较高的应对":locale==="ja"?"すぐに駒を取ったりチェックしたりする手ではなく、現在の探索で評価が高い応手です":"It does not capture or check immediately; it is a highly rated reply in the current search";
  const observation=move.san.endsWith("+")?(locale==="zh-CN"?"先找出所有能解除将军的合法走法。":locale==="ja"?"まずチェックを解消できる合法手をすべて探しましょう。":"First find every legal move that gets out of check."):attacks.length?(locale==="zh-CN"?`先检查 ${attacks[0]} 上的棋子是否需要移动或增加保护。`:locale==="ja"?`まず ${attacks[0]} の駒を動かすか、守りを足す必要があるか確認しましょう。`:`First check whether the piece on ${attacks[0]} must move or needs more protection.`):(locale==="zh-CN"?`观察 ${move.to} 周围新增加的攻击和通路，再决定下一步。`:locale==="ja"?`${move.to} の周りで新しく生まれた攻撃や通り道を確認しましょう。`:`Look for newly opened lines and attacks around ${move.to} before choosing your next move.`);
  return{explanation:`${moveText}。${reason||fallback}。`,observation};
}
