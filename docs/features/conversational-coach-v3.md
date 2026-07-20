# 右侧真人式对话教练改造方案 v3

- 状态：待评审
- 优先级：P0
- 更新日期：2026-07-20
- 输入方案：`codex_chess_conversation_static_v2.md`
- 适用基线：当前 `main` 源码，而不是最初 MVP PDF
- 关联文档：[局面感知型本地教练](position-aware-local-coach.md)

## 1. 产品目标

把右侧“4 段固定结论”改造成随棋局推进的连续对话，让玩家感觉在与“对手”和“教练”共同复盘，而不是阅读每回合被覆盖的一张报告。

对话包含三个稳定角色：

- `player`：我 / Me / 私
- `opponent`：对手 / Opponent / 相手
- `coach`：教练 / Coach / コーチ

目标不是伪造真人或展示隐藏思维链，而是把以下可观察事实按自然节奏表达：

- 玩家实际走法。
- 引擎正在搜索的状态。
- Stockfish 真实输出的候选、评分和主要变化。
- 对手实际执行的最终着法。
- chess.js 和局面差异分析器能够验证的原因。
- 教练对玩家下一步的具体观察建议。

默认模式继续完全静态、免费、无账号、无远程 API。未来远程 AI 只负责表达增强和自由追问，不能成为棋规、引擎着法或基础解释的事实来源。

## 2. 对 v2 方案的主要修订

### 2.1 不能从 UI 开始重构

当前 `StockfishOpponentEngine` 只解析 `uciok`、`readyok` 和 `bestmove`，没有分析快照、搜索 id、按回合取消或进度回调。如果先做聊天 UI，“对手正在比较什么”仍然只能是假数据。

实施必须先完成引擎搜索协议，再接入对话控制器和 UI。

### 2.2 不建立第二套独立历史真相

当前项目已有 `GameTimeline`，每个节点代表一个已完成回合，并支持连续悔棋、取消悔棋和重新走棋后截断未来分支。不能再建立一套与时间线无关的无限消息数组，否则悔棋后棋盘和对话会分叉。

对话消息必须绑定 `gameId`、`turnId` 和时间线节点；可见历史由当前 timeline cursor 决定。正在执行但尚未完成的回合使用短暂 `activeTurn` 状态，完成后一次性提交到时间线。

### 2.3 兼容两个电脑引擎

当前玩家可以选择：

- Stockfish 18 Lite
- `BeginnerOpponentEngine`

启蒙引擎没有 depth、score、PV 或 MultiPV。消息模型必须允许 `engineAnalysis` 缺失；此时只陈述实际着法和棋盘事实，不能显示伪造候选。

### 2.4 保留现有可选网关

当前静态客户端已经支持 `NEXT_PUBLIC_COACH_API_URL`，并在失败时回退 `LocalCoachService`。v2 所说“当前完全没有远程接口”不符合源码。

改造时应：

- 保留可选网关能力。
- 为旧 `CoachRequest/CoachResponse` 提供过渡适配器。
- 不新增必须运行的 `/api/coach`。
- 不把 OpenAI API Key 放入浏览器。
- 后续再决定是否清理当前未进入浏览器路径的 OpenAI 服务端遗留文件和 npm 依赖。

### 2.5 对话存储上限调整

100 条消息只够约 20～30 个完整回合，普通完整对局可能不够。采用：

- 每局最多 300 条已完成消息。
- 每个分析快照最多 3 个候选。
- 每个候选最多保存 8 个 PV 半回合。
- 不保存原始 UCI `info` 行。
- `opponent_thinking` 等临时消息默认不持久化，刷新后从稳定状态恢复。

预计单局仍远低于常见 localStorage 配额，但实现时必须加入裁剪测试和存储失败保护。

### 2.6 不在第一阶段强制 MultiPV

Stockfish 18 的 UCI 能力包含 `MultiPV`，实测安装包公开的范围为 1～256；但浏览器 Lite 构建仍应在 `uci` 握手时动态记录能力，不能硬编码假设。

同时，MultiPV=3 会在固定 350ms 搜索时间内降低每条路线的深度，移动设备影响更明显。因此：

