import { GRID_SIZE, STORAGE_KEY, STORAGE_VERSION, themes, moods } from "./constants.mjs";
import { isReadyFragment, normalizeWordEntry } from "./runtime.mjs";

export function readSession() {
  if (!window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (parsed.version !== STORAGE_VERSION) {
      return null;
    }

    const themeKey = themes[parsed.themeKey] ? parsed.themeKey : "fairytale";
    const moodKey = moods[parsed.moodKey] ? parsed.moodKey : themes[themeKey].baseMood;
    const snake = Array.isArray(parsed.snake) ? parsed.snake.map(normalizePosition).filter(Boolean) : [];
    const direction = normalizeDirection(parsed.direction);
    const directionQueue = Array.isArray(parsed.directionQueue)
      ? parsed.directionQueue.map(normalizeDirection).filter(Boolean).slice(0, 2)
      : [];
    const food = normalizeFood(parsed.food);
    const wordQueue = Array.isArray(parsed.wordQueue)
      ? parsed.wordQueue.map(normalizeWordEntry).filter(Boolean).slice(0, 12)
      : [];
    const fragments = Array.isArray(parsed.fragments)
      ? parsed.fragments.map(normalizeFragment).filter(Boolean).slice(0, 24)
      : [];

    if (snake.length === 0 || !direction) {
      return null;
    }

    return {
      themeKey,
      moodKey,
      seed: typeof parsed.seed === "string" ? parsed.seed.slice(0, 40) : "",
      snake,
      direction,
      directionQueue,
      food,
      score: Number.isFinite(parsed.score) ? Math.max(0, parsed.score) : 0,
      wordQueue,
      fragments,
      gameState: ["idle", "running", "gameover"].includes(parsed.gameState) ? parsed.gameState : "idle",
      roundVersion: Number.isInteger(parsed.roundVersion) ? parsed.roundVersion : 0,
    };
  } catch (error) {
    return null;
  }
}

export function persistSession(snapshot) {
  if (!window.localStorage) {
    return;
  }

  const payload = {
    version: STORAGE_VERSION,
    themeKey: snapshot.themeKey,
    moodKey: snapshot.moodKey,
    seed: snapshot.seed || "",
    snake: snapshot.snake,
    direction: snapshot.direction,
    directionQueue: snapshot.directionQueue,
    food: snapshot.food ? serializeFood(snapshot.food) : null,
    score: snapshot.score,
    gameState: snapshot.gameState,
    roundVersion: snapshot.roundVersion,
    wordQueue: snapshot.wordQueue.map((entry) => normalizeWordEntry(entry)).filter(Boolean),
    fragments: snapshot.fragments.filter(isReadyFragment).slice(0, 24).map(serializeFragment),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Storage is best-effort.
  }
}

function serializeFood(food) {
  return {
    ...normalizeWordEntry(food),
    x: food.x,
    y: food.y,
  };
}

function serializeFragment(fragment) {
  return {
    id: fragment.id,
    word: fragment.word,
    status: "ready",
    line: fragment.line,
    narration: fragment.narration,
    imageError: fragment.imageError || "",
    art: fragment.art || "",
    textSource: fragment.textSource || "fallback",
    imageSource: fragment.imageSource || "fallback",
    error: fragment.error || "",
  };
}

function normalizePosition(position) {
  if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) {
    return null;
  }

  if (position.x < 0 || position.x >= GRID_SIZE || position.y < 0 || position.y >= GRID_SIZE) {
    return null;
  }

  return { x: position.x, y: position.y };
}

function normalizeDirection(directionEntry) {
  if (!directionEntry || !Number.isInteger(directionEntry.x) || !Number.isInteger(directionEntry.y)) {
    return null;
  }

  const isAxis = Math.abs(directionEntry.x) + Math.abs(directionEntry.y) === 1;
  return isAxis ? { x: directionEntry.x, y: directionEntry.y } : null;
}

function normalizeFood(entry) {
  if (!entry) {
    return null;
  }

  const wordEntry = normalizeWordEntry(entry);
  const position = normalizePosition(entry);

  if (!wordEntry || !position) {
    return null;
  }

  return {
    ...wordEntry,
    ...position,
  };
}

function normalizeFragment(entry) {
  if (!entry || typeof entry.word !== "string" || entry.status !== "ready") {
    return null;
  }

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : `${entry.word}-${Date.now()}`,
    word: entry.word.trim().slice(0, 2),
    status: "ready",
    line: typeof entry.line === "string" && entry.line ? entry.line : `${entry.word}留在了上一局的尾声里。`,
    narration: typeof entry.narration === "string" ? entry.narration : "已从本地恢复。",
    imageDataUrl: "",
    imageError: typeof entry.imageError === "string" ? entry.imageError : "",
    art: typeof entry.art === "string" ? entry.art : "",
    textSource: typeof entry.textSource === "string" ? entry.textSource : "fallback",
    imageSource: typeof entry.imageSource === "string" ? entry.imageSource : "fallback",
    error: typeof entry.error === "string" ? entry.error : "",
  };
}
