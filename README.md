# Snake AI

一个把贪吃蛇、中文短诗和 AI 配图拼在一起的单人原型项目。玩家在棋盘上吃到词语后，右侧会逐步生成当前片段、长卷列表和图册卡片。

## 当前结构

前端已经从单文件拆成模块：

- `index.html`
- `app.mjs`
- `js/constants.mjs`
- `js/runtime.mjs`
- `js/renderer.mjs`
- `js/ai-client.mjs`
- `js/session-store.mjs`
- `js/input-controller.mjs`
- `js/poster-export.mjs`

后端已经拆成分层目录：

- `server/index.js`
- `server/routes`
- `server/services`
- `server/providers`
- `server/domain`
- `server/utils`

兼容入口仍保留在 `server.js`，用于 `npm run start`。

## 当前能力

- 单人本地游玩贪吃蛇
- 主题切换与情绪切换
- 词库请求与 fallback 词库补位
- 片段生成与图片生成
- 长卷、图册、当前作品卡展示
- 复制诗歌与导出海报
- 本地存档恢复

## 运行

要求：

- Node.js 18+

启动：

```bash
npm run start
```

默认地址：

```text
http://localhost:3000
```

## 检查与测试

语法检查：

```bash
npm run check
```

测试：

```bash
npm test
```

当前测试覆盖：

- 后端 `GET /api/config`
- 后端 `POST /api/word-bank`
- 前端运行时方向输入
- 前端吃词加分逻辑
- 前端满盘胜利判定

## 环境变量

复制 `.env.example` 为本地 `.env` 后再填真实值：

- `PORT`
- `TEXT_PROVIDER`
- `ZHIPU_API_KEY`
- `ZHIPU_BASE_URL`
- `ZHIPU_TEXT_MODEL`
- `MINIMAX_API_KEY`
- `MINIMAX_BASE_URL`
- `MINIMAX_TEXT_MODEL`
- `VOLC_IMAGE_API_KEY`
- `VOLC_IMAGE_BASE_URL`
- `VOLC_IMAGE_MODEL`
- `VOLC_IMAGE_RESPONSE_FORMAT`
- `VOLC_IMAGE_SIZE`
- `VOLC_IMAGE_WATERMARK`

说明：

- `TEXT_PROVIDER` 只接受 `zhipu` 或 `minimax`
- 不填任何 key 时，项目仍可在 fallback 模式下运行
- 不要把真实 key 提交进仓库

## 接口约定

当前前后端统一使用这些字段：

- `provider`
- `textSource`
- `imageSource`
- `requestId`
- `roundVersion`
- `status`

其中：

- `provider` 表示整体服务模式
- `textSource` 表示文本实际来源
- `imageSource` 表示图片实际来源
- `status` 当前只使用 `pending` 和 `ready`

## 存档策略

本地存档已经按版本化处理：

- 只保存完整局面
- 只恢复 `ready` 片段
- 不保存 `pending` 片段
- 不保存 `imageDataUrl`
- 存档版本不兼容时直接丢弃

详细改造方案见 [`docs/engineering-plan.md`](/D:/Codex/demo贪吃蛇/docs/engineering-plan.md)。