- 第一阶段先稳定解析单 PV、score、depth 和 bestmove。
- MultiPV 作为后续能力开关。
- 不支持、超时或性能不足时只展示主要变化。
- 绝不为了满足 UI 数量伪造三个候选。

### 2.7 “我该怎么办”必须复用同一建议

三级提示不能每次重新搜索并返回不同答案。第一次请求时为当前 FEN 建立一个 `CoachSuggestion`，后续“再具体一点”和“显示推荐着法”逐步揭示同一建议。玩家走棋、悔棋、重开或切换到不同 FEN 后立即使建议失效。

## 3. 当前代码基线

### 已有能力

- `chess.js` 是合法走法和棋局状态的事实来源。
- Stockfish 18 Lite 单线程 WASM 在 Web Worker 中运行。
- Stockfish 失败时自动降级到启蒙引擎。
- 电脑准备、目标格和落子动画已经存在。
- `LocalCoachService`、可选外部网关和回合身份校验已经存在。
- 教练快照与 `GameTimeline` 节点关联，可在 F5、悔棋和取消悔棋后恢复。
- localStorage key 为 `chess-coach-player-v1`，当前读取方式只有最低限度校验，没有正式 schema migration。
- 三语、静态导出、GitHub Pages `/ChessClass` 和 Playwright 流程已经稳定。

### 必须解决的结构问题

- `ChessLearningApp.tsx` 同时负责棋局、引擎、动画、时间线、存储和教练，继续加入对话逻辑会失控。
- `CoachPanel` 只展示最新一个 `CoachResponse`，不保存连续消息。
- Stockfish 搜索没有显式 `cancelSearch()`，悔棋只依赖 UI 锁定和 gameId 检查，无法立即终止本次 worker 搜索。
- 当前 `info` 行完全丢弃，无法提供真实候选、评分和 PV。
- 本地教练的意图、电脑原因和下一步观察大量使用固定模板。
- 玩家点击提示后仍覆盖当前面板内容，不形成提问与回答历史。

## 4. 核心领域模型

领域类型放在专门模块，不继续堆入单个组件。

```ts
export type ConversationRole = "player" | "opponent" | "coach" | "system";

export type ConversationMessageType =
  | "player_move"
  | "opponent_thinking"
  | "opponent_analysis"
  | "opponent_decision"
  | "coach_comment"
  | "coach_advice"
  | "player_question"
  | "rule_explanation"
  | "system_notice"
  | "error";

export type ConversationMessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "cancelled"
  | "error";

export type MessageContent =
  | { kind: "localized"; key: string; params?: Record<string, string | number> }
  | { kind: "generated"; text: string; locale: SupportedLocale };

export interface ConversationMessage {
  id: string;
  sequence: number;
  gameId: string;
  turnId: string;
  historyNodeTurnId?: string;
  role: ConversationRole;
  type: ConversationMessageType;
  status: ConversationMessageStatus;
  createdAt: string;
  content: MessageContent;
  move?: MoveRecord & { color: "white" | "black" };
  engineAnalysis?: EngineAnalysisSnapshot;
  actions?: ConversationAction[];
  metadata?: {
    provider?: "local" | "remote_gateway";
    relatedMessageId?: string;
    suggestionId?: string;
    followsSuggestion?: boolean;
    withdrawn?: boolean;
  };
}
```

采用混合内容而不是只保存最终文本：

- 棋步、状态、系统提示等确定性消息保存翻译 key 和参数，切换语言后可重新渲染。
- 本地或远程生成的长解释保存生成时文本和 locale，历史不自动翻译。
- role 永远是稳定枚举，不把“我”“对手”“教练”存作业务值。

## 5. 引擎分析模型与评分视角

