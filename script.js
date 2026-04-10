const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const root = document.documentElement;
const boardShell = document.getElementById("boardShell");
const overlay = document.getElementById("overlay");
const overlayTag = document.getElementById("overlayTag");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const aiStatusElement = document.getElementById("aiStatus");
const themeLabelElement = document.getElementById("themeLabel");
const scoreElement = document.getElementById("score");
const statusTextElement = document.getElementById("statusText");
const moodTextElement = document.getElementById("moodText");
const targetWordElement = document.getElementById("targetWord");
const liveLineElement = document.getElementById("liveLine");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const copyButton = document.getElementById("copyButton");
const saveButton = document.getElementById("saveButton");
const seedInput = document.getElementById("seedInput");
const themeButtons = Array.from(document.querySelectorAll("[data-theme]"));
const touchButtons = Array.from(document.querySelectorAll("[data-control-key]"));

const currentCard = document.getElementById("currentCard");
const currentImage = document.getElementById("currentImage");
const currentArtPlaceholder = document.getElementById("currentArtPlaceholder");
const placeholderWord = document.getElementById("placeholderWord");
const artFrame = document.getElementById("artFrame");
const fragmentMeta = document.getElementById("fragmentMeta");
const fragmentWord = document.getElementById("fragmentWord");
const fragmentLine = document.getElementById("fragmentLine");
const poemListElement = document.getElementById("poemList");
const galleryGridElement = document.getElementById("galleryGrid");

const gridSize = 16;
const tileSize = canvas.width / gridSize;
const baseTickDelay = 170;
const storageKey = "ai-poetry-snake-state-v1";

const directionMap = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const moods = {
  meadow: {
    label: "晨林",
    bgTop: "#0f1726",
    bgBottom: "#1f2f27",
    text: "#f5fff9",
    muted: "#a7c8b3",
    accent: "#a8ff8b",
    accentSoft: "rgba(168, 255, 139, 0.16)",
    accentWarm: "#ffd884",
    snake: "#72f2bd",
    snakeHead: "#dcfff0",
    boardTop: "#102016",
    boardBottom: "#24392a",
    grid: "rgba(226, 255, 236, 0.08)",
    glow: "rgba(168, 255, 139, 0.28)",
  },
  wind: {
    label: "风场",
    bgTop: "#0d1a2d",
    bgBottom: "#183449",
    text: "#eef8ff",
    muted: "#9fc5db",
    accent: "#7dd7ff",
    accentSoft: "rgba(125, 215, 255, 0.16)",
    accentWarm: "#d5f1ff",
    snake: "#91e8ff",
    snakeHead: "#e5fbff",
    boardTop: "#102035",
    boardBottom: "#22435d",
    grid: "rgba(227, 247, 255, 0.08)",
    glow: "rgba(125, 215, 255, 0.26)",
  },
  night: {
    label: "夜幕",
    bgTop: "#0c1124",
    bgBottom: "#1d2855",
    text: "#f5f5ff",
    muted: "#afb5ef",
    accent: "#9b8cff",
    accentSoft: "rgba(155, 140, 255, 0.18)",
    accentWarm: "#ddd4ff",
    snake: "#86a1ff",
    snakeHead: "#dde4ff",
    boardTop: "#121936",
    boardBottom: "#2d3970",
    grid: "rgba(232, 234, 255, 0.08)",
    glow: "rgba(155, 140, 255, 0.3)",
  },
  dream: {
    label: "梦境",
    bgTop: "#221227",
    bgBottom: "#50315c",
    text: "#fff6fd",
    muted: "#ddbfdd",
    accent: "#ff90cc",
    accentSoft: "rgba(255, 144, 204, 0.18)",
    accentWarm: "#ffd7ee",
    snake: "#ffb1d8",
    snakeHead: "#fff0f7",
    boardTop: "#2d1731",
    boardBottom: "#5e3870",
    grid: "rgba(255, 236, 248, 0.08)",
    glow: "rgba(255, 144, 204, 0.3)",
  },
  cosmic: {
    label: "深空",
    bgTop: "#0b1020",
    bgBottom: "#152744",
    text: "#f1f7ff",
    muted: "#9eb7d7",
    accent: "#67dfff",
    accentSoft: "rgba(103, 223, 255, 0.18)",
    accentWarm: "#d0f7ff",
    snake: "#79f4e2",
    snakeHead: "#d8fff9",
    boardTop: "#11172f",
    boardBottom: "#1f3a5e",
    grid: "rgba(232, 244, 255, 0.08)",
    glow: "rgba(103, 223, 255, 0.3)",
  },
  ink: {
    label: "水墨",
    bgTop: "#131313",
    bgBottom: "#34373c",
    text: "#faf7f0",
    muted: "#c9c2b8",
    accent: "#c3d0e0",
    accentSoft: "rgba(195, 208, 224, 0.16)",
    accentWarm: "#f0eadf",
    snake: "#d7ddd8",
    snakeHead: "#ffffff",
    boardTop: "#1d1f22",
    boardBottom: "#44484d",
    grid: "rgba(255, 248, 239, 0.08)",
    glow: "rgba(195, 208, 224, 0.2)",
  },
};

