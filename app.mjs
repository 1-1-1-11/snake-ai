import { createRequestId, inspectAIConfig, requestFragment, requestWordBank } from "./js/ai-client.mjs";
import { themes } from "./js/constants.mjs";
import { bindInputController } from "./js/input-controller.mjs";
import { composeCreationText, savePoster } from "./js/poster-export.mjs";
import { createRenderer } from "./js/renderer.mjs";
import {
  buildFallbackFragment,
  buildFallbackWordBank,
  createInitialRuntime,
  createPendingFragment,
  enqueueDirection,
  getTickDelay,
  normalizeWordEntry,
  placeFood,
  stepRuntime,
} from "./js/runtime.mjs";
import { persistSession, readSession } from "./js/session-store.mjs";

const renderer = createRenderer();
const seedInput = document.getElementById("seedInput");

let aiConfig = {
  available: false,
  provider: "fallback",
  textSource: "fallback",
  imageSource: "fallback",
  label: "检查 AI 状态中",
  note: "",
  imageEnabled: false,
};

let runtime = createInitialRuntime("fairytale", 0);
let uiState = {
  statusText: "准备中",
  liveLine: "系统正在准备第一批词语。",
  overlay: {
    tag: "准备开始",
    title: themes.fairytale.introTitle,
    text: themes.fairytale.introText,
    visible: true,
  },
};

let wordBankPromise = null;
let wordBankRetryCount = 0;
let loopId = null;
let renderId = null;

bootstrap();

async function bootstrap() {
  bindInputController({
    onDirection: handleDirection,
    onThemeChange: handleThemeChange,
    onSeedChange: () => persist(),
    onStart: startGame,
    onRestart: async () => {
      await prepareRound(runtime.themeKey);
      startGame();
    },
    onCopy: copyCreation,
    onSave: exportPoster,
  });

  startRenderLoop();
  aiConfig = await inspectAIConfig();

  if (!restoreSession()) {
    await prepareRound("fairytale");
  } else {
    ensureWordQueue(false, runtime.roundVersion).catch(() => {});
  }

  renderAll();
}

async function prepareRound(themeKey) {
  stopLoop();
  wordBankPromise = null;
  wordBankRetryCount = 0;
  runtime = createInitialRuntime(themeKey, runtime.roundVersion + 1);
  runtime.wordQueue.push(...buildFallbackWordBank(runtime.themeKey, 6));
  uiState.statusText = "准备中";
  uiState.liveLine = aiConfig.available ? "AI 正在准备第一批词语。" : "未配置可用 AI，自动使用本地生成。";
  uiState.overlay = {
    tag: "准备开始",
    title: themes[themeKey].introTitle,
    text: themes[themeKey].introText,
    visible: true,
  };

  renderer.applyMood(runtime.moodKey);
  renderAll();

  ensureWordQueue(true, runtime.roundVersion).catch(() => {});

  const placement = placeFood(runtime);

  if (placement.won) {
    handleWin();
    return;
  }

  runtime.food = placement.food;
  runtime.gameState = "idle";
  uiState.statusText = "等待开始";
  persist();
}

async function handleThemeChange(themeKey) {
  if (!themes[themeKey] || themeKey === runtime.themeKey) {
    return;
  }

  await prepareRound(themeKey);
}

function handleDirection(key) {
  if (runtime.gameState === "booting") {
    return;
  }

  runtime.directionQueue = enqueueDirection(runtime.directionQueue, runtime.direction, key);

  if (runtime.gameState === "idle") {
    startGame();
  }
}

function startGame() {
  if (runtime.gameState === "running" || runtime.gameState === "booting" || !runtime.food) {
    return;
  }

  runtime.gameState = "running";
  uiState.statusText = "创作中";
  uiState.overlay.visible = false;
  persist();
  renderAll();
  scheduleNextTick();
}

function step() {
  const stepped = stepRuntime(runtime);
  runtime = stepped.runtime;
  runtime.effects = runtime.effects.filter((effect) => performance.now() - effect.start < 720);

  if (stepped.result === "gameover") {
    endGame();
    return;
  }

  if (stepped.result === "ate" && stepped.consumedWord) {
    runtime.effects.push({
      x: stepped.consumedWord.x * 32 + 16,
      y: stepped.consumedWord.y * 32 + 16,
      word: stepped.consumedWord.word,
      start: performance.now(),
    });

    consumeWord(stepped.consumedWord);

    if (runtime.wordQueue.length < 3) {
      ensureWordQueue(false, runtime.roundVersion).catch(() => {});
    }

    if (runtime.wordQueue.length === 0) {
      runtime.wordQueue.push(...buildFallbackWordBank(runtime.themeKey, 4));
    }

    const placement = placeFood(runtime);

    if (placement.won) {
      handleWin();
      return;
    }

    runtime.food = placement.food;
  }

  if (runtime.gameState === "running") {
    scheduleNextTick();
  }

  renderAll();
  persist();
}

