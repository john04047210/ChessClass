# 搜索收录与三语公开内容

## 目标

- 让搜索引擎无需执行棋局 JavaScript，也能直接读取产品定位、功能、规则和技巧正文。
- 以“面向零基础玩家的国际象棋陪练”为核心定位，不在现阶段把 AI 作为搜索卖点。
- 让 `zh-CN`、`en`、`ja` 拥有对应语言的标题、描述、正文、规范 URL 和互相可发现的语言版本。
- 保持纯静态导出，同时兼容自有服务器根路径和 GitHub Pages `/ChessClass` 前缀。
- 统一把 `https://chess9527.com` 作为搜索规范域名，避免 `.online`、`www` 和 GitHub Pages 形成重复页面。

## 非目标

- 不接入 Cloudflare、统计 SDK、广告或付费 SEO 服务。
- 不根据 IP 改写页面内容。
- 不把棋局、昵称或本地进度暴露给搜索引擎。
- 不承诺搜索排名或收录时间。

## 页面与抓取结构

- `/`：保留本地语言自动选择，同时在原始 HTML 中提供产品摘要和三个语言入口，作为 `x-default`。
- `/{locale}/`：棋局入口下方输出可直接抓取的三语产品正文。
- `/{locale}/rules/`：公开、静态、可索引的国际象棋规则。
- `/{locale}/tips/`：公开、静态、可索引的初学者实战技巧。
- `/robots.txt`：允许抓取并声明 sitemap。
- `/sitemap.xml`：只列出 `chess9527.com` 的规范页面。

## 元数据

每个语言页面必须具备：

- 本地化 `title` 和 `description`，不突出 AI。
- 指向 `https://chess9527.com` 对应路径的 self canonical。
- `zh-Hans`、`en`、`ja` 和 `x-default` 的 `hreflang`。
- Open Graph 与 Twitter 摘要图。
- `WebApplication` / `EducationalApplication` JSON-LD，声明免费、无需注册、浏览器运行和支持语言。

GitHub Pages 构建也指向 `chess9527.com` canonical；它是可用镜像，不与主站争夺收录。

## 多语言边界

- 三种语言的消息 key 必须一致。
- 棋盘及空格的无障碍名称必须本地化，不再固定为英文。
- 规则与技巧的公开页面和棋局内弹窗复用同一份内容，防止两套文案漂移。
- 页面语言主要由可见正文和局部 `lang` 标记表达；客户端同时同步文档根节点的语言。

## 验收标准

- 四个域名均能通过 HTTPS 校验，备用域名 301 到 `https://chess9527.com/`。
- Server 和 Pages 构建均包含 robots、sitemap、三语首页、规则页和技巧页。
- 原始 HTML 中存在各语言产品正文，不依赖 hydration。
- 三语页面输出各自标题、描述、canonical 和完整 hreflang。
- sitemap 只包含主域名绝对 URL。
- 公开规则/技巧页面能从首页和棋局入口访问。
- 既有三语棋局、localStorage、Stockfish 路径与语言切换测试继续通过。
