# Snake AI 工程化演进方案

> 面向当前仓库的渐进式改造方案  
> 版本：v1  
> 状态：Draft

## 1. 项目简介

Snake AI 是一个将贪吃蛇玩法与 AI 文本、图像生成结合的前端原型项目。玩家在棋盘中吃到词语后，界面会逐步生成诗句和配图，并在当前作品区、长卷区、图册区中展示结果。

本方案的目标，是在保留当前可玩性的前提下，提升代码结构、接口一致性、故障兜底和可维护性，为后续扩展做好准备。

---

## 2. 当前现状

### 2.1 仓库现状

当前仓库体量较小，属于单仓原型项目，核心文件集中在根目录：

- `index.html`
- `script.js`
- `styles.css`
- `server.js`
- `.env.example`
- `package.json`

当前运行脚本：

- `npm run start`
- `npm run check`

### 2.2 页面现状

当前页面已经具备以下交互区域：

- 游戏棋盘
- 分数、状态、情绪展示
- 当前 AI 创作卡片
- 长卷列表
- 图册列表
- 复制诗歌
- 保存海报

### 2.3 架构现状

当前项目采用“前端主导 + 轻量 Node 服务”的模式：

- 前端负责游戏主循环、输入、渲染、局内状态、本地恢复
- 后端负责配置接口、词库接口、片段生成接口、静态文件服务

### 2.4 当前主要问题

1. `script.js` 职责过重，游戏逻辑、UI 渲染、AI 请求、存档逻辑耦合在一起。
2. 前后端对 `provider`、`textSource`、`imageSource`、状态字段的表达边界还不够清晰。
3. 本地恢复逻辑与片段临时状态混在一起，容易出现恢复失真。
4. AI fallback 分散，后续扩展时维护成本会继续上升。
5. 配置与密钥管理需要进一步收紧。

---

## 3. 改造目标

### 3.1 业务目标

- 保持“打开即可玩”的单人体验
- 保持当前诗句生成、图像生成、长卷和图册展示能力
- 提升异常场景下的可用性
- 为后续扩展预留清晰边界

### 3.2 工程目标

- 拆分前端大文件，明确模块职责
- 将 AI 编排和 fallback 规则统一收口到后端
- 统一接口字段和状态命名
- 修正本地持久化策略
- 建立最小测试体系
- 完成配置安全整改

---

## 4. 非目标

本期明确不做以下能力：

- WebSocket 实时通道
- 服务端权威游戏状态机
- SQLite 持久化
- guest 登录或账号系统
- 作品详情页、历史中心
- 多人房间
- 服务端图片归档

本期目标是把当前原型整理成一个结构清晰、可持续迭代的单人版本。

---

## 5. 总体设计原则

### 5.1 保留前端本地游戏循环

当前贪吃蛇的移动、碰撞、得分和渲染继续保留在前端。

这样做的原因：

- 输入响应更直接
- 调试路径更短
- 断开 AI 能力时仍可完整游玩
- 迁移成本可控

### 5.2 后端收口 AI 业务规则

以下逻辑统一移动或整理到后端：

- 词库生成
- 文本生成
- 图片生成
- fallback 词库
- fallback 文本
- provider 适配
- 错误码与返回语义

### 5.3 前端只保留展示所需状态

前端继续维护游戏运行态和 UI 展示态。AI 结果的解释权收口到后端，前端只消费结构化结果。

### 5.4 REST 继续作为主通道

本期沿用现有 HTTP 接口模式，不引入 WebSocket。这样可以降低连接管理、重连补偿、消息乱序和会话同步带来的复杂度。

---

## 6. 目标目录草案

### 6.1 前端分层

建议将前端拆分为以下模块：

```text
/public
  index.html
  styles.css
  /js
    app.js
    constants.js
    game-runtime.js
    renderer.js
    input-controller.js
    ai-client.js
    session-store.js
    ui-state.js
    poster-export.js
```

#### `app.js`

- 应用启动
- 模块装配
- 生命周期编排

#### `constants.js`

- 主题配置
- 情绪配置
- 默认参数
- 枚举定义