```ts
export type EngineScore =
  | { type: "centipawn"; value: number; perspective: "white" }
  | { type: "mate"; value: number; perspective: "white" };

export interface EngineCandidate {
  rank: number;
  moveUci: string;
  moveSan?: string;
  score: EngineScore;
  principalVariationUci: string[];
  principalVariationSan?: string[];
}

export interface EngineAnalysisSnapshot {
  searchId: string;
  depth: number;
  selDepth?: number;
  nodes?: number;
  nps?: number;
  elapsedMs?: number;
  candidates: EngineCandidate[];
}

export interface EngineSearchResult {
  bestMove: Pick<LegalMove, "from" | "to" | "promotion">;
  ponder?: string;
  finalAnalysis?: EngineAnalysisSnapshot;
}
```

UCI 的 `score cp` 默认是当前行走方视角。解析器必须根据输入 FEN 的 side-to-move 统一转换为白方视角，并对 `lowerbound`、`upperbound` 和 mate score 保留或正确降级。UI 再根据玩家执色翻译为“白方略好”“黑方明显好”等初学者文本。

PV 的 SAN 转换必须从搜索起始 FEN 逐步用 chess.js 重放，任何非法 UCI 着法导致该条 PV 截断，不能让展示错误影响最终 bestmove。

## 6. Stockfish 搜索服务

把当前 `chooseMove()` 升级为可观察、可取消的搜索：

```ts
export interface EngineSearchOptions {
  fen: string;
  legalMoves: LegalMove[];
  level: "beginner";
  multiPv?: number;
  moveTimeMs?: number;
  signal?: AbortSignal;
  onAnalysis?: (snapshot: EngineAnalysisSnapshot) => void;
}

export interface OpponentEngine {
  searchMove(input: EngineSearchOptions): Promise<EngineSearchResult | null>;
  cancelSearch(reason?: string): void;
  dispose(): void;
}
```

必须满足：

- 每次搜索生成唯一 `searchId`。
- `info` 高频更新在引擎层聚合，最多每 300ms 通知 UI 一次。
- 每个 multipv rank 只保留当前最高或最新深度。
- `bestmove` 到达后再用 chess.js 验证。
- AbortSignal、悔棋、重开、引擎切换和组件卸载都会发送 `stop` 并使当前 searchId 失效。
- 已取消搜索迟到的 `info` 和 `bestmove` 被忽略。
- 超时后降级启蒙引擎，但对话明确显示实际引擎，不伪造分析详情。
- 现有 `chooseMove()` 可暂时作为兼容包装，待调用方迁移后删除。

## 7. 对话状态与棋局时间线

在 `currentGame` 中增加版本化状态：

```ts
interface ConversationState {
  messages: ConversationMessage[];
  nextSequence: number;
  coachMode: "disabled" | "local" | "remote_gateway";
  activeSuggestion?: CoachSuggestion;
}

interface ActiveTurnState {
  gameId: string;
  turnId: string;
  phase: "player_moved" | "engine_searching" | "engine_decided" | "coaching";
  transientMessageIds: string[];
}
```

规则：

- 玩家合法落子后立即创建 turnId 和 `player_move`。
- `opponent_thinking` 可以存在 React/控制器临时状态中；只在需要刷新恢复时保存简化状态，不保存每次分析更新。
- 回合完成时，把最终消息和最终精简分析一次性提交。
- 每条完成消息绑定 turnId；时间线 cursor 决定哪些回合消息可见。
- 从历史节点重新走棋时，沿用当前 `beginNewTimelineBranch()` 语义，同时删除被截断 turnId 的消息和建议。
- 悔棋时停止搜索，并将当前节点之后的消息隐藏；取消悔棋时恢复。
- 不用“已撤销”消息污染主时间线；未来若需要分支可视化，再单独设计。

## 8. 回合状态机与对话顺序

一个正常回合按状态机推进：

1. `player_move`：玩家落子后立即完成。
2. 可选 `coach_comment`：只有局面分析器发现高价值事实时出现。
3. `opponent_thinking`：搜索开始时插入一条 streaming 消息。
4. `opponent_analysis`：更新同一分析区域，不为每条 info 新建消息。
5. `opponent_decision`：bestmove 验证并实际落子后完成。
6. 可选 `coach_comment`：说明具体影响和下一观察点。

重要修订：当前棋盘已有约 420ms、850ms、650ms 的演示延迟。新版不再额外增加“像真人”的假等待，但保留棋子准备与落子动画所需的最短视觉时长。引擎如果先完成，结果等待动画阶段；引擎较慢则展示真实搜索状态。