function consumeWord(wordEntry) {
  if (wordEntry.magic && wordEntry.mood) {
    runtime.moodKey = wordEntry.mood;
    renderer.applyMood(runtime.moodKey);
  }

  renderer.triggerWordChip();

  const pendingFragment = createPendingFragment(wordEntry, aiConfig.available ? aiConfig.textSource : "fallback");
  runtime.fragments.unshift(pendingFragment);
  uiState.liveLine = wordEntry.magic
    ? `魔法词“${wordEntry.word}”已触发，场景正在改写。`
    : aiConfig.imageEnabled
      ? `AI 正在围绕“${wordEntry.word}”写诗并作画。`
      : `AI 正在围绕“${wordEntry.word}”写诗，图像将保持占位。`;

  renderAll();
  persist();
  hydrateFragment(pendingFragment, wordEntry, runtime.roundVersion).catch(() => {});
}

async function hydrateFragment(fragment, wordEntry, version) {
  const historyLines = runtime.fragments
    .filter((item) => item.id !== fragment.id && item.status === "ready")
    .map((item) => item.line)
    .slice(0, 4);

  let result;

  try {
    if (!aiConfig.available || location.protocol === "file:") {
      throw new Error("AI disabled");
    }

    result = await requestFragment({
      requestId: createRequestId("fg"),
      roundVersion: version,
      themeKey: runtime.themeKey,
      themeLabel: themes[runtime.themeKey].label,
      moodKey: runtime.moodKey,
      seed: seedInput.value.trim(),
      wordEntry,
      historyLines,
    });
  } catch (error) {
    result = buildFallbackFragment(runtime.themeKey, wordEntry);
    result.error = error instanceof Error ? error.message : "Fragment request failed";
    result.textSource = "fallback";
    result.imageSource = "fallback";
  }

  if (version !== runtime.roundVersion) {
    return;
  }

  const target = runtime.fragments.find((item) => item.id === fragment.id);

  if (!target) {
    return;
  }

  target.status = "ready";
  target.line = result.line;
  target.narration = result.narration;
  target.imageDataUrl = result.imageDataUrl || "";
  target.imageError = result.imageError || "";
  target.textSource = result.textSource || "fallback";
  target.imageSource = result.imageSource || "fallback";
  target.error = result.error || "";

  if (runtime.fragments[0]?.id === target.id) {
    uiState.liveLine = target.error ? `AI 请求失败，已回退本地模式。${target.error}` : target.narration;
  }

  renderAll();
  persist();
}

async function ensureWordQueue(force = false, version = runtime.roundVersion) {
  if (!force && runtime.wordQueue.length >= 4) {
    return;
  }

  if (wordBankPromise) {
    return wordBankPromise;
  }

  if (wordBankRetryCount >= 3) {
    return;
  }

  const excluded = new Set([
    ...runtime.wordQueue.map((item) => item.word),
    ...runtime.fragments.map((fragment) => fragment.word),
    runtime.food?.word,
  ]);

  wordBankPromise = (async () => {
    try {
      if (!aiConfig.available || location.protocol === "file:") {
        throw new Error("AI disabled");
      }

      const data = await requestWordBank({
        requestId: createRequestId("wb"),
        roundVersion: version,
        themeKey: runtime.themeKey,
        themeLabel: themes[runtime.themeKey].label,
        moodKey: runtime.moodKey,
        seed: seedInput.value.trim(),
        excludeWords: [...excluded].filter(Boolean),
        historyWords: runtime.fragments.map((fragment) => fragment.word).slice(-8),
        historyLines: runtime.fragments.filter((fragment) => fragment.status === "ready").map((fragment) => fragment.line).slice(-4),
      });

      if (version !== runtime.roundVersion) {
        return;
      }

      const words = (Array.isArray(data.words) ? data.words : []).map(normalizeWordEntry).filter(Boolean);
      runtime.wordQueue.push(...words.filter((entry) => !excluded.has(entry.word)));

      if (runtime.wordQueue.length < 4 && wordBankRetryCount < 2) {
        wordBankRetryCount += 1;
        wordBankPromise = null;
        await ensureWordQueue(false, version);
      }
    } catch (error) {
      if (version !== runtime.roundVersion) {
        return;
      }

      runtime.wordQueue.push(...buildFallbackWordBank(runtime.themeKey, 6));
      uiState.liveLine = `AI 词库请求失败，已回退本地生成。${error instanceof Error ? error.message : String(error)}`;
    } finally {
      if (version === runtime.roundVersion) {
        wordBankPromise = null;
      }
      renderAll();
      persist();
    }
  })();

  return wordBankPromise;
}

