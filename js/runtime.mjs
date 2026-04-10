import { BASE_TICK_DELAY, DIRECTION_MAP, GRID_SIZE, themes } from "./constants.mjs";

export function createInitialRuntime(themeKey = "fairytale", roundVersion = 1) {
  return {
    themeKey,
    moodKey: themes[themeKey]?.baseMood || themes.fairytale.baseMood,
    snake: createInitialSnake(),
    direction: { x: 1, y: 0 },
    directionQueue: [],
    food: null,
    score: 0,
    gameState: "booting",
    roundVersion,
    wordQueue: [],
    fragments: [],
    effects: [],
  };
}

export function createInitialSnake() {
  return [
    { x: 6, y: 8 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
  ];
}

export function getTickDelay(score) {
  return Math.max(92, BASE_TICK_DELAY - Math.floor(score / 4) * 8);
}

export function enqueueDirection(directionQueue, currentDirection, key) {
  const nextDirection = DIRECTION_MAP[key];

  if (!nextDirection) {
    return directionQueue;
  }

  const lastDirection = directionQueue.at(-1) ?? currentDirection;
  const isOpposite = nextDirection.x === -lastDirection.x && nextDirection.y === -lastDirection.y;
  const isSame = nextDirection.x === lastDirection.x && nextDirection.y === lastDirection.y;

  if (isOpposite || isSame || directionQueue.length >= 2) {
    return directionQueue;
  }

  return [...directionQueue, nextDirection];
}

export function normalizeWordEntry(entry) {
  if (!entry || typeof entry.word !== "string") {
    return null;
  }

  const word = entry.word.trim().slice(0, 2);

  if (!word) {
    return null;
  }

  return {
    word,
    magic: Boolean(entry.magic),
    mood: entry.mood || null,
    association: String(entry.association || "余韵").trim().slice(0, 18),
    scene: String(entry.scene || "未命名场景").trim().slice(0, 18),
    art: String(entry.art || `${word}的轮廓`).trim().slice(0, 24),
  };
}

export function buildFallbackWordBank(themeKey, count = 6) {
  const pool = shuffle([...themes[themeKey].fallbackWords]);
  return pool.slice(0, count).map(normalizeWordEntry).filter(Boolean);
}

export function placeFood(runtime) {
  const occupied = new Set(runtime.snake.map((segment) => `${segment.x},${segment.y}`));
  const freeTiles = [];

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeTiles.push({ x, y });
      }
    }
  }

  if (freeTiles.length === 0) {
    return { food: null, won: true };
  }

  const slot = freeTiles[Math.floor(Math.random() * freeTiles.length)];
  const nextWord = runtime.wordQueue.shift();

  return {
    food: nextWord ? { ...slot, ...nextWord } : null,
    won: false,
  };
}

export function stepRuntime(runtime) {
  const directionQueue = [...runtime.directionQueue];
  let direction = runtime.direction;

  if (directionQueue.length > 0) {
    direction = directionQueue.shift();
  }

  const nextHead = {
    x: runtime.snake[0].x + direction.x,
    y: runtime.snake[0].y + direction.y,
  };
  const willEatFood = runtime.food && nextHead.x === runtime.food.x && nextHead.y === runtime.food.y;
  const hitWall = nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE;

  if (hitWall || hitsSnake(runtime.snake, nextHead, willEatFood)) {
    return {
      runtime: {
        ...runtime,
        direction,
        directionQueue,
      },
      result: "gameover",
      consumedWord: null,
    };
  }

  const snake = [nextHead, ...runtime.snake];

  if (!willEatFood) {
    snake.pop();
  }

  return {
    runtime: {
      ...runtime,
      snake,
      direction,
      directionQueue,
      score: willEatFood ? runtime.score + 1 : runtime.score,
    },
    result: willEatFood ? "ate" : "moved",
    consumedWord: willEatFood ? runtime.food : null,
  };
}

export function createPendingFragment(wordEntry, source) {
  return {
    id: `${wordEntry.word}-${Date.now()}`,
    word: wordEntry.word,
    status: "pending",
    line: "AI 正在围绕这个词落笔。",
    narration: `正在处理“${wordEntry.word}”…`,
    imageDataUrl: "",
    imageError: "",
    art: wordEntry.art,
    textSource: source,
    imageSource: "fallback",
    error: "",
  };
}

export function buildFallbackFragment(themeKey, wordEntry) {
  const fallback = {
    fairytale: [
      `一枚${wordEntry.word}落进${wordEntry.scene}，${wordEntry.association}在叶隙里轻轻发亮。`,
      `${wordEntry.word}经过的时候，${wordEntry.association}把整片林地叫得更近了一点。`,
    ],
    scifi: [
      `${wordEntry.word}擦过${wordEntry.scene}，${wordEntry.association}沿舱壁留下细线般的冷光。`,
      `${wordEntry.word}写入航行日志以后，${wordEntry.association}开始在真空里慢慢回响。`,
    ],
    tang: [
      `${wordEntry.word}入了${wordEntry.scene}，${wordEntry.association}便顺着江色一点点铺开。`,
      `${wordEntry.word}靠近时，${wordEntry.association}正把远山托成一笔淡墨。`,
    ],
  };

  const lines = fallback[themeKey] || fallback.fairytale;

  return {
    line: lines[Math.floor(Math.random() * lines.length)],
    narration: "本地兜底已接管本次片段生成。",
    imageDataUrl: "",
    imageError: "",
    textSource: "fallback",
    imageSource: "fallback",
    error: "",
  };
}

export function isReadyFragment(fragment) {
  return fragment && fragment.status === "ready";
}

function hitsSnake(snake, position, includeTail) {
  const collisionBody = includeTail ? snake : snake.slice(0, -1);
  return collisionBody.some((segment) => segment.x === position.x && segment.y === position.y);
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}