#### `game-runtime.js`

- 蛇的位置
- 移动方向
- 方向队列
- 碰撞判定
- 吃词逻辑
- 分数与速度变化
- `roundVersion`

#### `renderer.js`

- 棋盘渲染
- 蛇渲染
- 食物渲染
- HUD 更新
- 当前作品卡渲染
- 长卷渲染
- 图册渲染

#### `input-controller.js`

- 键盘事件
- 触屏按钮事件
- 开始 / 重开绑定
- 复制 / 导出绑定

#### `ai-client.js`

- 调用 `/api/config`
- 调用 `/api/word-bank`
- 调用 `/api/generate-fragment`
- 请求超时
- 错误处理
- `provider`、`textSource`、`imageSource` 的结果归一化

#### `session-store.js`

- `localStorage` 持久化
- 本地恢复
- 数据裁剪
- 版本兼容

#### `ui-state.js`

- overlay 状态
- `pending` 状态
- 提示文本
- 当前高亮作品

#### `poster-export.js`

- 海报导出
- DOM 转图或 canvas 导出逻辑

### 6.2 后端分层

建议将当前 `server.js` 拆分为以下结构：

```text
/server
  index.js
  /routes
    config.route.js
    word-bank.route.js
    fragment.route.js
  /services
    config.service.js
    word-bank.service.js
    fragment.service.js
    image.service.js
  /providers
    /text
      zhipu.provider.js
      minimax.provider.js
    /image
      volcengine.provider.js
  /domain
    fallback-words.js
    fallback-fragment.js
    prompt-builder.js
    normalize.js
    errors.js
  /utils
    env.js
    logger.js
    http.js
```

#### `routes`

- 解析 HTTP 请求
- 参数校验
- 统一响应

#### `services`

- 组织业务流程
- 处理 fallback
- 管理 provider 调用顺序

#### `providers`

- 第三方模型调用适配
- 统一入参
- 统一出参

#### `domain`

- 业务规则
- prompt 拼装
- fallback 数据
- 结果标准化
- 错误码定义

#### `utils`

- 环境变量读取
- 日志
- 基础请求工具

---

## 7. 状态设计

### 7.1 前端运行时状态

```ts
type GameRuntimeState = {
  themeKey: string
  moodKey: string
  snake: Position[]
  direction: Direction
  directionQueue: Direction[]
  food: WordEntry | null
  score: number
  gameState: "booting" | "idle" | "running" | "gameover"
  roundVersion: number
  wordQueue: WordEntry[]
  fragments: FragmentView[]
}
```

### 7.2 fragment 状态统一

```ts
type FragmentStatus = "pending" | "ready"
```

说明：

- `pending`：请求已发出，结果未完成
- `ready`：片段已可展示；即使图片失败，也通过 `error` 字段补充说明，而不是进入独立错误态

### 7.3 provider/source 统一策略

```ts
type Provider = "fallback" | "zhipu" | "minimax" | "volcengine" | "hybrid"
type TextSource = "fallback" | "zhipu" | "minimax"
type ImageSource = "fallback" | "volcengine"
```

说明：

- `provider` 仅用于顶层能力说明，例如当前组合能力或整体服务模式
- `textSource` 表示文本实际来源
- `imageSource` 表示图片实际来源
- 前端不得再写死新的 provider 名称

### 7.4 roundVersion 规则

- 每次开始新一局时自增
- 词库请求带 `roundVersion`
- fragment 请求带 `roundVersion`
- 收到响应时校验版本
- 版本不一致直接丢弃

---

## 8. 本地持久化策略

### 8.1 持久化范围

仅保存以下内容：

- 主题
- 情绪
- seed
- 蛇位置
- 当前食物
- 当前方向
- 输入队列
- 分数
- 局面状态
- 词队列
- 已完成 fragments

### 8.2 不持久化内容

以下内容不进入本地存档：

- `imageDataUrl`
- 临时 `pending` 状态
- 请求中的 fragment
- 请求中间态和临时提示文本
- DOM 状态
- 导出态

