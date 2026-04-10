const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("child_process");

const rootDir = __dirname;

loadEnvFile(".env.local");
loadEnvFile(".env");

const config = buildServiceConfig();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const fallbackWords = {
  fairytale: ["鹿", "灯", "羽", "湖", "钟", "桂", "岸", "星", "月", "银", "风", "夜", "梦"],
  scifi: ["舰", "轨", "码", "镜", "核", "潮", "晶", "界", "星", "月", "风", "夜", "梦"],
  tang: ["舟", "江", "月", "桥", "岸", "雁", "酒", "霜", "城", "砚", "风", "夜", "梦"],
};

const themePrompts = {
  fairytale: "童话森林、柔光、温暖、低语、回家感",
  scifi: "深空航行、冷光、电子诗意、舷窗、静默未来感",
  tang: "唐诗意境、江月、留白、水墨、行旅、古意",
};

const moodHints = {
  meadow: "daybreak forest glow",
  wind: "moving wind, airy streaks, drifting leaves",
  night: "deep night, moon glow, blue darkness",
  dream: "dream haze, surreal softness, floating light",
  cosmic: "cosmic atmosphere, star dust, cold light",
  ink: "ink wash, mist, restrained monochrome",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/config") {
      return sendJson(response, 200, buildPublicConfig());
    }

    if (request.method === "POST" && url.pathname === "/api/word-bank") {
      const body = await readJsonBody(request);

      if (!hasTextProvider()) {
        return sendJson(response, 200, {
          ok: true,
          source: "fallback",
          words: buildFallbackWordBank(body.themeKey || "fairytale", body.excludeWords || []),
        });
      }

      const words = await generateWordBank(body);
      return sendJson(response, 200, {
        ok: true,
        provider: config.provider,
        source: config.text.provider,
        words,
      });
    }

    if (request.method === "POST" && url.pathname === "/api/generate-fragment") {
      const body = await readJsonBody(request);

      if (!hasTextProvider()) {
        return sendJson(response, 503, {
          ok: false,
          error: "No text provider configured",
        });
      }

      const fragment = await generateFragment(body);
      return sendJson(response, 200, {
        ok: true,
        provider: config.provider,
        source: fragment.source,
        ...fragment,
      });
    }

    if (request.method === "GET") {
      return serveStatic(url.pathname, response);
    }

    sendJson(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(config.port, () => {
  console.log(`AI Poetry Snake is running at http://localhost:${config.port}`);
  console.log(buildStartupLine());
});

function buildServiceConfig() {
  const textProvider = String(process.env.TEXT_PROVIDER || "zhipu").trim().toLowerCase();
  const zhipuApiKey = String(process.env.ZHIPU_API_KEY || "").trim();
  const minimaxApiKey = String(process.env.MINIMAX_API_KEY || "").trim();
  const volcImageApiKey = String(process.env.VOLC_IMAGE_API_KEY || "").trim();
  const useMiniMax = textProvider === "minimax";
  const textEnabled = Boolean(useMiniMax ? minimaxApiKey : zhipuApiKey);
  const imageEnabled = Boolean(volcImageApiKey);

  return {
    port: Number(process.env.PORT || 3000),
    provider: buildCompositeProvider(textEnabled, imageEnabled, useMiniMax ? "minimax" : "zhipu"),
    text: {
      provider: useMiniMax ? "minimax" : "zhipu",
      enabled: textEnabled,
      apiKey: useMiniMax ? minimaxApiKey : zhipuApiKey,
      baseUrl: String(
        useMiniMax
          ? process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic"
          : process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
      ).replace(/\/$/, ""),
      model: String(
        useMiniMax
          ? process.env.MINIMAX_TEXT_MODEL || "MiniMax-M2.7"
          : process.env.ZHIPU_TEXT_MODEL || "glm-4.6v",
      ).trim(),
    },
    image: {
      provider: "volcengine",
      enabled: imageEnabled,
      apiKey: volcImageApiKey,
      baseUrl: String(process.env.VOLC_IMAGE_BASE_URL || "https://ark.cn-beijing.volces.com").replace(/\/$/, ""),
      model: String(process.env.VOLC_IMAGE_MODEL || "doubao-seedream-4-5-251128").trim(),
      responseFormat: String(process.env.VOLC_IMAGE_RESPONSE_FORMAT || "url").trim(),
      size: String(process.env.VOLC_IMAGE_SIZE || "2K").trim(),
      watermark: String(process.env.VOLC_IMAGE_WATERMARK || "true").trim().toLowerCase() !== "false",
    },
  };
}

function buildCompositeProvider(textEnabled, imageEnabled, textProvider) {
  if (textEnabled && imageEnabled) {
    return "hybrid";
  }

  if (textEnabled) {
    return textProvider;
  }

  if (imageEnabled) {
    return "volcengine";
  }

  return "fallback";
}

function buildPublicConfig() {
  const noteParts = [];

  if (!config.text.enabled) {
    noteParts.push("Text generation is not configured.");
  }

  if (!config.image.enabled) {
    noteParts.push("Image generation is not configured.");
  }

  return {
    ok: true,
    provider: config.provider,
    aiEnabled: config.text.enabled,
    imageEnabled: config.image.enabled,
    textModel: config.text.model,
    imageModel: config.image.model,
    label: buildStatusLabel(),
    note: noteParts.join(" "),
  };
}

function buildStatusLabel() {
  if (config.text.enabled && config.image.enabled) {
    return config.text.provider === "minimax"
      ? "MiniMax 文本 + 豆包图片在线"
      : "GLM 文本 + 豆包图片在线";
  }

  if (config.text.enabled) {
    return config.text.provider === "minimax" ? "MiniMax 文本在线" : "GLM 文本在线";
  }

  if (config.image.enabled) {
    return "豆包图片在线";
  }

  return "未配置可用 AI";
}

function hasTextProvider() {
  return config.text.enabled;
}

function buildStartupLine() {
  if (config.text.enabled && config.image.enabled) {
    return `Text enabled with ${config.text.model}; image enabled with ${config.image.model}`;
  }

  if (config.text.enabled) {
    return `Text enabled with ${config.text.model}; image generation disabled`;
  }

  if (config.image.enabled) {
    return `Image enabled with ${config.image.model}; text generation disabled`;
  }

  return "AI disabled. Using fallback mode.";
}

async function generateWordBank(input) {
  const excluded = new Set([
    ...(Array.isArray(input.excludeWords) ? input.excludeWords : []),
    ...(Array.isArray(input.wordQueue) ? input.wordQueue.map((w) => w.word) : []),
    ...(Array.isArray(input.fragments) ? input.fragments.map((f) => f.word) : []),
  ]);

  const rawWords =
    config.text.provider === "minimax"
      ? await generateWordBankWithMiniMax(input)
      : await generateWordBankWithZhipu(input);

  // 去重 + 过滤已使用词
  const deduped = [];
  const seen = new Set();
  for (const word of rawWords) {
    if (seen.has(word.word) || excluded.has(word.word)) {
      continue;
    }
    seen.add(word.word);
    deduped.push(word);
  }

  // 不足 6 个时，用 fallback 补充（排除已用词）
  const fallbackPool = (fallbackWords[input.themeKey || "fairytale"] || fallbackWords.fairytale)
    .filter((w) => !excluded.has(w) && !seen.has(w));
  const shuffledFallback = shuffle(fallbackPool);

  while (deduped.length < 6 && shuffledFallback.length > 0) {
    const w = shuffledFallback.pop();
    seen.add(w);
    deduped.push({
      word: w,
      magic: ["风", "夜", "梦"].includes(w),
      mood: w === "风" ? "wind" : w === "夜" ? "night" : w === "梦" ? "dream" : null,
      association: "余韵",
      scene: "未命名场景",
      art: `${w}的轮廓`,
    });
  }

  return deduped;
}

async function generateFragment(input) {
  // 文本和图片真正并行生成（图片不依赖文本结果，直接用主题+mood生成）
  const textPromise = (async () => {
    try {
      return config.text.provider === "minimax"
        ? await generateTextFragmentWithMiniMax(input)
        : await generateTextFragmentWithZhipu(input);
    } catch (error) {
      return generateFallbackPoem(input);
    }
  })();

  const imagePromise = generateImageWithVolcengine(
    input.themeKey,
    input.moodKey,
    input.wordEntry?.art || "诗意画面",
  );

  const [textResult, image] = await Promise.all([textPromise, imagePromise]);

  return {
    line: textResult.line,
    narration: textResult.narration,
    imagePrompt: textResult.imagePrompt,
    imageDataUrl: image.imageDataUrl,
    imageError: image.imageError,
    source: config.image.enabled ? "openai" : config.text.provider,
  };
}

async function generateWordBankWithZhipu(input) {
  const payload = buildWordBankPrompt(input);
  const data = await postJson(`${config.text.baseUrl}/chat/completions`, {
    apiKey: config.text.apiKey,
    body: {
      model: config.text.model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: payload.messages,
    },
  });

  const content = data.choices?.[0]?.message?.content || "{}";
  return parseWordBank(content);
}

async function generateWordBankWithMiniMax(input) {
  const payload = buildWordBankPrompt(input);

  // Try with increasing max_tokens to account for verbose thinking
  for (const maxTokens of [16000, 48000]) {
    const body = JSON.stringify({
      model: config.text.model,
      max_tokens: maxTokens,
      temperature: 1,
      system: payload.messages[0].content,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: payload.messages[1].content }],
        },
      ],
    });

    try {
      const raw = await curlPostJson(
        "https://47.79.2.234/anthropic/v1/messages",
        config.text.apiKey,
        body
      );

      const content = Array.isArray(raw.content) ? raw.content : [];
      const text = content
        .filter((item) => item && item.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n")
        .trim();

      if (text) {
        return parseWordBank(text);
      }
    } catch (error) {
      // If curl fails or returns error, skip to next retry
      console.error(`WordBank attempt with ${maxTokens} tokens failed:`, error.message);
    }
  }

  throw new Error("MiniMax word bank generation failed after retries.");
}