function restoreSession() {
  const saved = readSession();

  if (!saved) {
    return false;
  }

  runtime = {
    ...runtime,
    themeKey: saved.themeKey,
    moodKey: saved.moodKey,
    snake: saved.snake,
    direction: saved.direction,
    directionQueue: saved.directionQueue,
    food: saved.food,
    score: saved.score,
    wordQueue: saved.wordQueue,
    fragments: saved.fragments,
    gameState: saved.gameState === "running" ? "idle" : saved.gameState,
    roundVersion: saved.roundVersion + 1,
    effects: [],
  };

  seedInput.value = saved.seed;

  if (!runtime.food) {
    const placement = placeFood(runtime);
    runtime.food = placement.food;
  }

  uiState.statusText = runtime.gameState === "gameover" ? "上一局已结束" : "已恢复进度";
  uiState.liveLine = runtime.fragments[0]?.narration || "已恢复上一局的完整局面，按开始或方向键继续。";
  uiState.overlay = {
    tag: runtime.gameState === "gameover" ? "已恢复结算" : "已恢复进度",
    title: runtime.gameState === "gameover" ? "这一局停在这里" : "继续这一局",
    text: runtime.gameState === "gameover"
      ? "你可以复制整首诗，或者重新开始一局。"
      : "只恢复完整片段；未完成请求不会被带回本地存档。",
    visible: true,
  };

  renderer.applyMood(runtime.moodKey);
  renderAll();
  persist();
  return true;
}

function endGame() {
  stopLoop();
  runtime.gameState = "gameover";
  uiState.statusText = "游戏结束";
  uiState.overlay = {
    tag: "回合结束",
    title: "这一局停在这里",
    text: "你可以复制整首诗，或者把当前作品导出成一张海报。",
    visible: true,
  };
  renderer.triggerImpact();
  renderAll();
  persist();
}

function handleWin() {
  stopLoop();
  runtime.gameState = "gameover";
  uiState.statusText = "长卷完成";
  uiState.overlay = {
    tag: "全景完成",
    title: "你把棋盘写满了",
    text: "这一局已经形成完整长卷，适合立即导出。",
    visible: true,
  };
  renderAll();
  persist();
}

function renderAll() {
  renderer.applyMood(runtime.moodKey);
  renderer.renderThemeButtons(runtime.themeKey);
  renderer.renderHUD(runtime, aiConfig, uiState);
  renderer.renderOverlay(uiState.overlay);
  renderer.renderCurrentFragment(runtime);
  renderer.renderPoemList(runtime);
  renderer.renderGallery(runtime);
}

function persist() {
  persistSession({
    ...runtime,
    seed: seedInput.value.trim(),
  });
}

function scheduleNextTick() {
  stopLoop();
  loopId = window.setTimeout(step, getTickDelay(runtime.score));
}

function stopLoop() {
  if (loopId !== null) {
    window.clearTimeout(loopId);
    loopId = null;
  }
}

function startRenderLoop() {
  if (renderId !== null) {
    window.cancelAnimationFrame(renderId);
  }

  const frame = (now) => {
    renderer.drawScene(runtime, now);
    renderId = window.requestAnimationFrame(frame);
  };

  renderId = window.requestAnimationFrame(frame);
}

async function copyCreation() {
  const text = composeCreationText({
    runtime,
    seed: seedInput.value.trim(),
  });

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else if (!legacyCopyText(text)) {
      throw new Error("Clipboard unavailable");
    }

    uiState.liveLine = "当前长卷已经复制到剪贴板。";
  } catch (error) {
    window.prompt("浏览器阻止了剪贴板接口，请手动复制：", text);
    uiState.liveLine = "浏览器拦截了剪贴板接口，已把整首诗弹出。";
  }

  renderAll();
}

async function exportPoster() {
  await savePoster({
    runtime,
    aiConfig,
    seed: seedInput.value.trim(),
  });

  uiState.liveLine = "海报已经生成并开始下载。";
  renderAll();
}

function legacyCopyText(text) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  helper.remove();
  return copied;
}
