# 棋路 · 国际象棋零基础 AI 陪练

一个面向完全零基础用户的网页版国际象棋陪练。用户无需注册，输入昵称即可执白棋与初学者电脑对弈；每个完整回合都会获得简短讲解、谨慎表述的意图猜测和下一步观察提示。

## 项目文档

- [当前项目状态](docs/CURRENT_STATE.md)
- [关键设计决策](docs/DECISIONS.md)
- [产品路线图](docs/ROADMAP.md)
- [局面感知型本地教练草案](docs/features/position-aware-local-coach.md)
- [右侧真人式对话教练改造方案 v3](docs/features/conversational-coach-v3.md)
- [Codex 项目协作规范](AGENTS.md)

## MVP 功能

- 完整的 `chess.js` 规则边界：合法着法、将军/将死、和棋、升变、王车易位和吃过路兵
- 支持点击和拖动、合法落点与上一步高亮、将军提示、棋盘翻转、悔棋和重新开始
- 默认使用浏览器本地的 Stockfish 18 轻量单线程 WASM，对不支持 WASM 或加载失败的设备自动降级到 `BeginnerOpponentEngine`
- 电脑对手提供小白、成长、进阶三档；成长档使用本地两层简化搜索填补启蒙规则与专业引擎之间的棋力差距
- 简体中文、英文、日文界面与三语本地教练
- 昵称、匿名 UUID、学习进度和未完成棋局保存在 `localStorage`
- 默认在浏览器内运行三语本地教练，零 API 成本且无需应用服务器
- 可选外部个人教练网关；过时请求取消和回合身份校验避免旧回复覆盖棋局
- Vitest 单元测试和 Playwright 三语核心流程

## 技术栈

Next.js App Router 静态导出、React、严格模式 TypeScript、Tailwind CSS、chess.js、Stockfish 18 Lite、Zod、Vitest 和 Playwright。棋盘是本项目内的无图片 React 网格组件，不依赖收费素材或服务。

要求 Node.js 24 或更高版本。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。自有服务器根路径构建与本地预览：

```bash
npm run build
npm run preview:server
```

`npm run build` 默认等同于 `npm run build:server`，构建产物位于 `out/`，可直接上传到 Nginx、对象存储或其他根路径静态托管服务，不需要运行 Next.js 服务端。

## GitHub Pages 部署

仓库已经包含 `.github/workflows/deploy-pages.yml`。在 GitHub Actions 手动运行 `Deploy GitHub Pages` 后，工作流会调用 `npm run build:pages`，以 `/ChessClass` 为站点路径构建、上传并发布 `out/`，网站地址为：

```text
https://john04047210.github.io/ChessClass/
```

首次使用时，在 GitHub 仓库进入 `Settings` → `Pages`，将 `Source` 设为 `GitHub Actions`。普通 push 不会部署，需要在 `Actions` 页面手动运行 `Deploy GitHub Pages`。

本地验证 GitHub Pages 子路径构建：

```bash
npm run build:pages
npm run test:e2e:pages
```

`npm run test:e2e:pages` 会先重新生成 Pages 构建；自有服务器完整测试使用 `npm run test:e2e:server`。普通本地开发仍执行 `npm run dev`，不带 `/ChessClass` 前缀。

## 自有服务器部署

`chess9527.com` 等根域名使用根路径构建：

```bash
npm ci
npm run build:server
```

把生成的 `out/` 同步到 Nginx 站点目录即可。GitHub Pages 和自有服务器共用源码，但必须使用各自的构建命令；每次构建会覆盖现有 `out/`。

可直接复制的 Nginx 配置和证书前置条件见 [`deploy/nginx/README.md`](deploy/nginx/README.md)。

## 可选教练网关

默认无需任何环境变量，浏览器直接调用 `LocalCoachService`。如以后部署自己的 AI 教练网关，可在构建前设置：

```dotenv
NEXT_PUBLIC_COACH_API_URL=https://your-gateway.example.com/coach
```

该地址会被写入静态客户端配置，因此只能填写网关 URL，不能填写 OpenAI API Key。个人网关负责安全保存自己的 Key、校验输入、控制预算和返回 `CoachResponse`。留空时产品始终使用免费的本地教练。

## 国际化

当前路由为 `/zh-CN`、`/en`、`/ja`，语言文件位于 `src/messages/`。领域模型只保存稳定的 `RuleKey` 和标准 FEN/PGN/SAN。新增语言时：复制一个 JSON 文件、保持 key 完全一致，在 `supportedLocales`、`messages` 和语言选择器中注册，并运行 `npm test`。切换语言不会改变 playerId、FEN 或 PGN，之后的讲解使用新语言；既有讲解不会自动翻译。

## 本地数据说明

资料仅保存在当前浏览器和设备的 `localStorage` 中。清除浏览器数据会丢失昵称、进度和棋局；更换设备不会同步。`playerId` 只是匿名本地标识，不是安全账号凭证。界面的“更换学习者”会二次确认后清除数据。

## 质量检查

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:server
npm run test:e2e:pages
```

Playwright 首次运行如缺少浏览器，可执行 `npx playwright install chromium`。

## 第三方许可证

项目自身使用 MIT 许可证。Stockfish 18 Lite 以独立 Web Worker 通过 UCI 协议运行，采用 GPLv3；发布文件中包含 `/stockfish/Copying.txt`。对应源码位于 [nmrugg/stockfish.js v18.0.8](https://github.com/nmrugg/stockfish.js/tree/v18.0.8)，上游为 [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)。其余依赖许可可用 `npm query ':root > *'` 和各包的 `license` 字段核查。

## 当前限制

- 没有云同步、注册、真人对战、排行榜或支付
- Stockfish 当前固定为约 1320 Elo 的最低限制强度；还没有面向玩家的难度选择器
- 本地教练重点覆盖基础规则，不进行复杂复盘或长变例
- 外部 AI 网关属于可选增强，部署者需要自行实现密钥、预算、缓存和限流

后续优先方向：增加 Stockfish 难度选择器、结构化课程与复盘，并在明确账号与隐私设计后加入可选云同步。