async function generateTextFragmentWithZhipu(input) {
  const payload = buildFragmentPrompt(input);
  const data = await postJson(`${config.text.baseUrl}/chat/completions`, {
    apiKey: config.text.apiKey,
    body: {
      model: config.text.model,
      temperature: 0.95,
      response_format: { type: "json_object" },
      messages: payload.messages,
    },
  });

  return parseFragmentText(data.choices?.[0]?.message?.content || "{}");
}

async function generateTextFragmentWithMiniMax(input) {
  const payload = buildFragmentPrompt(input);

  // Try with increasing max_tokens to account for verbose thinking
  for (const maxTokens of [48000, 80000, 128000]) {
    const body = JSON.stringify({
      model: config.text.model,
      max_tokens: maxTokens,
      temperature: 1,
      system: payload.messages[0].content,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: payload.messages[1].content }],
        },
      ],
    });

    try {
      const raw = await curlPostJson(
        "https://47.79.2.234/anthropic/v1/messages",
        config.text.apiKey,
        body
      );

      const content = Array.isArray(raw.content) ? raw.content : [];
      const text = content
        .filter((item) => item && item.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n")
        .trim();

      if (text) {
        return parseFragmentText(text);
      }
    } catch (error) {
      console.error(`Fragment attempt with ${maxTokens} tokens failed:`, error.message);
    }
  }

  throw new Error("MiniMax fragment generation failed after retries.");
}