const themes = {
  fairytale: {
    label: "童话",
    baseMood: "meadow",
    introTitle: "童话森林已经醒来",
    introText: "第一批单词会先由 AI 准备好。你只需要专心看棋盘，最新的诗和图会在右侧一张卡里出现。",
    fallbackWords: [
      { word: "鹿", association: "晨露", scene: "林间空地", art: "小鹿穿林" },
      { word: "灯", association: "琥珀光", scene: "树洞门口", art: "发光树洞" },
      { word: "羽", association: "银灰尘埃", scene: "溪面上方", art: "轻羽旋落" },
      { word: "湖", association: "倒影", scene: "雾气边缘", art: "镜湖碎光" },
      { word: "桂", association: "香气", scene: "月下小路", art: "桂影落香" },
      { word: "岸", association: "柔波", scene: "桥边夜色", art: "月岸微潮" },
      { word: "萤", association: "碎星光", scene: "草丛深处", art: "流萤点点" },
      { word: "苔", association: "微光绿", scene: "石缝边缘", art: "青苔覆石" },
      { word: "泉", association: "清凉调", scene: "岩壁裂隙", art: "山泉滴露" },
      { word: "藤", association: "攀援迹", scene: "老树枝干", art: "藤蔓缠绕" },
      { word: "瓣", association: "花碎声", scene: "落花小径", art: "花瓣飘零" },
      { word: "露", association: "晨光珠", scene: "草叶尖端", art: "露珠晶莹" },
      { word: "雾", association: "朦胧感", scene: "林间空地", art: "薄雾轻笼" },
      { word: "巢", association: "温暖窝", scene: "高枝之上", art: "鸟巢静谧" },
      { word: "蝶", association: "舞姿轻", scene: "花丛之间", art: "彩蝶翻飞" },
      { word: "焰", association: "跳动的暖", scene: "壁炉里", art: "炉火跳动" },
      { word: "樱", association: "粉白絮", scene: "溪畔小径", art: "樱花纷落" },
      { word: "蔓", association: "细绿线", scene: "篱笆之上", art: "藤蔓蔓延" },
      { word: "藓", association: "柔软绿", scene: "老树干底", art: "苔藓覆盖" },
      { word: "涛", association: "白花涌", scene: "溪流转角", art: "溪水成涛" },
      { word: "岩", association: "苍老纹", scene: "林间路旁", art: "岩石静卧" },
      { word: "榕", association: "垂须长", scene: "村口大树下", art: "古榕如盖" },
      { word: "桔", association: "暖黄光", scene: "矮树枝头", art: "金桔累累" },
      { word: "槐", association: "香甜息", scene: "庭院深处", art: "槐花如雪" },
      { word: "枫", association: "红叶舞", scene: "山坡一角", art: "枫林尽染" },
      { word: "桦", association: "白皮纹", scene: "林缘地带", art: "白桦林立" },
      { word: "桃", association: "粉盈盈", scene: "溪边小丘", art: "桃花流水" },
      { word: "杏", association: "淡黄柔", scene: "老墙根前", art: "杏花春雨" },
      { word: "梅", association: "暗香来", scene: "寒岩枝头", art: "寒梅傲雪" },
      { word: "梨", association: "素白瓣", scene: "春山谷中", art: "梨花如云" },
      { word: "榛", association: "坚果香", scene: "矮灌木丛", art: "榛果累累" },
      { word: "风", association: "树冠波纹", scene: "林顶", art: "风纹轻拂", magic: true, mood: "wind" },
      { word: "夜", association: "深蓝", scene: "树梢背后", art: "夜幕压低", magic: true, mood: "night" },
      { word: "梦", association: "柔软回声", scene: "睡着的湖面", art: "梦雾浮动", magic: true, mood: "dream" },
    ],
  },
  scifi: {
    label: "科幻",
    baseMood: "cosmic",
    introTitle: "航道已连到深空",
    introText: "AI 会把你吃到的词变成一段航行日志和一张实时生成的舷窗画面。",
    fallbackWords: [
      { word: "舱", association: "低频白噪", scene: "观景舷窗前", art: "静默舱壁" },
      { word: "轨", association: "蓝色尾迹", scene: "引力边缘", art: "轨道弧线" },
      { word: "码", association: "冷光雨", scene: "透明屏幕里", art: "代码碎雨" },
      { word: "镜", association: "反射噪点", scene: "星门内侧", art: "镜面跃迁" },
      { word: "晶", association: "冰色折射", scene: "信号塔顶", art: "结晶信标" },
      { word: "域", association: "静默边界", scene: "空域尽头", art: "边界涟漪" },
      { word: "弧", association: "引力弧光", scene: "行星环外", art: "能量弧线" },
      { word: "箔", association: "散热薄层", scene: "引擎舱壁", art: "金属箔片" },
      { word: "栅", association: "数据栅栏", scene: "隔离区边界", art: "能量栅格" },
      { word: "栈", association: "缓存堆", scene: "数据中继站", art: "信息栈塔" },
      { word: "枢", association: "控制核心", scene: "舰桥中央", art: "中枢枢纽" },
      { word: "梁", association: "结构骨架", scene: "舱室顶部", art: "横梁穿舱" },
      { word: "桩", association: "固定点", scene: "登陆平台", art: "信号桩群" },
      { word: "柱", association: "承力柱", scene: "引擎室", art: "光柱擎天" },
      { word: "槽", association: "导流槽", scene: "循环管道", art: "冷却槽纹" },
      { word: "阀", association: "流量阀", scene: "供能管道", art: "阀门矩阵" },
      { word: "舷", association: "舷窗景", scene: "走廊尽头", art: "舷窗星光" },
      { word: "舵", association: "航向控制", scene: "驾驶舱", art: "舵轮静默" },
      { word: "锚", association: "悬停点", scene: "星云边缘", art: "光锚定位" },
      { word: "缆", association: "能量缆线", scene: "对接端口", art: "光缆下垂" },
      { word: "探", association: "扫描波", scene: "前方航道", art: "探测器号" },
      { word: "棱", association: "光线棱", scene: "棱镜舱", art: "棱面折射" },
      { word: "矩", association: "力场框", scene: "防护区", art: "矩形力场" },
      { word: "阵", association: "阵列光", scene: "传感器舱", art: "天线阵列" },
      { word: "波", association: "引力波", scene: "深空远域", art: "波形扩散" },
      { word: "粒", association: "粒子束", scene: "武器舱", art: "粒子流光" },
      { word: "场", association: "磁场纹", scene: "引擎后方", art: "场力涟漪" },
      { word: "谱", association: "光谱图", scene: "分析仪器", art: "全息光谱" },
      { word: "序", association: "序列码", scene: "数据核心", art: "序列投影" },
      { word: "链", association: "链接环", scene: "机械臂端", art: "链条转动" },
      { word: "风", association: "太阳风噪", scene: "护盾之外", art: "风暴磁线", magic: true, mood: "wind" },
      { word: "夜", association: "黑场切换", scene: "全景屏幕中", art: "深夜静场", magic: true, mood: "night" },
      { word: "梦", association: "模拟残影", scene: "休眠舱里", art: "梦境回放", magic: true, mood: "dream" },
    ],
  },
  tang: {
    label: "唐诗",
    baseMood: "ink",
    introTitle: "江天正适合写诗",
    introText: "这一局的视觉更留白。词一落下，AI 会慢一点写，但会更像一段被即时续写的旧诗。",
    fallbackWords: [
      { word: "舟", association: "橹声", scene: "江心薄雾里", art: "小舟横江" },
      { word: "江", association: "沉水清光", scene: "长桥之下", art: "江纹向晚" },
      { word: "月", association: "一片白", scene: "城外空岸", art: "江月照人" },
      { word: "雁", association: "斜行字影", scene: "高空尽头", art: "孤雁横天" },
      { word: "酒", association: "暖意", scene: "船篷之中", art: "酒气入风" },
      { word: "霜", association: "寂静", scene: "瓦檐之上", art: "霜落一层" },
      { word: "柳", association: "绿丝绦", scene: "驿道两旁", art: "杨柳拂堤" },
      { word: "桃", association: "粉盈盈", scene: "城外小丘", art: "桃花含笑" },
      { word: "梅", association: "暗香疏影", scene: "寒岩老树", art: "梅妻鹤子" },
      { word: "杏", association: "红褪残", scene: "小楼东墙", art: "杏花消息" },
      { word: "梨", association: "素白妆", scene: "春深院落", art: "梨花带雨" },
      { word: "鹭", association: "一行白", scene: "水田上空", art: "白鹭齐飞" },
      { word: "鸦", association: "点墨飞", scene: "黄昏枯树", art: "昏鸦归林" },
      { word: "鹤", association: "云中姿", scene: "松林上空", art: "孤鹤盘旋" },
      { word: "猿", association: "啼声远", scene: "三峡两岸", art: "两岸猿声" },
      { word: "马", association: "春风蹄", scene: "长安道", art: "匹马萧萧" },
      { word: "牛", association: "夕阳归", scene: "水田尽头", art: "牧牛晚归" },
      { word: "犬", association: "吠声起", scene: "柴门之外", art: "犬守夜阑" },
      { word: "兔", association: "草间跳", scene: "月下荒径", art: "玉兔捣药" },
      { word: "蚕", association: "丝尽时", scene: "蚕房角落", art: "春蚕作茧" },
      { word: "蛛", association: "网结圆", scene: "檐角暗处", art: "蜘蛛补网" },
      { word: "蝉", association: "嘶暑声", scene: "高柳枝头", art: "蝉鸣古槐" },
      { word: "蝶", association: "花间舞", scene: "野径草花", art: "蝶恋花间" },
      { word: "蜂", association: "采蜜忙", scene: "篱落黄花", art: "蜜蜂穿花" },
      { word: "鸥", association: "盟沙暖", scene: "洞庭湖畔", art: "白鸥翔集" },
      { word: "鹰", association: "击长空", scene: "群山之上", art: "苍鹰盘旋" },
      { word: "燕", association: "啄春泥", scene: "寻常巷陌", art: "燕子归来" },
      { word: "雀", association: "枝上跳", scene: "衰草寒林", art: "雀鸣枯枝" },
      { word: "风", association: "帆角轻摇", scene: "江面中央", art: "风过芦花", magic: true, mood: "wind" },
      { word: "夜", association: "更沉远山", scene: "钟声之后", art: "夜色压江", magic: true, mood: "night" },
      { word: "梦", association: "未寄心事", scene: "客舍枕边", art: "梦回故里", magic: true, mood: "dream" },
    ],
  },
};