### 8.3 恢复策略

- 页面刷新后只恢复最后一个完整局面
- `pending` fragment 不恢复
- 恢复时重新刷新 UI
- 若存档结构版本不兼容，直接丢弃旧存档并回到初始态

---

## 9. API 设计

### 9.1 `GET /api/config`

#### 用途

返回公开能力和模型说明。

#### 响应示例

```json
{
  "ok": true,
  "provider": "hybrid",
  "textSource": "zhipu",
  "imageSource": "volcengine",
  "aiEnabled": true,
  "imageEnabled": true,
  "textModel": "glm-4.6v",
  "imageModel": "doubao-seedream-4-5-251128",
  "label": "GLM 文本 + 豆包图片在线",
  "note": ""
}
```

### 9.2 `POST /api/word-bank`

#### 用途

根据主题、seed、历史词和排除词生成下一批候选词。

#### 请求示例

```json
{
  "requestId": "wb_1744300000000",
  "roundVersion": 12,
  "themeKey": "fairytale",
  "themeLabel": "童话",
  "moodKey": "meadow",
  "seed": "风与夜色",
  "excludeWords": ["风"],
  "historyWords": ["月", "林"]
}
```

#### 响应示例

```json
{
  "ok": true,
  "provider": "hybrid",
  "textSource": "zhipu",
  "imageSource": "fallback",
  "requestId": "wb_1744300000000",
  "roundVersion": 12,
  "words": [
    {
      "word": "萤火",
      "magic": false,
      "mood": null,
      "association": "微光",
      "scene": "林间小径",
      "art": "发光的森林微景"
    }
  ]
}
```

### 9.3 `POST /api/generate-fragment`

#### 用途

根据吃到的词生成一句诗、说明文本和配图。

#### 请求示例

```json
{
  "requestId": "fg_1744300000001",
  "roundVersion": 12,
  "themeKey": "fairytale",
  "themeLabel": "童话",
  "moodKey": "night",
  "wordEntry": {
    "word": "月",
    "magic": true,
    "mood": "night",
    "art": "月下湖面"
  },
  "historyLines": ["风把星光吹进湖里"]
}
```

#### 响应示例

```json
{
  "ok": true,
  "provider": "hybrid",
  "textSource": "zhipu",
  "imageSource": "volcengine",
  "requestId": "fg_1744300000001",
  "roundVersion": 12,
  "line": "月把湖心照成一枚缓慢发亮的秘密。",
  "narration": "夜色收紧，水面开始发光。",
  "imageDataUrl": "data:image/png;base64,...",
  "imageError": "",
  "status": "ready",
  "error": ""
}
```

### 9.4 错误返回格式

```json
{
  "ok": false,
  "code": "TEXT_PROVIDER_UNAVAILABLE",
  "message": "Text generation is not configured.",
  "requestId": "fg_1744300000001"
}
```

补充约定：

- `requestId` 由客户端生成
- 服务端原样回传 `requestId`
- 前端使用 `requestId + roundVersion` 做结果归并和过期校验

---

## 10. 业务流程

### 10.1 开局流程

1. 前端加载 `/api/config`
2. 初始化主题、情绪、seed
3. 初始化棋盘与运行时状态
4. 调用 `/api/word-bank` 获取首批候选词
5. 渲染第一轮局面

### 10.2 吃词流程

1. 蛇吃到词
2. 前端立即插入一个 `pending` fragment
3. 更新分数和局面
4. 调用 `/api/generate-fragment`
5. 成功后用结果替换 `pending` 项
6. 失败则写入 fallback 内容，并在 `error` 字段记录异常信息
7. 词队列不足时补请求 `/api/word-bank`

### 10.3 刷新恢复流程

1. 页面启动时读取本地存档
2. 校验结构版本
3. 恢复完整局面和已完成 fragments
4. 重新渲染页面
5. 若恢复失败则回到新局状态

---

## 11. 目录调整建议