function curlPostJson(url, apiKey, body) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      curl.kill();
      reject(new Error("curl request timed out"));
    }, 120000);

    const curl = spawn("curl", [
      "-s",
      "-X", "POST",
      url,
      "-H", "Content-Type: application/json",
      "-H", `x-api-key: ${apiKey}`,
      "-H", "anthropic-version: 2023-06-01",
      "-H", "Host: api.minimaxi.com",
      "--data-binary", body,
      "--insecure",
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let data = "";
    curl.stdout.on("data", (chunk) => (data += chunk));
    curl.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`curl exited with code ${code}: ${data}`));
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`curl returned invalid JSON: ${data.substring(0, 200)}`));
      }
    });
    curl.on("error", (e) => {
      clearTimeout(timeout);
      reject(new Error(`curl spawn error: ${e.message}`));
    });
  });
}

async function generateImageWithVolcengine(themeKey, moodKey, imagePrompt) {
  if (!config.image.enabled || !config.image.apiKey) {
    return {
      imageDataUrl: "",
      imageError: "Image generation is not configured.",
    };
  }

  try {
    const data = await postJson(`${config.image.baseUrl}/api/v3/images/generations`, {
      apiKey: config.image.apiKey,
      body: {
        model: config.image.model,
        prompt: buildImagePrompt(themeKey, moodKey, imagePrompt),
        sequential_image_generation: "disabled",
        response_format: config.image.responseFormat,
        size: config.image.size,
        stream: false,
        watermark: config.image.watermark,
      },
    });

    const imageAsset = extractVolcImageAsset(data);

    if (imageAsset.base64) {
      return {
        imageDataUrl: `data:image/png;base64,${imageAsset.base64}`,
        imageError: "",
      };
    }

    if (imageAsset.url) {
      const converted = await convertRemoteImageToDataUrl(imageAsset.url);

      return {
        imageDataUrl: converted || imageAsset.url,
        imageError: "",
      };
    }

    return {
      imageDataUrl: "",
      imageError: "Volcengine image endpoint returned no image data",
    };
  } catch (error) {
    return {
      imageDataUrl: "",
      imageError: error instanceof Error ? error.message : "Unknown image error",
    };
  }
}