所有异步写入通过 `(gameId, turnId, searchId)` 三重校验。

## 9. 本地解释器与角色边界

### 对手消息

对手只表达引擎可观察结果和棋盘事实，例如：

> 我重点分析了 Nxe4。最终选择 Nxe4，交换中央的马。

不使用：

- “这是我的真实想法”。
- “我早就计划了五步后的陷阱”。
- 没有 PV 或局面证据的具体战略宣称。

### 教练消息

教练是独立观察者，负责：

- 解释这一步具体改变了什么。
- 指出玩家当前需要处理的攻击或威胁。
- 给出逐级提示。
- 解释规则和 SAN。

教练不代表对手，不决定电脑着法，不自动把玩家不同于建议的走法判错。

### 无可靠原因时

删除当前万能模板。没有足够证据时使用中性说明：

> 这是引擎当前搜索中评分较高的应对。它没有立即吃子或将军；先观察这一步新打开或控制了哪些格子。

如果连具体观察点也无法计算，则宁可只显示事实，不插入教练点评。

## 10. “我该怎么办”与三级提示

按钮只在轮到玩家且对局未结束时启用。

首次点击：

1. 插入 `player_question`：“我该怎么办？”
2. 为当前 FEN 创建或复用一个建议分析。
3. 保存 `CoachSuggestion`，并返回 hint 1。

后续按钮逐级显示：

- hint 1：具体观察点，不给着法。
- hint 2：候选棋子、区域或应对方向。
- hint 3：一个经过 chess.js 验证的具体推荐着法和简短理由。

如果使用 Stockfish 搜索玩家建议：

- 搜索与电脑落子搜索共用同一 worker 队列，不能并发。
- 玩家开始拖动或提交走法时取消未完成建议搜索。
- 同一 FEN 的三级提示复用同一 finalAnalysis，避免答案漂移。
- 启蒙引擎模式下仍可选择是否使用 Stockfish 作为“教练分析器”；第一版建议明确分离设置，避免玩家以为对手强度等于教练分析强度。

## 11. 右侧 UI

### 顶部

- 标题：对话 / Conversation / 対話。
- 当前状态：轮到你、对手思考中、对局结束。
- 教练模式：关闭、基础教练；配置网关后可显示 AI 增强。

### 中部

- 使用全宽纵向消息卡片，不使用过窄左右气泡。
- 每条显示角色、图标、正文、可选 SAN、操作和折叠详情。
- 玩家、对手、教练使用稳定的颜色和图标，但不只依赖颜色区分。
- `aria-live` 只播报关键完成消息，Stockfish 高频分析不能反复打断读屏。
- 默认隐藏深度、节点、评分和 PV；展开后显示初学者解释和原始值。

### 底部

- 玩家回合：我该怎么办、再具体一点、显示推荐着法。
- 对手回合：分析状态、查看/隐藏引擎详情。
- 对局结束：查看本局记录、重新开始。
- 现有学习进度移到紧凑可折叠区或对话底部，不删除其数据。

### 滚动

- 用户距离底部不超过约 80px 时自动跟随新消息。
- 用户正在阅读历史时显示“有新消息”按钮，不强制拉到底。
- 切换语言、悔棋和恢复存档后保持合理滚动位置。
- 尊重 `prefers-reduced-motion`。

## 12. 教练服务兼容层

不要立即用 v2 的新 `CoachRequest` 覆盖现有类型。采用版本化接口：

```ts
export type CoachRequestV2 = {
  requestType:
    | "comment_player_move"
    | "comment_full_turn"
    | "ask_what_should_i_do"
    | "more_detail"
    | "hint_1"
    | "hint_2"
    | "hint_3";
  locale: SupportedLocale;
  gameId: string;
  turnId: string;
  fen: string;
  pgn?: string;
  legalMoves: LegalMove[];
  latestMove?: MoveRecord;
  engineAnalysis?: EngineAnalysisSnapshot;
  activeSuggestion?: CoachSuggestion;
};

export interface ConversationalCoachService {
  respond(input: CoachRequestV2, signal?: AbortSignal): Promise<CoachMessageResult>;
}
```

