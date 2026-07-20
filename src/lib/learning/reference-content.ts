import type {SupportedLocale} from "@/lib/types";

type Section={title:string;body:string};
type Reference={rulesTitle:string;tipsTitle:string;rulesButton:string;tipsButton:string;close:string;boardCaption:string;rules:Section[];tips:Section[]};

export const referenceContent:Record<SupportedLocale,Reference>={
  "zh-CN":{rulesTitle:"国际象棋规则",tipsTitle:"实战技巧",rulesButton:"规则",tipsButton:"技巧",close:"关闭",boardCaption:"初始棋盘：白后在白格，黑后在黑格；白方先走。",rules:[
    {title:"棋盘与目标",body:"棋盘有 8×8 共 64 格。双方各有王、后、两个车、两个象、两个马和八个兵。目标不是吃掉王，而是让被将军的王没有任何合法脱身方法，也就是将死。"},
    {title:"六种棋子的走法",body:"王每次走一格；后沿横、竖或斜线走任意格；车沿横线或竖线走；象沿斜线走；马走“日”字（L 形）并且可以跳过棋子；兵向前走、向斜前方吃子，第一次可前进两格。除马以外，棋子不能穿过其他棋子。"},
    {title:"将军与应将",body:"王受到攻击就是将军，下一步必须解除。可以移动王、吃掉将军的棋子，或者用棋子挡住攻击路线。王不能走到仍被攻击的格子。"},
    {title:"王车易位",body:"王向车的一侧移动两格，车同时越过王并停在王旁边，这是同一个回合的一步棋。王和该车都必须从未移动，中间没有棋子，而且王不能正在被将军、经过被攻击格或停在被攻击格。"},
    {title:"升变与吃过路兵",body:"兵到达对方底线必须升变为后、车、象或马。对方兵从初始位置一次走两格并停在你的兵旁边时，你只能在紧接着的一步按它只走一格的情况斜吃，这叫吃过路兵。"},
    {title:"和棋",body:"常见和棋包括逼和（无合法走法但王没有被将军）、子力不足、三次重复局面、连续五十回合没有兵移动或吃子，以及双方同意和棋。"},
    {title:"记谱法入门",body:"每个格子由字母 a–h 和数字 1–8 表示。K=王、Q=后、R=车、B=象、N=马，兵通常不写字母；x 表示吃子，+ 表示将军，# 表示将死，O-O / O-O-O 表示王车易位。应用里的走法会同时显示白话说明。"}
  ],tips:[
    {title:"先发展马和象",body:"开局尽早把马和象从底线走出来，让它们参与中心和王翼防守。通常不要连续多次移动同一枚棋子。"},
    {title:"争取中心",body:"关注 d4、e4、d5、e5 四个中心格。控制中心能让你的棋子更容易去往棋盘两侧。"},
    {title:"尽早保护王",body:"条件允许时尽早王车易位。王安全以后，再考虑发动进攻。"},
    {title:"不要过早出后",body:"后很强，但太早出动容易被对手的小子追赶，迫使你反复移动并浪费发展机会。"},
    {title:"每步先看三件事",body:"先检查将军，再检查双方能吃什么，最后检查对手正在威胁什么。走完后还要确认刚移动的棋子是否失去保护。"},
    {title:"记住大致子力价值",body:"兵约 1 分，马和象约 3 分，车约 5 分，后约 9 分，王无价。分值不是绝对规则，但能帮助新手判断交换是否划算。"},
    {title:"让车走上开放线",body:"中间没有兵的竖线叫开放线。车在开放线上更容易进入对方阵地；两个车互相连接时通常更有力量。"},
    {title:"复盘比输赢更重要",body:"对局后找出第一次丢子、错过威胁或让王不安全的那一步。一次只改进一个习惯，比背很多开局更有效。"}
  ]},
  en:{rulesTitle:"Chess Rules",tipsTitle:"Practical Tips",rulesButton:"Rules",tipsButton:"Tips",close:"Close",boardCaption:"Starting board: queens begin on their own color; White moves first.",rules:[{title:"Board and goal",body:"The board has 64 squares. Each side starts with a king, queen, two rooks, two bishops, two knights and eight pawns. Win by checkmating the king."},{title:"How pieces move",body:"King: one square. Queen: ranks, files or diagonals. Rook: ranks or files. Bishop: diagonals. Knight: an L shape and may jump. Pawns move forward and capture diagonally."},{title:"Check",body:"A checked king must escape immediately by moving, capturing the attacker or blocking the line. A king may not move onto an attacked square."},{title:"Special moves",body:"Castling moves king and rook as one move under strict safety conditions. Pawns promote on the last rank. En passant is available only immediately after the opposing pawn's two-square advance."},{title:"Draws",body:"Common draws include stalemate, insufficient material, threefold repetition, the fifty-move rule and agreement."},{title:"Notation",body:"Squares use a–h and 1–8. K/Q/R/B/N name pieces; x means capture, + check, # mate, and O-O or O-O-O castling. This app also explains moves in plain language."}],tips:[{title:"Develop knights and bishops",body:"Bring minor pieces off the back rank early and avoid moving the same piece repeatedly without a reason."},{title:"Fight for the center",body:"Pay attention to d4, e4, d5 and e5; central control gives your pieces more routes."},{title:"Protect your king",body:"Castle reasonably early, then begin attacking."},{title:"Do not rush the queen",body:"An early queen can be chased by smaller pieces and cost valuable development time."},{title:"Check three things",body:"Look for checks, captures and threats before every move, then verify that your moved piece remains safe."},{title:"Piece values",body:"Pawn 1, knight/bishop 3, rook 5, queen 9. These are guides, not absolute rules."},{title:"Use open files",body:"Rooks become active on files without pawns and when connected to each other."},{title:"Review one mistake",body:"After a game, find the first lost piece, missed threat or king-safety error and improve one habit at a time."}]},
  ja:{rulesTitle:"チェスのルール",tipsTitle:"実戦のコツ",rulesButton:"ルール",tipsButton:"コツ",close:"閉じる",boardCaption:"初期配置：クイーンは同じ色のマス。白が先手です。",rules:[{title:"盤と目的",body:"盤は 8×8 の64マスです。相手のキングをチェックメイトすれば勝ちです。"},{title:"駒の動き",body:"キングは1マス、クイーンは縦横斜め、ルークは縦横、ビショップは斜め、ナイトはL字で跳べます。ポーンは前進し斜めに取ります。"},{title:"チェック",body:"チェックされたら、キングを動かす、攻撃駒を取る、攻撃線を遮る、のいずれかで必ず解消します。"},{title:"特別な手",body:"キャスリングはキングとルークを同時に動かす1手です。ほかにプロモーションとアンパッサンがあります。"},{title:"引き分け",body:"ステイルメイト、戦力不足、同一局面3回、50手ルール、合意などがあります。"},{title:"棋譜",body:"マスは a–h と 1–8。K/Q/R/B/N は駒、x は取る、+ はチェック、# はメイト、O-O はキャスリングです。本アプリは平易な説明も表示します。"}],tips:[{title:"ナイトとビショップを展開",body:"序盤で後列から出し、同じ駒を理由なく何度も動かさないようにします。"},{title:"中央を取る",body:"d4、e4、d5、e5 を意識すると駒の行き先が増えます。"},{title:"キングを守る",body:"可能なら早めにキャスリングしてから攻撃を考えます。"},{title:"クイーンを急いで出さない",body:"早すぎるクイーンは小駒に追われ、展開の手数を失います。"},{title:"3つを確認",body:"毎手、チェック、取り、脅威の順に確認し、動かした駒が安全か見直します。"},{title:"駒の価値",body:"ポーン1、ナイトとビショップ3、ルーク5、クイーン9が目安です。"},{title:"オープンファイル",body:"ポーンのない縦列ではルークが活躍しやすくなります。"},{title:"一つずつ復習",body:"最初の駒損、見落とした脅威、キングの危険を探し、一度に一つ改善します。"}]}
};
