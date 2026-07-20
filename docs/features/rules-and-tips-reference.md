# 规则、技巧与头像扩展说明

更新日期：2026-07-20

## 目标

- 玩家在任何棋局阶段都能打开静态规则和技巧，不依赖网络或 AI。
- 规则使用本应用自己的棋盘颜色和 Unicode 棋子，避免引入外部图片版权与静态部署依赖。
- SAN 始终配套白话动作说明，让初学者和熟悉记谱法的玩家使用同一套界面。
- 玩家、电脑和教练头像通过统一组件输出，为以后自定义头像保留一个稳定入口。

## 内容来源与边界

规则主题参考了 Chess.com 的《如何玩象棋》页面所覆盖的学习顺序，包括棋盘设置、棋子走法、特殊规则、胜负、基础战略和记谱法：

- https://www.chess.com/zh/ru-he-xia-qi

应用中的文字是针对本产品重新编写的摘要，不复制页面原文，也不使用对方的图片。实际合法走法仍以 `chess.js` 为唯一事实来源；静态规则弹窗只用于学习说明，不能参与棋局判定。

## 维护入口

- 三语规则与技巧：`src/lib/learning/reference-content.ts`
- 弹窗布局：`src/components/LearningReferenceDialog.tsx`
- 统一头像：`src/components/Avatar.tsx`
- 走法白话文：`src/lib/conversation/message-builders.ts`
- SAN 展开与推荐走法：`src/lib/coach/local-coach-service.ts`
- 网站图标：`src/app/icon.svg`

## 数据兼容

- `PlayerProfile.gender` 当前为 `male`、`female`、`undisclosed`，对应 `avatarId` 的 `male`、`female`、`neutral`。选择只在首次输入昵称时提供，不设置独立头像商店；旧档案自动迁移为“不告诉/中性头像”，不改变 playerId、棋局或进度。
- 已保存的玩家/对手走法消息在加载时根据结构化 `move` 重新生成文案，因此旧的“吃到”表述会自动修正，并能随界面语言变化。
- 新头像应增加明确 ID 和映射，不要把 Emoji、URL 或大段图片数据直接写入时间线消息。

## 回退方式

- 不满意规则或技巧内容时，只回退集中内容文件，不需要修改棋局逻辑。
- 不满意头像视觉时，只替换 `Avatar` 映射和 CSS；保留 `avatarId` 可避免破坏已有档案。
- 不满意站点图标时替换 `icon.svg`，不需要修改路由或构建配置。