迁移期提供：

- `LocalConversationalCoachService`：新本地实现。
- `LegacyCoachAdapter`：把旧 CoachResponse 转成过渡消息，直到新解释器覆盖全部场景。
- `GatewayConversationalCoachService`：配置 `NEXT_PUBLIC_COACH_API_URL` 时调用现有外部网关能力；协议升级需要版本字段或新 endpoint 契约。

远程响应只能引用请求中提供的结构化事实；客户端仍以 gameId、turnId 和 AbortSignal 拒绝过期结果。

## 13. localStorage 迁移

当前 `loadProfile()` 直接断言 JSON 为 `PlayerProfile`，不足以支撑本次结构变化。先加入：

```ts
interface StoredProfileEnvelope {
  schemaVersion: 2;
  profile: PlayerProfile;
}
```

迁移要求：

- 读取现有 `chess-coach-player-v1`，识别无 envelope 的旧结构。
- 旧 `lastCoach` 转成当前节点的一组过渡完成消息，或保留为 legacy snapshot 直到该回合再次生成；不能重复迁移。
- 缺少 conversation 时初始化空状态。
- 缺少 coachMode 时默认 `local`。
- 迁移前后保留 playerId、昵称、语言、引擎、FEN、PGN、时间线和进度。
- 解析失败时备份原始字符串到单独 recovery key，再回退新档案；不要直接覆盖损坏数据。
- 写入 localStorage 捕获 quota 错误，裁剪旧消息后重试一次。

## 14. 推荐代码结构

在当前目录命名基础上演进，不机械复制旧方案：

```text
src/
  components/conversation/
    ConversationPanel.tsx
    ConversationHeader.tsx
    ConversationTimeline.tsx
    ConversationMessageCard.tsx
    EngineAnalysisDetails.tsx
    ConversationActions.tsx

  lib/chess/
    stockfish-opponent-engine.ts
    stockfish-info-parser.ts
    engine-analysis.ts
    position-diff-analyzer.ts
    local-engine-explanation-service.ts

  lib/conversation/
    types.ts
    message-builders.ts
    conversation-reducer.ts
    conversation-controller.ts
    selectors.ts

  lib/coach/
    conversational-coach-service.ts
    local-conversational-coach-service.ts
    legacy-coach-adapter.ts
    suggestion-tracker.ts

  lib/player/
    storage.ts
    migrations.ts
```

`ChessLearningApp` 最终只协调棋盘控制器、对话控制器和展示状态，不直接解析 UCI、拼装多语言消息或操作消息数组。

## 15. 分阶段交付

每个阶段都必须保持 main 可运行、静态可部署，不采用一次性大爆炸重构。

### 阶段 0：契约和回归基线

- 为当前关键流程补充测试夹具和 FEN 场景。
- 建立 conversation、engine analysis 和 storage v2 类型。
- 加入 schema migration，但暂不替换 UI。
- 记录旧 CoachResponse 到新消息的映射。

完成条件：现有 UI 行为不变，旧存档迁移测试通过。

### 阶段 1：可取消的 Stockfish 分析

- 提取纯函数 UCI info parser。
- 解析 depth、seldepth、multipv、cp/mate score、bounds、nodes、nps、time、PV、bestmove 和 ponder。
- 建立 searchId、AbortSignal、节流和 `cancelSearch()`。
- 单 PV 默认运行；动态记录 MultiPV capability。
- 保持现有电脑落子和动画不变。

完成条件：最终着法仍与棋盘一致；悔棋、重开和切换引擎后旧 bestmove 永不执行。

### 阶段 2：最小连续对话

- 新建 ConversationPanel，替换 CoachPanel 视觉结构。
- 先只接入 `player_move`、`opponent_thinking`、`opponent_decision`。
- Stockfish 展示真实单 PV；启蒙引擎不展示候选。
- 与 timeline cursor 集成并支持刷新恢复。

完成条件：对话与实际棋盘每一步一致，悔棋/取消悔棋一致。

### 阶段 3：局面感知本地教练