let snake = [];
let food = null;
let direction = { x: 1, y: 0 };
let directionQueue = [];
let score = 0;
let loopId = null;
let renderId = null;
let gameState = "booting";
let currentThemeKey = "fairytale";
let currentMoodKey = themes[currentThemeKey].baseMood;
let wordQueue = [];
let wordBankPromise = null;
let wordBankRetryCount = 0;
let roundVersion = 0;
let fragments = [];
let effects = [];
let aiConfig = {
  available: false,
  provider: "fallback",
  label: "本地模式",
  imageEnabled: false,
  note: "",
};

async function bootstrap() {
  bindEvents();
  startRenderLoop();
  await inspectAIConfig();

  if (!restoreSession()) {
    applyMood(currentMoodKey);
    updateThemeUI();
    await prepareRound();
    return;
  }

  ensureWordQueue(false).catch(() => {});
}

function bindEvents() {
  document.addEventListener("keydown", (event) => {
    if (event.key in directionMap) {
      event.preventDefault();
      handleInput(event.key);
    }
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.theme === currentThemeKey) {
        return;
      }

      currentThemeKey = button.dataset.theme;
      currentMoodKey = themes[currentThemeKey].baseMood;
      updateThemeUI();
      await prepareRound();
    });
  });

  touchButtons.forEach((button) => {
    const controlKey = button.dataset.controlKey;

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      if (controlKey) {
        handleInput(controlKey);
      }
    });
  });

  seedInput.addEventListener("input", () => {
    persistSession();
  });

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", async () => {
    await prepareRound();
    startGame();
  });
  copyButton.addEventListener("click", copyCreation);
  saveButton.addEventListener("click", savePoster);
}

async function inspectAIConfig() {
  if (location.protocol === "file:") {
    aiConfig = {
      available: false,
      provider: "fallback",
      label: "请用本地服务启动",
      imageEnabled: false,
      note: "file:// 模式下无法请求本地 AI 服务。",
    };
    renderAIStatus();
    return;
  }

  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const data = await response.json();

    aiConfig = {
      available: Boolean(data.aiEnabled),
      provider: data.provider || "fallback",
      imageEnabled: Boolean(data.imageEnabled),
      note: data.note || "",
      label: buildAIStatusLabel(data),
    };
  } catch (error) {
    aiConfig = {
      available: false,
      provider: "fallback",
      label: "服务未连接",
      imageEnabled: false,
      note: "本地服务没有启动，或者端口不通。",
    };
  }

  renderAIStatus();
}

function buildAIStatusLabel(data) {
  if (!data.aiEnabled) {
    return "未配置可用 AI";
  }

  if (data.provider === "minimax") {
    return data.imageEnabled ? "MiniMax 文本+图片在线" : "MiniMax 文本在线";
  }

  if (data.provider === "openai") {
    return "OpenAI 文本+图片在线";
  }

  return "AI 在线";
}

function renderAIStatus() {
  aiStatusElement.textContent = aiConfig.label;
  aiStatusElement.title = aiConfig.note || "";
}

function restoreSession() {
  const savedState = readStoredSession();

  if (!savedState) {
    return false;
  }

  roundVersion += 1;
  currentThemeKey = savedState.themeKey;
  currentMoodKey = savedState.moodKey;
  seedInput.value = savedState.seed;
  snake = savedState.snake;
  food = savedState.food;
  direction = savedState.direction;
  directionQueue = savedState.directionQueue;
  score = savedState.score;
  wordQueue = savedState.wordQueue;
  wordBankPromise = null;
  fragments = savedState.fragments;
  effects = [];
  gameState = savedState.gameState === "running" ? "idle" : savedState.gameState;

  applyMood(currentMoodKey);
  updateThemeUI();
  updateScore();

  if (!food) {
    placeFood();
  } else {
    targetWordElement.textContent = food.word;
  }

  if (savedState.gameState === "gameover") {
    setStatus(savedState.statusText || "本局已结束");
    setLiveLine(savedState.liveLine || "你可以复制诗歌，或者重新开始。");
    setOverlay(
      savedState.overlayTag || "已恢复结束画面",
      savedState.overlayTitle || "这一局停在这里",
      savedState.overlayText || "你可以复制整首诗，或者重新开始新的一局。",
      true,
    );
  } else {
    setStatus("已恢复");
    setLiveLine(savedState.liveLine || "已恢复上次进度，按开始或方向键继续。");
    setOverlay("已恢复进度", "继续这一局", "刷新后已恢复上次内容，按开始或方向键继续。", true);
  }

  renderCurrentFragment();
  renderPoemList();
  renderGallery();
  updateButtons();
  persistSession();
  return true;
}