```text
snake-ai/
  package.json
  .env.example
  /public
    index.html
    styles.css
    /js
      app.js
      constants.js
      game-runtime.js
      renderer.js
      input-controller.js
      ai-client.js
      session-store.js
      ui-state.js
      poster-export.js
  /server
    index.js
    /routes
    /services
    /providers
    /domain
    /utils
  /tests
    /frontend
    /backend
    /e2e
```

以上为目标目录草案，不代表当前仓库已经完成该结构迁移。

---

## 12. 实施阶段

### 阶段 A：配置与安全治理

#### 目标

清理配置和命名问题。

#### 工作项

- 清理 `.env.example`
- 轮换疑似暴露的 key
- 统一 `provider`、`textSource`、`imageSource`、`status`
- 引入 `requestId`
- 抽离环境变量读取工具

#### 验收标准

- 仓库中不再出现具体密钥值
- 接口字段统一
- 前端不再硬编码 provider 名称

### 阶段 B：后端 AI 编排收口

#### 目标

把 AI 规则集中到后端。

#### 工作项

- 拆分 `server.js`
- 收口 fallback 词库
- 收口 fallback fragment
- 统一错误码
- 统一日志

#### 验收标准

- 后端具备清晰分层
- 无 AI key 也能完整运行 fallback 路径
- provider 调用与业务规则解耦

### 阶段 C：前端模块化拆分

#### 目标

降低前端单文件复杂度。

#### 工作项

- 拆出 `game-runtime.js`
- 拆出 `renderer.js`
- 拆出 `ai-client.js`
- 拆出 `session-store.js`
- 拆出 `input-controller.js`

#### 验收标准

- 主入口只保留初始化与装配
- 模块职责单一
- 当前功能无行为退化

### 阶段 D：本地恢复语义修正

#### 目标

提升恢复一致性。

#### 工作项

- `loading` 收敛为 `pending`
- `pending` 不落本地存档
- 恢复只使用完整 fragment
- 缩减存档字段
- 增加版本校验

#### 验收标准

- 刷新后不会出现半成品片段
- 长卷和图册恢复一致
- 本地存档结构清晰

### 阶段 E：测试与回归

#### 目标

建立最小可维护测试体系。

#### 测试范围

前端纯逻辑测试默认使用 `Vitest`：

- 方向输入
- 反向移动拦截
- 撞墙
- 自撞
- 吃词
- 分数增长
- tick 变化

后端接口测试默认使用 `node:test` 或 `Vitest`：

- `/api/config`
- `/api/word-bank`
- `/api/generate-fragment`
- fallback 路径
- provider 异常路径

会话恢复测试：

- 空存档启动
- 正常恢复
- `pending` 不恢复
- 存档版本不兼容处理

手工冒烟测试：

- 开始一局
- 连续吃 3 个词
- 复制诗歌
- 保存海报
- 切换主题
- 刷新恢复
- 无 key 启动

---

## 13. 风险与应对

### 风险 1：前端拆分导致回归

**应对**：先复制旧逻辑，再逐步替换；每拆一块就做冒烟测试。

### 风险 2：provider 结果不稳定

**应对**：保留 fallback，统一错误码和日志。

### 风险 3：图片生成较慢

**应对**：前端先展示 `pending`，文本与图片统一走同一接口，允许图片失败但保留文本结果。

### 风险 4：恢复逻辑持续膨胀

**应对**：严格缩减持久化范围，只保留完整局面，不持久化 `imageDataUrl` 和请求中间态。

### 风险 5：配置泄露

**应对**：立即轮换密钥，更新示例配置，检查提交历史。

---

## 14. 交付物

v1 交付内容包括：

- 重构后的目录结构
- 模块化前端代码
- 分层后的后端代码
- 统一接口文档
- 安全版 `.env.example`
- 最小测试集
- 回归检查清单
- 更新后的 README

---

## 15. 版本结论

本方案采用“渐进式工程化”路线：

- 游戏主循环继续放在前端
- AI 业务规则统一收口到后端
- 先做模块化、命名统一、恢复语义修正和测试补齐
- 后续再评估 WebSocket、SQLite 和内容平台扩展

这样改动量更可控，回归面更可控，也更贴合当前仓库阶段。
