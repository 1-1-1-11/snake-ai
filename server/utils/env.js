const fs = require("node:fs");
const path = require("node:path");

function loadEnvFiles(rootDir, filenames = [".env.local", ".env"]) {
  filenames.forEach((filename) => loadEnvFile(rootDir, filename));
}

function loadEnvFile(rootDir, filename) {
  const filePath = path.join(rootDir, filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
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

function buildServiceConfig(env = process.env) {
  const textProvider = String(env.TEXT_PROVIDER || "zhipu").trim().toLowerCase();
  const useMiniMax = textProvider === "minimax";

  const zhipuApiKey = String(env.ZHIPU_API_KEY || "").trim();
  const minimaxApiKey = String(env.MINIMAX_API_KEY || "").trim();
  const volcImageApiKey = String(env.VOLC_IMAGE_API_KEY || "").trim();

  const textSource = useMiniMax ? "minimax" : "zhipu";
  const textEnabled = Boolean(useMiniMax ? minimaxApiKey : zhipuApiKey);
  const imageEnabled = Boolean(volcImageApiKey);

  return {
    port: Number(env.PORT || 3000),
    provider: buildCompositeProvider(textEnabled, imageEnabled, textSource),
    text: {
      provider: textSource,
      enabled: textEnabled,
      apiKey: useMiniMax ? minimaxApiKey : zhipuApiKey,
      baseUrl: String(
        useMiniMax
          ? env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic"
          : env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
      ).replace(/\/$/, ""),
      model: String(useMiniMax ? env.MINIMAX_TEXT_MODEL || "MiniMax-M2.7" : env.ZHIPU_TEXT_MODEL || "glm-4.6v").trim(),
    },
    image: {
      provider: "volcengine",
      enabled: imageEnabled,
      apiKey: volcImageApiKey,
      baseUrl: String(env.VOLC_IMAGE_BASE_URL || "https://ark.cn-beijing.volces.com").replace(/\/$/, ""),
      model: String(env.VOLC_IMAGE_MODEL || "doubao-seedream-4-5-251128").trim(),
      responseFormat: String(env.VOLC_IMAGE_RESPONSE_FORMAT || "url").trim(),
      size: String(env.VOLC_IMAGE_SIZE || "1024x1024").trim(),
      watermark: String(env.VOLC_IMAGE_WATERMARK || "true").trim().toLowerCase() !== "false",
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

module.exports = {
  buildCompositeProvider,
  buildServiceConfig,
  loadEnvFiles,
};