function readStoredSession() {
  if (!window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const themeKey = themes[parsed.themeKey] ? parsed.themeKey : "fairytale";
    const moodKey = moods[parsed.moodKey] ? parsed.moodKey : themes[themeKey].baseMood;
    const snakePositions = Array.isArray(parsed.snake)
      ? parsed.snake.map(normalizeStoredPosition).filter(Boolean)
      : [];
    const nextDirection = normalizeStoredDirection(parsed.direction);
    const nextQueue = Array.isArray(parsed.directionQueue)
      ? parsed.directionQueue.map(normalizeStoredDirection).filter(Boolean).slice(0, 2)
      : [];
    const nextFood = normalizeStoredFood(parsed.food);
    const nextWordQueue = Array.isArray(parsed.wordQueue)
      ? parsed.wordQueue.map(normalizeStoredWordEntry).filter(Boolean).slice(0, 12)
      : [];
    const nextFragments = Array.isArray(parsed.fragments)
      ? parsed.fragments.map(normalizeStoredFragment).filter(Boolean).slice(0, 24)
      : [];

    if (snakePositions.length === 0 || !nextDirection) {
      return null;
    }

    return {
      themeKey,
      moodKey,
      seed: typeof parsed.seed === "string" ? parsed.seed.slice(0, 40) : "",
      snake: snakePositions,
      food: nextFood,
      direction: nextDirection,
      directionQueue: nextQueue,
      score: Number.isFinite(parsed.score) ? Math.max(0, parsed.score) : 0,
      wordQueue: nextWordQueue,
      fragments: nextFragments,
      gameState: ["idle", "running", "gameover"].includes(parsed.gameState) ? parsed.gameState : "idle",
      statusText: typeof parsed.statusText === "string" ? parsed.statusText : "",
      liveLine: typeof parsed.liveLine === "string" ? parsed.liveLine : "",
      overlayTag: typeof parsed.overlayTag === "string" ? parsed.overlayTag : "",
      overlayTitle: typeof parsed.overlayTitle === "string" ? parsed.overlayTitle : "",
      overlayText: typeof parsed.overlayText === "string" ? parsed.overlayText : "",
    };
  } catch (error) {
    return null;
  }
}

function persistSession() {
  if (!window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        themeKey: currentThemeKey,
        moodKey: currentMoodKey,
        seed: seedInput.value.trim(),
        snake,
        food: food ? serializeWordEntry(food) : null,
        direction,
        directionQueue,
        score,
        gameState,
        wordQueue: wordQueue.map(serializeWordEntry),
        fragments: fragments.map(serializeFragment).slice(0, 24),
        statusText: statusTextElement.textContent,
        liveLine: liveLineElement.textContent,
        overlayTag: overlayTag.textContent,
        overlayTitle: overlayTitle.textContent,
        overlayText: overlayText.textContent,
      }),
    );
  } catch (error) {
    // Ignore quota and storage availability failures so gameplay still works.
  }
}

function serializeWordEntry(entry) {
  if (!entry) {
    return null;
  }

  return {
    word: entry.word,
    magic: Boolean(entry.magic),
    mood: entry.mood || null,
    association: entry.association || "",
    scene: entry.scene || "",
    art: entry.art || "",
    x: Number.isFinite(entry.x) ? entry.x : undefined,
    y: Number.isFinite(entry.y) ? entry.y : undefined,
  };
}

function serializeFragment(fragment) {
  return {
    id: fragment.id,
    word: fragment.word,
    status: fragment.status === "loading" ? "ready" : fragment.status,
    line: fragment.line,
    narration: fragment.narration,
    imageError: fragment.imageError,
    art: fragment.art,
    source: fragment.source,
    error: fragment.error,
  };
}

function normalizeStoredPosition(position) {
  if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) {
    return null;
  }

  if (
    position.x < 0 ||
    position.x >= gridSize ||
    position.y < 0 ||
    position.y >= gridSize
  ) {
    return null;
  }

  return { x: position.x, y: position.y };
}

function normalizeStoredDirection(directionEntry) {
  if (
    !directionEntry ||
    !Number.isInteger(directionEntry.x) ||
    !Number.isInteger(directionEntry.y)
  ) {
    return null;
  }

  const isKnownDirection = Object.values(directionMap).some(
    (item) => item.x === directionEntry.x && item.y === directionEntry.y,
  );

  return isKnownDirection ? { x: directionEntry.x, y: directionEntry.y } : null;
}

function normalizeStoredWordEntry(entry) {
  return normalizeWordEntry(entry);
}

function normalizeStoredFood(entry) {
  if (!entry) {
    return null;
  }

  const wordEntry = normalizeWordEntry(entry);
  const position = normalizeStoredPosition(entry);

  if (!wordEntry || !position) {
    return null;
  }

  return {
    ...position,
    ...wordEntry,
  };
}

function normalizeStoredFragment(entry) {
  if (!entry || typeof entry.word !== "string") {
    return null;
  }

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : `${entry.word}-${Date.now()}`,
    word: entry.word.trim().slice(0, 2),
    status: "ready",
    line: typeof entry.line === "string" && entry.line ? entry.line : `${entry.word} 留在了上一局的尾声里。`,
    narration: typeof entry.narration === "string" ? entry.narration : "已从本地恢复。",
    imageDataUrl: "",
    imageError: typeof entry.imageError === "string" ? entry.imageError : "",
    art: typeof entry.art === "string" ? entry.art : "",
    source:
      entry.source === "openai" || entry.source === "minimax"
        ? entry.source
        : "fallback",
    error: typeof entry.error === "string" ? entry.error : "",
  };
}

function updateThemeUI() {
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === currentThemeKey);
  });

  themeLabelElement.textContent = themes[currentThemeKey].label;
}