function extractVolcImageAsset(data) {
  const item = Array.isArray(data.data) ? data.data[0] || {} : data.data || {};
  const base64 =
    item.b64_json ||
    item.image_base64 ||
    data.b64_json ||
    data.image_base64 ||
    "";
  const url =
    item.url ||
    item.image_url ||
    item.image_urls?.[0] ||
    data.url ||
    "";

  return { base64, url };
}

async function convertRemoteImageToDataUrl(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    return "";
  }
}

function buildWordBankPrompt(input) {
  const themeKey = input.themeKey || "fairytale";
  const themeLabel = input.themeLabel || themeKey;
  const userSeed = input.userSeed || "没有额外提示";
  const moodKey = input.moodKey || "meadow";
  const excludeWords = Array.isArray(input.excludeWords) ? input.excludeWords : [];
  const history = Array.isArray(input.history) ? input.history : [];

  return {
    messages: [
      {
        role: "system",
        content:
          "You generate 6 diverse poetic metaphor words for a Chinese snake game. Return JSON only: {\"words\":[{\"word\":\"KEY\",\"magic\":BOOL,\"mood\":\"null|string\",\"association\":\"TEXT\",\"scene\":\"TEXT\",\"art\":\"TEXT\"}]}. word=1-2 Chinese chars; VERY IMPORTANT: must be vivid, concrete, specific metaphors — avoid generic words like 风/夜/梦 unless truly inspired. Avoid these already-used words: " +
          excludeWords.slice(0, 20).join(", ") +
          ". max 2 magic=true (only 风/夜/梦 with mood wind/night/dream); other fields=short Chinese phrases. No markdown, no explanation.",
      },
      {
        role: "user",
        content: JSON.stringify({
          theme: themeLabel,
          themeHint: themePrompts[themeKey] || themePrompts.fairytale,
          userSeed,
          currentMood: moodKey,
          latestLines: history.slice(-4),
        }),
      },
    ],
  };
}

function buildFragmentPrompt(input) {
  const themeKey = input.themeKey || "fairytale";
  const themeLabel = input.themeLabel || themeKey;
  const userSeed = input.userSeed || "没有额外提示";
  const moodKey = input.moodKey || "meadow";
  const wordEntry = input.wordEntry || { word: "词" };
  const historyLines = Array.isArray(input.historyLines) ? input.historyLines : [];

  return {
    messages: [
      {
        role: "system",
        content:
          "你是中文诗人。返回JSON：{\"line\":\"\",\"narration\":\"\",\"imagePrompt\":\"\"}。line=22-40字中文诗；narration=12-26字；imagePrompt=正方形图的中文描述，无文字。勿解释。",
      },
      {
        role: "user",
        content: JSON.stringify({
          theme: themeLabel,
          word: wordEntry.word,
          mood: moodKey,
          assoc: wordEntry.association,
          latest: historyLines.slice(-4),
        }),
      },
    ],
  };
}

function buildImagePrompt(themeKey, moodKey, imagePrompt) {
  return `${imagePrompt}。主题提示：${themePrompts[themeKey] || themePrompts.fairytale}。氛围：${moodHints[moodKey] || moodHints.meadow}。电影感插画，正方形构图，无文字，主体清晰，光影强烈。`;
}

function parseWordBank(content) {
  const parsed = safeParseJson(content);
  const words = Array.isArray(parsed.words) ? parsed.words : [];
  const sanitized = words.map(sanitizeWord).filter(Boolean).slice(0, 6);

  if (sanitized.length === 0) {
    throw new Error("Model returned an empty word bank");
  }

  return sanitized;
}

function parseFragmentText(content) {
  const parsed = safeParseJson(content);
  const line = String(parsed.line || "").trim();
  const narration = String(parsed.narration || "").trim();
  const imagePrompt = String(parsed.imagePrompt || "").trim();

  if (!line || !narration || !imagePrompt) {
    throw new Error("Model did not return complete fragment fields");
  }

  return { line, narration, imagePrompt };
}

async function postJson(url, options) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(await readErrorBody(response));
  }

  return response.json();
}

