const THEME_HINTS = {
  fairytale: "童话森林、柔光、低语、温暖、家庭感",
  scifi: "深空航行、冷光、电子诗意、舷窗、静默未来感",
  tang: "唐诗意境、江月、留白、水墨、远行、古意",
};

const MOOD_HINTS = {
  meadow: "daybreak forest glow",
  wind: "moving wind, airy streaks, drifting leaves",
  night: "deep night, moon glow, blue darkness",
  dream: "dream haze, surreal softness, floating light",
  cosmic: "cosmic atmosphere, star dust, cold light",
  ink: "ink wash, mist, restrained monochrome",
};

function buildWordBankPrompt(input) {
  const themeKey = input.themeKey || "fairytale";

  return {
    system:
      "You generate 6 poetic Chinese words for a snake game. Return JSON only: " +
      "{\"words\":[{\"word\":\"词\",\"magic\":false,\"mood\":null,\"association\":\"短语\",\"scene\":\"短语\",\"art\":\"短语\"}]}." +
      " word must be 1-2 Chinese chars. Keep fields concise. Avoid repeated words.",
    user: {
      theme: input.themeLabel || themeKey,
      themeHint: THEME_HINTS[themeKey] || THEME_HINTS.fairytale,
      mood: input.moodKey || "meadow",
      seed: input.seed || "",
      excludeWords: Array.isArray(input.excludeWords) ? input.excludeWords.slice(0, 20) : [],
      historyWords: Array.isArray(input.historyWords) ? input.historyWords.slice(-8) : [],
      historyLines: Array.isArray(input.historyLines) ? input.historyLines.slice(-4) : [],
    },
  };
}

function buildFragmentPrompt(input) {
  const themeKey = input.themeKey || "fairytale";

  return {
    system:
      "你是一位中文诗意写作者。返回 JSON：{\"line\":\"\",\"narration\":\"\",\"imagePrompt\":\"\"}。" +
      " line 为 18-36 字中文句子，narration 为 10-24 字短说明，imagePrompt 为适合生成插画的中文描述，无解释。",
    user: {
      theme: input.themeLabel || themeKey,
      themeHint: THEME_HINTS[themeKey] || THEME_HINTS.fairytale,
      mood: input.moodKey || "meadow",
      seed: input.seed || "",
      wordEntry: input.wordEntry || {},
      historyLines: Array.isArray(input.historyLines) ? input.historyLines.slice(-4) : [],
    },
  };
}

function buildImagePrompt(themeKey, moodKey, imagePrompt) {
  return `${imagePrompt}。主题提示：${THEME_HINTS[themeKey] || THEME_HINTS.fairytale}。氛围：${MOOD_HINTS[moodKey] || MOOD_HINTS.meadow}。电影感插画，正方形构图，无文字。`;
}

module.exports = {
  buildFragmentPrompt,
  buildImagePrompt,
  buildWordBankPrompt,
};