async function prepareRound() {
  roundVersion += 1;
  wordBankRetryCount = 0;
  const version = roundVersion;

  stopLoop();
  gameState = "booting";
  snake = [
    { x: 6, y: 8 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
  ];
  direction = { x: 1, y: 0 };
  directionQueue = [];
  score = 0;
  food = null;
  wordQueue = [];
  fragments = [];
  effects = [];
  currentMoodKey = themes[currentThemeKey].baseMood;
  wordBankPromise = null;

  applyMood(currentMoodKey);
  updateScore();
  setStatus("准备中");
  setLiveLine(aiConfig.available ? "AI 正在准备第一批词语。" : "未接入 OpenAI 时，将自动退回本地生成。");
  renderCurrentFragment();
  renderPoemList();
  renderGallery();
  updateButtons();
  setOverlay("准备开始", themes[currentThemeKey].introTitle, themes[currentThemeKey].introText, true);

  // 立即用本地词库填充队列，不阻塞游戏启动
  if (wordQueue.length < 4) {
    wordQueue.push(...buildFallbackWordBank(6));
  }

  // AI 词库在后台异步生成，完成后合并到队列
  ensureWordQueue(true, version).catch(() => {});

  if (version !== roundVersion) {
    return;
  }

  placeFood();
  gameState = "idle";
  setStatus("等待开始");
  updateButtons();
  persistSession();
}

async function ensureWordQueue(force = false, version = roundVersion) {
  if (!force && wordQueue.length >= 4) {
    return;
  }

  if (wordBankPromise) {
    return wordBankPromise;
  }

  // 防止无限重试
  if (wordBankRetryCount >= 3) {
    return;
  }

  const excluded = new Set([
    ...wordQueue.map((item) => item.word),
    ...fragments.map((fragment) => fragment.word),
  ]);

  wordBankPromise = requestWordBank({
    themeKey: currentThemeKey,
    themeLabel: themes[currentThemeKey].label,
    moodKey: currentMoodKey,
    userSeed: seedInput.value.trim(),
    excludeWords: [...excluded],
    wordQueue: wordQueue,
    fragments: fragments,
    history: fragments
      .filter((fragment) => fragment.status === "ready")
      .map((fragment) => fragment.line),
  })
    .then((items) => {
      if (version !== roundVersion) {
        return;
      }

      wordQueue.push(...items);

      // 如果 AI 返回不足 4 个，自动重试一次
      if (wordQueue.length < 4 && wordBankRetryCount < 2) {
        wordBankRetryCount += 1;
        wordBankPromise = null;
        ensureWordQueue(false, version).catch(() => {});
      } else {
        persistSession();
      }
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "AI 词库请求失败";
      if (version !== roundVersion) {
        return;
      }

      wordQueue.push(...buildFallbackWordBank(6));
      setLiveLine(`AI 词库请求失败，已回退本地生成。${message}`);
      persistSession();
    })
    .finally(() => {
      if (version === roundVersion) {
        wordBankPromise = null;
      }
    });

  return wordBankPromise;
}

async function requestWordBank(payload) {
  if (!aiConfig.available || location.protocol === "file:") {
    return buildFallbackWordBank(6);
  }

  const response = await fetch("/api/word-bank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Word bank request failed"));
  }

  const data = await response.json();
  const words = Array.isArray(data.words) ? data.words : [];

  return words.map(normalizeWordEntry).filter(Boolean);
}

function buildFallbackWordBank(count) {
  const pool = shuffle([...themes[currentThemeKey].fallbackWords]);
  return pool.slice(0, count).map(normalizeWordEntry).filter(Boolean);
}

function normalizeWordEntry(entry) {
  if (!entry || typeof entry.word !== "string") {
    return null;
  }

  const word = entry.word.trim().slice(0, 2);

  if (!word) {
    return null;
  }

  return {
    word,
    magic: Boolean(entry.magic) || ["风", "夜", "梦"].includes(word),
    mood:
      entry.mood ||
      (word === "风" ? "wind" : word === "夜" ? "night" : word === "梦" ? "dream" : null),
    association: entry.association || "余韵",
    scene: entry.scene || "未命名场景",
    art: entry.art || `${word}的轮廓`,
  };
}

function placeFood() {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const freeTiles = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeTiles.push({ x, y });
      }
    }
  }

  if (freeTiles.length === 0) {
    handleWin();
    return;
  }

  if (wordQueue.length === 0) {
    wordQueue.push(...buildFallbackWordBank(4));
    ensureWordQueue(false);
  }

  const slot = freeTiles[Math.floor(Math.random() * freeTiles.length)];
  const nextWord = wordQueue.shift();
  food = { ...slot, ...nextWord };

  if (wordQueue.length < 3) {
    ensureWordQueue(false);
  }

  targetWordElement.textContent = food.word;
  persistSession();
}

function startGame() {
  if (gameState === "running" || gameState === "booting" || !food) {
    return;
  }

  gameState = "running";
  setStatus("创作中");
  setOverlay("", "", "", false);
  updateButtons();
  persistSession();
  scheduleNextTick();
}

function stopLoop() {
  if (loopId !== null) {
    window.clearTimeout(loopId);
    loopId = null;
  }
}

function scheduleNextTick() {
  stopLoop();
  loopId = window.setTimeout(step, getTickDelay());
}

function getTickDelay() {
  return Math.max(92, baseTickDelay - Math.floor(score / 4) * 8);
}

function handleInput(key) {
  const nextDirection = directionMap[key];

  if (!nextDirection || gameState === "booting") {
    return;
  }

  const lastDirection = directionQueue.at(-1) ?? direction;
  const isOpposite =
    nextDirection.x === -lastDirection.x && nextDirection.y === -lastDirection.y;
  const isSame =
    nextDirection.x === lastDirection.x && nextDirection.y === lastDirection.y;

  if (isOpposite || isSame) {
    return;
  }

  if (directionQueue.length < 2) {
    directionQueue.push(nextDirection);
  }

  if (gameState === "idle") {
    startGame();
  }
}

function step() {
  if (directionQueue.length > 0) {
    direction = directionQueue.shift();
  }

  const nextHead = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const willEatFood = food && nextHead.x === food.x && nextHead.y === food.y;
  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= gridSize ||
    nextHead.y < 0 ||
    nextHead.y >= gridSize;

  if (hitWall || hitsSnake(nextHead, willEatFood)) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (willEatFood) {
    score += 1;
    updateScore();
    spawnEatEffect(food);
    consumeWord(food);
    placeFood();
  } else {
    snake.pop();
  }

  if (gameState === "running") {
    scheduleNextTick();
  }

  persistSession();
}

function hitsSnake(position, includeTail) {
  const collisionBody = includeTail ? snake : snake.slice(0, -1);
  return collisionBody.some(
    (segment) => segment.x === position.x && segment.y === position.y,
  );
}

