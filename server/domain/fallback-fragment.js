const FALLBACK_LINES = {
  fairytale: [
    "{word}落进{scene}时，{association}把林间的空气轻轻点亮。",
    "{word}经过的地方，{association}像一封没写完的童话信。",
    "在{scene}拾起{word}以后，整座森林都慢慢亮了一度。",
  ],
  scifi: [
    "{word}掠过{scene}时，{association}沿着舱壁拖出一线冷光。",
    "{word}写入日志以后，{association}在真空里变得更清晰了。",
    "{scene}收下{word}之后，整条航道都多了一层静默回声。",
  ],
  tang: [
    "{word}入了{scene}，{association}便顺着江色慢慢铺展开来。",
    "{scene}拾得{word}一字，像把旧时月色重新写回人间。",
    "{word}靠近时，{association}正把远山托成一笔淡墨。",
  ],
};

const FALLBACK_NARRATIONS = {
  fairytale: "森林低声说，这个词已经被写进故事。",
  scifi: "船载记录器已将这个词标记为当前星图注释。",
  tang: "江上旅人记下此字，下一句诗正从雾里靠近。",
};

const FALLBACK_IMAGE_PROMPTS = {
  meadow: "黎明森林，薄雾，露珠，暖色电影感插画，正方形构图，无文字",
  wind: "风起原野，草木倾斜，轻盈流线，正方形构图，无文字",
  night: "月色湖面，深蓝夜幕，安静发光，正方形构图，无文字",
  dream: "超现实梦境，漂浮岛屿，柔和光影，正方形构图，无文字",
  cosmic: "深空舷窗，星云，冷色科幻光效，正方形构图，无文字",
  ink: "水墨山水，留白，薄雾，克制构图，正方形构图，无文字",
};

function buildFallbackFragment(input) {
  const themeKey = input.themeKey || "fairytale";
  const wordEntry = input.wordEntry || {};
  const moodKey = input.moodKey || "meadow";
  const lines = FALLBACK_LINES[themeKey] || FALLBACK_LINES.fairytale;
  const lineTemplate = lines[Math.floor(Math.random() * lines.length)];

  return {
    line: interpolate(lineTemplate, {
      word: wordEntry.word || "词",
      association: wordEntry.association || "余韵",
      scene: wordEntry.scene || "未命名场景",
    }),
    narration: FALLBACK_NARRATIONS[themeKey] || FALLBACK_NARRATIONS.fairytale,
    imagePrompt: `${FALLBACK_IMAGE_PROMPTS[moodKey] || FALLBACK_IMAGE_PROMPTS.meadow}，主体为${wordEntry.word || "词"}`,
  };
}

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
}

module.exports = {
  buildFallbackFragment,
};
