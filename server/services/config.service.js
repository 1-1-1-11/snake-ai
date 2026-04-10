function getPublicConfig(config) {
  const note = [];

  if (!config.text.enabled) {
    note.push("Text generation is not configured.");
  }

  if (!config.image.enabled) {
    note.push("Image generation is not configured.");
  }

  return {
    ok: true,
    provider: config.provider,
    textSource: config.text.enabled ? config.text.provider : "fallback",
    imageSource: config.image.enabled ? config.image.provider : "fallback",
    aiEnabled: config.text.enabled,
    imageEnabled: config.image.enabled,
    textModel: config.text.model,
    imageModel: config.image.model,
    label: buildStatusLabel(config),
    note: note.join(" "),
  };
}

function buildStatusLabel(config) {
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

module.exports = {
  getPublicConfig,
};