function consumeWord(wordEntry) {
  if (wordEntry.magic && wordEntry.mood) {
    applyMood(wordEntry.mood);
  }

  triggerWordChip();

  const pendingFragment = {
    id: `${wordEntry.word}-${Date.now()}`,
    word: wordEntry.word,
    status: "loading",
    line: "AI 正在围绕这个词落笔。",
    narration: `正在处理“${wordEntry.word}”……`,
    imageDataUrl: "",
    imageError: "",
    art: wordEntry.art,
    source: aiConfig.available ? "openai" : "fallback",
  };

  fragments.unshift(pendingFragment);
  setLiveLine(
    wordEntry.magic
      ? `魔法词“${wordEntry.word}”已触发，场景正在改写。`
      : aiConfig.imageEnabled
        ? `AI 正在围绕“${wordEntry.word}”写诗和作画。`
        : `AI 正在围绕“${wordEntry.word}”写诗，图像仍使用占位模式。`,
  );
  renderCurrentFragment();
  renderPoemList();
  renderGallery();
  updateButtons();
  persistSession();

  // Fire-and-forget: 不等待 AI 结果，主循环继续运行
  hydrateFragment(pendingFragment, wordEntry).catch(() => {});
}

async function hydrateFragment(fragment, wordEntry) {
  const historyLines = fragments
    .filter((item) => item.id !== fragment.id && item.status === "ready")
    .map((item) => item.line)
    .slice(0, 4);

  let result;

  try {
    result = await requestFragment({
      themeKey: currentThemeKey,
      themeLabel: themes[currentThemeKey].label,
      moodKey: currentMoodKey,
      userSeed: seedInput.value.trim(),
      wordEntry,
      historyLines,
    });
  } catch (error) {
    result = buildFallbackFragment(wordEntry, historyLines);
    result.error = error instanceof Error ? error.message : "AI fragment failed";
  }

  fragment.status = "ready";
  fragment.line = result.line;
  fragment.narration = result.narration;
  fragment.imageDataUrl = result.imageDataUrl || "";
  fragment.imageError = result.imageError || "";
  fragment.source = result.source || "fallback";
  fragment.error = result.error || "";

  if (fragments[0]?.id === fragment.id) {
    setLiveLine(
      fragment.error
        ? `AI 请求失败，已回退本地模式。${fragment.error}`
        : fragment.narration,
    );
  }

  renderCurrentFragment();
  renderPoemList();
  renderGallery();
  updateButtons();
  persistSession();
}

async function requestFragment(payload) {
  if (!aiConfig.available || location.protocol === "file:") {
    return buildFallbackFragment(payload.wordEntry, payload.historyLines);
  }

  const response = await fetch("/api/generate-fragment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Fragment request failed"));
  }

  const data = await response.json();
  return {
    line: data.line,
    narration: data.narration,
    imageDataUrl: data.imageDataUrl || "",
    imageError: data.imageError || "",
    source: data.source || aiConfig.provider || "openai",
  };
}

function buildFallbackFragment(wordEntry, historyLines) {
  const themeKey = currentThemeKey;
  const lines = {
    fairytale: [
      `一枚${wordEntry.word}落进${wordEntry.scene}，${wordEntry.association}就在树影里亮了一下。`,
      `${wordEntry.word}经过的时候，${wordEntry.association}把整片林地叫得更近了一点。`,
      `在${wordEntry.scene}拾到${wordEntry.word}时，童话的门缝正好缓缓打开。`,
    ],
    scifi: [
      `${wordEntry.word}掠过${wordEntry.scene}，${wordEntry.association}沿着舷窗结成一条细光。`,
      `当${wordEntry.word}被收入日志，${wordEntry.association}就在真空里慢慢显形。`,
      `${wordEntry.scene}收下${wordEntry.word}以后，整片航道都多了一层静默回声。`,
    ],
    tang: [
      `于${wordEntry.scene}得${wordEntry.word}一字，${wordEntry.association}便顺着江面慢了一拍。`,
      `${wordEntry.word}贴着${wordEntry.scene}过去，像一截未写完的古意。`,
      `拾得${wordEntry.word}时，${wordEntry.association}正把远山托成一行淡墨。`,
    ],
  };

  const narrations = {
    fairytale: `林鹿说：“${wordEntry.word}”已经写进故事。`,
    scifi: `船载 AI 已记录关键词“${wordEntry.word}”。`,
    tang: `江上旅人说：“${wordEntry.word}”可入下一句。`,
  };

  const variants = lines[themeKey];
  const line = variants[historyLines.length % variants.length];

  return {
    line,
    narration: narrations[themeKey],
    imageDataUrl: "",
    imageError: "",
    source: "fallback",
    error: "",
  };
}

function endGame() {
  stopLoop();
  gameState = "gameover";
  setStatus("游戏结束");
  triggerImpact();
  setOverlay("回合结束", "这一局停在这里", "你可以复制整首诗，或者把当前作品导出成一张海报。", true);
  updateButtons();
  persistSession();
}

function handleWin() {
  stopLoop();
  gameState = "gameover";
  setStatus("长卷完成");
  setOverlay("全景完成", "你把棋盘写满了", "这一局已经形成完整长卷，适合立刻导出。", true);
  updateButtons();
  persistSession();
}

function renderCurrentFragment() {
  const fragment = fragments[0];

  if (!fragment) {
    currentCard.dataset.state = "empty";
    fragmentMeta.textContent = "等待第一个词";
    fragmentWord.textContent = "还没落笔";
    fragmentLine.textContent = "先吃掉一个词，右侧只显示当前最新的 AI 结果，避免你的注意力被历史内容拉走。";
    artFrame.classList.remove("is-loading");
    currentImage.hidden = true;
    currentArtPlaceholder.hidden = false;
    placeholderWord.textContent = "词";
    return;
  }

  currentCard.dataset.state = fragment.status;
  fragmentMeta.textContent =
    fragment.status === "loading"
      ? "AI 正在生成"
      : fragment.error
        ? "AI 请求失败，已降级"
      : fragment.source === "openai"
        ? fragment.imageDataUrl
          ? "AI 诗句 + 图像"
          : "AI 诗句，图像缺席"
        : fragment.source === "minimax"
          ? fragment.imageDataUrl
            ? "MiniMax 诗句 + 图像"
            : "MiniMax 诗句，图像缺席"
          : "本地降级生成";
  fragmentWord.textContent = fragment.word;
  fragmentLine.textContent = fragment.line;
  placeholderWord.textContent = fragment.word;
  artFrame.classList.toggle("is-loading", fragment.status === "loading");

  if (fragment.imageDataUrl) {
    currentImage.src = fragment.imageDataUrl;
    currentImage.hidden = false;
    currentArtPlaceholder.hidden = true;
  } else {
    currentImage.hidden = true;
    currentArtPlaceholder.hidden = false;
  }
}