- 实现 position diff analyzer。
- 替换固定“发展棋子、争夺空间”模板。
- 接入可选 local/disabled 教练模式。
- 只在有新教学价值时插入教练消息。

完成条件：至少覆盖吃子、将军、易位、发展、中心、开线、攻击、保护和躲避威胁；每类有单元测试。

### 阶段 4：提问与分层建议

- 实现“我该怎么办”。
- 同一 FEN 复用 CoachSuggestion。
- 实现 hint 1/2/3 和采用建议跟踪。
- 不同走法不自动判错。

完成条件：所有推荐着法经 chess.js 验证，建议在走棋/悔棋/重开后正确失效。

### 阶段 5：MultiPV 与引擎详情

- 在真实能力与性能测试通过后启用最多 3 个候选。
- 增加折叠的深度、评分、候选和 PV。
- 对低性能设备降级为单 PV 或关闭实时更新。

完成条件：不伪造候选，评分视角和 mate 文案测试通过。

### 阶段 6：可选远程对话教练

- 升级外部网关协议，增加版本和结构化证据。
- AI 只对事实进行解释与自然语言增强。
- 保留本地完整回退、取消、缓存和预算控制。

此阶段不属于当前静态本地改造的完成前提。

## 16. 测试矩阵

### 单元测试

- UCI：合法/非法 info、单 PV、MultiPV、cp、mate、bounds、PV、bestmove、ponder。
- 评分：黑白行走方统一为白方视角。
- 搜索：节流、超时、取消、迟到消息、连续搜索。
- 局面事实：吃子、将军、易位、发展、中心、开线、攻击、保护、躲避攻击。
- 消息 reducer：sequence、更新 streaming 消息、完成、取消、裁剪。
- 时间线：undo、redo、重新分支后的消息可见性。
- 建议：三级提示复用、合法性、采用与不同走法。
- 存储：v1→v2、损坏数据、quota 重试、300 条裁剪。
- i18n：三语 key 一致、结构化消息重渲染、生成文本保留原 locale。

### Playwright

1. 玩家落子后立即出现玩家消息。
2. 搜索期间出现一个对手分析消息且不会刷屏。
3. 最终对手消息、bestmove 和棋盘落子一致。
4. Stockfish 模式显示真实分析；启蒙模式不伪造分析。
5. local/disabled 教练切换符合预期并持久化。
6. “我该怎么办”形成玩家问题和教练回答。
7. hint 1/2/3 来自同一建议。
8. 刷新恢复已完成对话。
9. 悔棋、取消悔棋恢复正确消息。
10. 历史节点重新走棋后旧分支消息消失。
11. 搜索中重开或悔棋，迟到 bestmove 不落子。
12. 切换语言后新消息使用新语言，棋局不丢失。
13. Stockfish Worker 加载失败后启蒙引擎和对话仍可用。
14. GitHub Pages `/ChessClass` 下 Worker、WASM、路由和对话全部可用。

## 17. 全局验收标准

- 右侧成为按时间顺序追加的对话，不再每回合覆盖上一张报告。
- 三角色名称简洁且业务值语言无关。
- 对话不展示或暗示隐藏思维链。
- 玩家、对手文字和棋盘事实一致。
- 候选和 PV 只来自 Stockfish 实际输出。
- 启蒙引擎没有分析数据时明确降级。
- 教练关闭后玩家与对手对话正常。
- 固定万能原因模板被移除。
- 教练事实可由 chess.js、FEN 差异或引擎输出验证；推测标明不确定性。
- 对话与现有悔棋/取消悔棋/重新分支语义一致。
- 旧存档安全迁移，不丢失身份、棋局和进度。
- 三语完整，键盘和读屏基本可用。
- 默认不联网，不要求 API Key 或 `/api/coach`。
- lint、typecheck、单元测试、普通静态构建、静态 Playwright、Pages 构建与 Pages Playwright 全部通过。

## 18. 当前不做

