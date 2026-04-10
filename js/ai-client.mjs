export async function inspectAIConfig() {
  if (location.protocol === "file:") {
    return {
      available: false,
      provider: "fallback",
      textSource: "fallback",
      imageSource: "fallback",
      imageEnabled: false,
      note: "请使用本地 Node 服务启动项目。",
      label: "请先启动本地服务",
    };
  }

  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const data = await response.json();

    return {
      available: Boolean(data.aiEnabled),
      provider: data.provider || "fallback",
      textSource: data.textSource || "fallback",
      imageSource: data.imageSource || "fallback",
      imageEnabled: Boolean(data.imageEnabled),
      note: data.note || "",
      label: data.label || buildAIStatusLabel(data),
    };
  } catch (error) {
    return {
      available: false,
      provider: "fallback",
      textSource: "fallback",
      imageSource: "fallback",
      imageEnabled: false,
      note: "本地服务没有启动，或端口不可达。",
      label: "服务未连接",
    };
  }
}

export async function requestWordBank(payload) {
  const response = await fetch("/api/word-bank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Word bank request failed");
  }

  return data;
}

export async function requestFragment(payload) {
  const response = await fetch("/api/generate-fragment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Fragment request failed");
  }

  return data;
}

export function createRequestId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildAIStatusLabel(data) {
  if (!data.aiEnabled) {
    return "未配置可用 AI";
  }

  if (data.provider === "hybrid") {
    return data.imageEnabled ? "GLM 文本 + 豆包图片在线" : "GLM 文本在线";
  }

  if (data.provider === "minimax") {
    return data.imageEnabled ? "MiniMax 文本 + 豆包图片在线" : "MiniMax 文本在线";
  }

  if (data.provider === "volcengine") {
    return "豆包图片在线";
  }

  return "AI 在线";
}