function renderPoemList() {
  poemListElement.innerHTML = "";

  if (fragments.length === 0) {
    poemListElement.innerHTML = '<li class="placeholder">本局的诗句会按时间顺序收在这里。</li>';
    return;
  }

  fragments.forEach((fragment) => {
    const item = document.createElement("li");
    item.className = "poem-item";
    item.innerHTML = `
      <span class="poem-word">${fragment.word}</span>
      <p>${fragment.status === "loading" ? "AI 正在围绕这个词落笔。" : fragment.line}</p>
    `;
    poemListElement.appendChild(item);
  });
}

function renderGallery() {
  galleryGridElement.innerHTML = "";

  if (fragments.length === 0) {
    galleryGridElement.innerHTML = '<div class="gallery-empty">AI 生成的图像会逐步出现在这里。</div>';
    return;
  }

  fragments.forEach((fragment) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    if (fragment.imageDataUrl) {
      card.innerHTML = `
        <img src="${fragment.imageDataUrl}" alt="${fragment.word} 的生成图像">
        <footer>
          <strong>${fragment.word}</strong>
          <span>${fragment.source === "openai" ? "图像已生成" : "本地占位"}</span>
        </footer>
      `;
    } else {
      card.innerHTML = `
        <div class="gallery-fallback">${fragment.word}</div>
        <footer>
          <strong>${fragment.word}</strong>
          <span>${fragment.status === "loading" ? "正在作画" : "暂时没有图像"}</span>
        </footer>
      `;
    }

    galleryGridElement.appendChild(card);
  });
}

function applyMood(moodKey) {
  currentMoodKey = moodKey;
  const palette = moods[moodKey];

  root.style.setProperty("--bg-top", palette.bgTop);
  root.style.setProperty("--bg-bottom", palette.bgBottom);
  root.style.setProperty("--text", palette.text);
  root.style.setProperty("--muted", palette.muted);
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-soft", palette.accentSoft);
  root.style.setProperty("--accent-warm", palette.accentWarm);
  root.style.setProperty("--snake", palette.snake);
  root.style.setProperty("--snake-head", palette.snakeHead);
  root.style.setProperty("--board-top", palette.boardTop);
  root.style.setProperty("--board-bottom", palette.boardBottom);
  root.style.setProperty("--grid", palette.grid);
  root.style.setProperty("--glow", palette.glow);
  moodTextElement.textContent = palette.label;
}

function setOverlay(tag, title, text, visible) {
  overlayTag.textContent = tag;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.toggle("hidden", !visible);
}

function triggerImpact() {
  boardShell.classList.remove("is-impact");
  void boardShell.offsetWidth;
  boardShell.classList.add("is-impact");
}

function triggerWordChip() {
  targetWordElement.classList.remove("is-pop");
  void targetWordElement.offsetWidth;
  targetWordElement.classList.add("is-pop");
}

function updateScore() {
  scoreElement.textContent = score;
}

function setStatus(text) {
  statusTextElement.textContent = text;
}

function setLiveLine(text) {
  liveLineElement.textContent = text;
}

function updateButtons() {
  startButton.disabled = gameState === "running" || gameState === "booting" || !food;
  copyButton.disabled = fragments.length === 0;
  saveButton.disabled = fragments.length === 0;
}

function composeCreationText() {
  const title = `${themes[currentThemeKey].label}·${fragments
    .slice()
    .reverse()
    .slice(-3)
    .map((fragment) => fragment.word)
    .join("") || "未命名长卷"}`;
  const body = fragments
    .slice()
    .reverse()
    .map((fragment) => fragment.line)
    .join("\n");

  return `《${title}》\n主题：${themes[currentThemeKey].label}\n情绪：${moods[currentMoodKey].label}\n分数：${score}\n\n${body || "这一局还没有生成诗句。"}\n\n开场灵感：${seedInput.value.trim() || "未填写"}`;
}

async function copyCreation() {
  const text = composeCreationText();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else if (!legacyCopyText(text)) {
      throw new Error("Clipboard unavailable");
    }

    setLiveLine("当前长卷已经复制到剪贴板。");
  } catch (error) {
    window.prompt("浏览器阻止了剪贴板，请手动复制：", text);
    setLiveLine("浏览器拦截了剪贴板接口，我已经把整首诗弹出来了。");
  }
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