- 自由文本输入框和无限开放聊天。
- 在浏览器保存个人 OpenAI API Key。
- 声称展示 Stockfish 的真实内心推理。
- 强制启用 MultiPV=3。
- 完整 Stockfish 100 MB 版本。
- 云同步、账号系统、跨设备消息记录。
- 用远程 AI 决定合法性或直接控制棋盘。

## 19. 为未来人人对战预留

当前仍只实现人机模式，但本次重构不能把“黑方”“对手”和“Stockfish”永久绑定。未来至少可能出现：

- 同一设备本地双人。
- 在线邀请好友对战。
- 玩家执黑、随机执色或交换座位。
- 人人对局中保留可选的旁观教练和赛后复盘。

### 19.1 棋局模式与参与者

领域模型预留稳定类型：

```ts
export type GameMode = "human_vs_engine" | "local_human_vs_human" | "online_human_vs_human";
export type ParticipantKind = "local_human" | "remote_human" | "engine";

export interface GameParticipant {
  id: string;
  kind: ParticipantKind;
  color: "white" | "black";
  displayName: string;
  engineId?: "stockfish" | "starter";
}
```

“我 / 对手 / 教练”是相对当前观看者的 UI 角色，不等同于固定颜色：

- `player` 表示当前本地观看者。
- `opponent` 表示另一位棋局参与者，可能是引擎、本地第二位玩家或远程玩家。
- `coach` 是不占棋盘座位的观察者。
- 棋子颜色只放在 move 或 participant 中，不从 conversation role 推断。

### 19.2 走棋来源抽象

棋局控制器不能永久写成“白方玩家走完后调用 Stockfish”。后续应逐步抽象：

```ts
export interface MoveSource {
  kind: ParticipantKind;
  requestMove(context: TurnContext, signal: AbortSignal): Promise<MoveIntent>;
}
```

人机模式由 UI 输入和 EngineMoveSource 组成；本地双人由两个 UI seat 组成；在线双人未来由 RemoteMoveSource 接收经过服务端验证的走法。

本阶段不必完整实现 MoveSource，但新增对话和控制器 API 时要显式传递 participant/color/source，不能用 `if white = human, black = engine` 作为业务事实。

### 19.3 对话兼容

- `opponent_analysis` 和 `engineAnalysis` 仅在人机模式出现。
- 人人模式下，对手消息只显示实际走法和明确发送的聊天内容，不能生成“正在比较候选着法”。
- 教练消息仍可在本地双人中启用；在线正式对局是否允许实时提示必须由房间规则决定，默认关闭以避免作弊。
- 赛后可以对双方开放同一套 Stockfish 复盘，但分析结果应标记为“赛后分析”。
- 消息 metadata 预留 `participantId` 和 `source: "user_input" | "engine" | "remote" | "coach"`。

### 19.4 时间线与网络边界

- 当前线性时间线可以复用于本地双人。
- 在线人人模式不能直接沿用单机任意悔棋：悔棋需要双方请求/同意，并由服务端产生权威局面版本。
- 未来在线模式必须由服务端验证走法、回合、身份和版本；客户端 chess.js 只能做即时预检查。
- 对话消息、棋局事件和传输状态应分层，不能把 WebSocket 消息直接存成领域消息。
- 网络重连、乱序、重复事件和对局版本号留到在线模式专项方案设计。

### 19.5 当前阶段的约束

- 不实现账号、匹配、房间、WebSocket 或服务端棋局。
- 不为未来联网牺牲当前纯静态人机模式。
- conversation message、participant 和 move 数据保持可序列化、颜色中立、来源明确。
- 新增文案避免把所有 opponent 都翻译成“电脑”；只有 participant.kind 为 engine 时显示引擎名称。

## 20. 实施前的评审问题

开始阶段 0 前只需要确认三个产品选择：

1. 教练默认开启为 `local`，是否允许玩家永久关闭？建议允许。
2. “对手”是否使用第一人称表达“我决定走……”，还是中性表达“对手选择了……”？建议第一人称以增强对话感，但引擎详情明确标记为 Stockfish 分析。
3. 历史生成文本切换语言后是否保持原语言？建议保持原语言，确定性棋步与状态消息随界面语言重译。

其余技术细节可按本方案直接实施，无需在编码过程中反复重新决策。
