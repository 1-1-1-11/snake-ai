const FALLBACK_WORDS = {
  fairytale: ["鹿", "灯", "蝶", "湖", "泉", "雾", "桥", "露", "花", "苔", "风", "夜", "梦"],
  scifi: ["舱", "轨", "核", "镜", "塔", "场", "阀", "锚", "链", "栅", "风", "夜", "梦"],
  tang: ["舟", "江", "月", "山", "云", "桥", "雪", "柳", "渔", "灯", "风", "夜", "梦"],
};

const MAGIC_WORDS = {
  风: "wind",
  夜: "night",
  梦: "dream",
};

function buildFallbackWordBank(themeKey, excludeWords = [], count = 6) {
  const excluded = new Set(excludeWords);
  const pool = shuffle((FALLBACK_WORDS[themeKey] || FALLBACK_WORDS.fairytale).filter((word) => !excluded.has(word)));

  return pool.slice(0, count).map((word) => ({
    word,
    magic: Boolean(MAGIC_WORDS[word]),
    mood: MAGIC_WORDS[word] || null,
    association: "余韵",
    scene: "未命名场景",
    art: `${word}的轮廓`,
  }));
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

module.exports = {
  FALLBACK_WORDS,
  MAGIC_WORDS,
  buildFallbackWordBank,
};