async function savePoster() {
  const poster = document.createElement("canvas");
  const posterCtx = poster.getContext("2d");
  const width = 1200;
  const poemLines = fragments
    .slice()
    .reverse()
    .map((fragment) => fragment.line);
  const wrappedLines = poemLines.flatMap((line) => wrapTextByCount(line, 20));
  const artworkFragments = fragments.slice(0, 4);
  const height = Math.max(1500, 900 + wrappedLines.length * 42);
  const palette = moods[currentMoodKey];
  const loadedImages = await Promise.all(
    artworkFragments.map(async (fragment) => ({
      fragment,
      image: fragment.imageDataUrl ? await loadImage(fragment.imageDataUrl).catch(() => null) : null,
    })),
  );

  poster.width = width;
  poster.height = height;

  const background = posterCtx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, palette.bgTop);
  background.addColorStop(1, palette.bgBottom);
  posterCtx.fillStyle = background;
  posterCtx.fillRect(0, 0, width, height);

  posterCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
  drawPosterRoundRect(posterCtx, 64, 64, width - 128, height - 128, 32);
  posterCtx.fill();

  posterCtx.fillStyle = palette.text;
  posterCtx.font = '700 64px "Georgia", "SimSun", serif';
  posterCtx.fillText(themes[currentThemeKey].label, 110, 160);

  posterCtx.font = '500 28px "Segoe UI", "Microsoft YaHei", sans-serif';
  posterCtx.fillStyle = palette.muted;
  posterCtx.fillText(`分数：${score}    情绪：${palette.label}    AI：${aiConfig.available ? "在线" : "本地"}`, 110, 214);
  posterCtx.fillText(`开场灵感：${seedInput.value.trim() || "未填写"}`, 110, 258);

  loadedImages.forEach(({ fragment, image }, index) => {
    const x = 110 + (index % 2) * 430;
    const y = 320 + Math.floor(index / 2) * 250;

    drawPosterRoundRect(posterCtx, x, y, 380, 220, 28);
    posterCtx.save();
    posterCtx.clip();

    if (image) {
      posterCtx.drawImage(image, x, y, 380, 220);
    } else {
      const fallback = posterCtx.createLinearGradient(x, y, x + 380, y + 220);
      fallback.addColorStop(0, palette.accentSoft);
      fallback.addColorStop(1, "rgba(255, 255, 255, 0.12)");
      posterCtx.fillStyle = fallback;
      posterCtx.fillRect(x, y, 380, 220);
      posterCtx.fillStyle = palette.text;
      posterCtx.font = '700 42px "Segoe UI", "Microsoft YaHei", sans-serif';
      posterCtx.fillText(fragment.word, x + 160, y + 125);
    }

    posterCtx.restore();
    posterCtx.fillStyle = palette.text;
    posterCtx.font = '700 26px "Segoe UI", "Microsoft YaHei", sans-serif';
    posterCtx.fillText(fragment.word, x + 18, y + 208);
  });

  const poemStartY = 860;
  posterCtx.fillStyle = palette.text;
  posterCtx.font = '600 34px "Segoe UI", "Microsoft YaHei", sans-serif';
  posterCtx.fillText("本局生成的诗", 110, poemStartY);

  posterCtx.font = '500 28px "Segoe UI", "Microsoft YaHei", sans-serif';
  let cursorY = poemStartY + 56;

  wrappedLines.forEach((line) => {
    posterCtx.fillText(line, 110, cursorY);
    cursorY += 40;
  });

  const link = document.createElement("a");
  link.href = poster.toDataURL("image/png");
  link.download = `ai-poetry-snake-${Date.now()}.png`;
  link.click();

  setLiveLine("海报已经生成并开始下载。");
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawPosterRoundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function wrapTextByCount(text, maxLength) {
  const lines = [];
  let current = "";

  for (const char of text) {
    current += char;

    if (current.length >= maxLength) {
      lines.push(current);
      current = "";
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function readErrorMessage(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data.error || fallbackMessage;
  } catch (error) {
    return fallbackMessage;
  }
}

function startRenderLoop() {
  if (renderId !== null) {
    window.cancelAnimationFrame(renderId);
  }

  const frame = (now) => {
    drawScene(now);
    renderId = window.requestAnimationFrame(frame);
  };

  renderId = window.requestAnimationFrame(frame);
}

function drawScene(now) {
  drawBoard(now);
  drawFood(now);
  drawSnake();
  drawEffects(now);
}

function drawBoard(now) {
  const palette = moods[currentMoodKey];
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, palette.boardTop);
  gradient.addColorStop(1, palette.boardBottom);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glowX = canvas.width * (0.5 + Math.sin(now / 1700) * 0.18);
  const glowY = canvas.height * (0.3 + Math.cos(now / 2100) * 0.12);
  const glow = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, 170);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;

  for (let line = 0; line <= gridSize; line += 1) {
    const offset = line * tileSize;

    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(canvas.width, offset);
    ctx.stroke();
  }
}

function drawSnake() {
  const palette = moods[currentMoodKey];

  snake.forEach((segment, index) => {
    const x = segment.x * tileSize + 3;
    const y = segment.y * tileSize + 3;
    const size = tileSize - 6;

    ctx.fillStyle = index === 0 ? palette.snakeHead : palette.snake;
    roundRect(ctx, x, y, size, size, index === 0 ? 10 : 8);
    ctx.fill();

    if (index === 0) {
      drawSnakeFace(x, y, size, palette.text);
    }
  });
}

function drawSnakeFace(x, y, size, eyeColor) {
  ctx.fillStyle = eyeColor;

  const front = size * 0.24;
  const side = size * 0.28;
  const eyeSize = 3.5;
  let eyes;

  if (direction.x === 1) {
    eyes = [
      { x: x + size - front, y: y + side },
      { x: x + size - front, y: y + size - side },
    ];
  } else if (direction.x === -1) {
    eyes = [
      { x: x + front, y: y + side },
      { x: x + front, y: y + size - side },
    ];
  } else if (direction.y === -1) {
    eyes = [
      { x: x + side, y: y + front },
      { x: x + size - side, y: y + front },
    ];
  } else {
    eyes = [
      { x: x + side, y: y + size - front },
      { x: x + size - side, y: y + size - front },
    ];
  }

  ctx.beginPath();
  ctx.arc(eyes[0].x, eyes[0].y, eyeSize, 0, Math.PI * 2);
  ctx.arc(eyes[1].x, eyes[1].y, eyeSize, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood(now) {
  if (!food) {
    return;
  }

  const palette = moods[currentMoodKey];
  const centerX = food.x * tileSize + tileSize / 2;
  const centerY = food.y * tileSize + tileSize / 2;
  const scale = 1 + Math.sin(now / 220) * 0.06;
  const size = tileSize - 10;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = food.magic ? 24 : 16;
  ctx.fillStyle = food.magic ? palette.accentWarm : "rgba(255, 255, 255, 0.92)";
  roundRect(ctx, centerX - size / 2, centerY - size / 2, size, size, 10);
  ctx.fill();

  if (food.magic) {
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    roundRect(ctx, centerX - size / 2, centerY - size / 2, size, size, 10);
    ctx.stroke();
  }

  ctx.fillStyle = "#101010";
  ctx.font = `700 ${food.word.length > 1 ? 13 : 16}px "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(food.word, centerX, centerY + 0.5);
  ctx.restore();
}

function spawnEatEffect(wordEntry) {
  effects.push({
    x: wordEntry.x * tileSize + tileSize / 2,
    y: wordEntry.y * tileSize + tileSize / 2,
    word: wordEntry.word,
    start: performance.now(),
  });
}

function drawEffects(now) {
  effects = effects.filter((effect) => now - effect.start < 720);

  effects.forEach((effect) => {
    const progress = (now - effect.start) / 720;
    const alpha = 1 - progress;
    const radius = 14 + 44 * progress;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = '700 18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(effect.word, effect.x, effect.y - progress * 40);
    ctx.restore();
  });
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function buildAIStatusLabel(data) {
  if (data.label) {
    return data.label;
  }

  if (!data.aiEnabled) {
    return "未配置可用 AI";
  }

  if (data.provider === "hybrid") {
    return data.imageEnabled ? "GLM 文本 + 豆包图片在线" : "GLM 文本在线";
  }

  if (data.provider === "zhipu") {
    return "GLM 文本在线";
  }

  if (data.provider === "volcengine") {
    return "豆包图片在线";
  }

  if (data.provider === "minimax") {
    return data.imageEnabled ? "MiniMax 文本+图片在线" : "MiniMax 文本在线";
  }

  if (data.provider === "openai") {
    return "OpenAI 文本+图片在线";
  }

  return "AI 在线";
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (/^https?:\/\//.test(source)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

bootstrap();
