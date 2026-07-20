# Codex 项目协作规范

本文件是 Codex 和其他代码代理进入仓库后的首要项目说明。开始任务前先阅读 `README.md`、`docs/CURRENT_STATE.md`、`docs/DECISIONS.md` 和相关的 `docs/features/*.md`，再以源码和测试核对文档是否过时。

## 产品原则

- 面向完全不认识国际象棋或刚入门的玩家，解释必须具体、短、可验证，不能默认玩家理解 SAN 记谱。
- 默认体验应当免费、无需注册、无需服务器，并可静态部署。
- OpenAI 或其他远程 AI 只能作为可选增强；没有配置网关时，核心下棋和基础教学必须完整可用。
- 不把 API Key、访问令牌或其他秘密写入客户端、仓库或静态构建产物。
- 对玩家意图和走法原因必须区分“棋盘事实”和“推测”，不确定时明确说明。

## 技术边界

- Node.js 版本为 24 或更高。
- Next.js 保持 `output: "export"`，默认构建产物为 `out/`。
- `npm run build:server` 为自有服务器生成根路径静态站点；`npm run build:pages` 为 GitHub Pages 生成 `/ChessClass` 站点。普通本地开发不使用前缀。
- `chess.js` 是合法走法和棋局状态的规则边界。
- Stockfish 18 Lite 单线程 WASM 是默认电脑引擎；`BeginnerOpponentEngine` 必须保留为玩家可选引擎和故障降级方案。
- Stockfish 在 Web Worker 中运行。不要把耗时计算移回 UI 主线程。
- 用户资料、棋局、教练内容、引擎选择和复盘时间线保存在 `localStorage`。修改数据结构时必须兼容已有存档。
- 当前支持 `zh-CN`、`en`、`ja`。新增或修改界面文案时同步更新三个语言文件并保持 key 一致。
- Stockfish 使用 GPLv3；发布产物必须继续包含许可证和对应源码链接。

## 开发约定

- 修改前先查看 `git status`，保留用户未提交的修改，不覆盖无关文件。
- 小改动保持范围集中；大型功能先更新或建立 `docs/features/<feature>.md`，明确目标、非目标和验收标准。
- 不手工编辑生成目录 `.next/` 和 `out/`。Stockfish 发布资源由 `npm run prepare:stockfish` 生成。
- 不提交 `out/`、`.next/`、测试报告、环境变量或日志。
- 影响产品现状、架构决策或优先级的改动，应同步更新 `CURRENT_STATE.md`、`DECISIONS.md` 或 `ROADMAP.md`。

## 验证要求

普通代码修改至少运行与风险相称的检查：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

涉及棋盘交互、localStorage、引擎、路由或 UI 时运行静态浏览器测试：

```bash
npm run test:e2e:static
```

涉及 GitHub Pages、资源地址、路由前缀或 Stockfish WASM 时使用 Pages 构建并测试：

```bash
npm run test:e2e:pages
```

交付时说明实际运行的检查和结果，不声称未执行的验证已经通过。

## Git 与发布

- 稳定分支为 `main`，GitHub Pages 只通过手动运行 `Deploy GitHub Pages` workflow 构建和部署。
- 大型功能建议使用 `feature/<name>` 分支，完成验收后再合并 `main`。
- 在线地址：`https://john04047210.github.io/ChessClass/`。
- 不强推、不改写共享历史、不提交秘密，不自动执行破坏性 Git 操作。