async function readErrorBody(response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text);
    return parsed.error?.message || parsed.error?.code || parsed.message || text;
  } catch (error) {
    return text;
  }
}

function buildFallbackWordBank(themeKey, excludeWords = []) {
  const excluded = new Set(excludeWords);
  const source = fallbackWords[themeKey] || fallbackWords.fairytale;
  const pool = shuffle(source.filter((word) => !excluded.has(word)));
  const picks = pool.slice(0, 6);

  return picks.map((word) => ({
    word,
    magic: ["风", "夜", "梦"].includes(word),
    mood: word === "风" ? "wind" : word === "夜" ? "night" : word === "梦" ? "dream" : null,
    association: "余韵",
    scene: "未命名场景",
    art: `${word}的轮廓`,
  }));
}

function generateFallbackPoem(input) {
  const word = input.wordEntry?.word || "词";
  const theme = input.themeKey || "fairytale";
  const mood = input.moodKey || "meadow";

  const lines = {
    fairytale: [
      "森林深处鹿影现，晨雾轻绕月光眠",
      "童话草径星光落，精灵起舞随风去",
      "蘑菇小屋炊烟起，萤火点点照归路",
    ],
    scifi: [
      "星际光年一瞬过，数据洪流梦中过",
      "量子花园电子开，硅基蝴蝶翩翩来",
      "光速航道星尘落，记忆长廊梦中过",
    ],
    tang: [
      "月照江天一色秋，孤帆远影碧空留",
      "枫桥夜泊钟声远，渔火几点对愁眠",
      "山色空蒙雨亦奇，水光潋滟晴方好",
    ],
  };

  const narrations = {
    fairytale: [
      "森林低语，召唤着远方的旅人",
      "童话的入口，就在一念之间",
      "精灵的光芒，照亮了归家的路",
    ],
    scifi: [
      "代码的尽头，是诗意的宇宙",
      "在数据的海洋中，打捞一首诗",
      "当电子穿过神经网络，意识开始吟唱",
    ],
    tang: [
      "唐风宋韵，在此刻苏醒",
      "千年前的月光，照亮今日的诗行",
      "山水之间，诗意自生",
    ],
  };

  const imagePrompts = {
    meadow: "黎明森林，薄雾弥漫，小鹿在晨光中饮水，露珠闪烁，温暖色调，电影感构图，正方形",
    wind: "狂风草原，风吹草低，远处灯塔闪烁，孤独旅人，中国画意境，正方形",
    night: "星空夜晚，月光洒满湖面，水中倒影，天鹅游弋，梦幻氛围，正方形",
    dream: "超现实梦境，漂浮的岛屿，瀑布倒流，彩虹极光，柔和光影，正方形",
    cosmic: "深太空，星云旋涡，行星环绕，未来城市，光速飞船，科幻氛围，正方形",
    ink: "水墨山水，烟雾缭绕，孤舟蓑笠翁，留白意境，极简构图，正方形",
  };

  const themeLines = lines[theme] || lines.fairytale;
  const themeNarrations = narrations[theme] || narrations.fairytale;
  const moodPrompt = imagePrompts[mood] || imagePrompts.meadow;

  const selectedLine = themeLines[Math.floor(Math.random() * themeLines.length)];
  const selectedNarration = themeNarrations[Math.floor(Math.random() * themeNarrations.length)];

  return {
    line: selectedLine + "，" + word + "入梦来",
    narration: selectedNarration + "，" + word + "在诗行间",
    imagePrompt: moodPrompt + "，" + word + "在其中，主体清晰，光影强烈，正方形",
  };
}

function sanitizeWord(raw) {
  if (!raw || typeof raw.word !== "string") {
    return null;
  }

  const word = raw.word.trim().slice(0, 2);

  if (!word) {
    return null;
  }

  return {
    word,
    magic: ["风", "夜", "梦"].includes(word) || Boolean(raw.magic),
    mood:
      raw.mood ||
      (word === "风" ? "wind" : word === "夜" ? "night" : word === "梦" ? "dream" : null),
    association: String(raw.association || "余韵").trim().slice(0, 18),
    scene: String(raw.scene || "未命名场景").trim().slice(0, 18),
    art: String(raw.art || `${word}的轮廓`).trim().slice(0, 18),
  };
}

function safeParseJson(content) {
  const cleaned = String(content)
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(cleaned);
}

function loadEnvFile(filename) {
  const filePath = path.join(rootDir, filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function serveStatic(pathname, response) {
  const resolvedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path
    .normalize(resolvedPath)
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(response);
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}
