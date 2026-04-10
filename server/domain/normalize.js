const { MAGIC_WORDS } = require("./fallback-words");

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
    magic: Boolean(entry.magic) || Boolean(MAGIC_WORDS[word]),
    mood: entry.mood || MAGIC_WORDS[word] || null,
    association: String(entry.association || "余韵").trim().slice(0, 18),
    scene: String(entry.scene || "未命名场景").trim().slice(0, 18),
    art: String(entry.art || `${word}的轮廓`).trim().slice(0, 24),
  };
}

function parseWordBank(content) {
  const parsed = safeParseJson(content);
  const words = Array.isArray(parsed.words) ? parsed.words : [];
  const normalized = words.map(normalizeWordEntry).filter(Boolean);

  if (normalized.length === 0) {
    throw new Error("Model returned an empty word bank");
  }

  return normalized;
}

function parseFragment(content) {
  const parsed = safeParseJson(content);
  const line = String(parsed.line || "").trim();
  const narration = String(parsed.narration || "").trim();
  const imagePrompt = String(parsed.imagePrompt || "").trim();

  if (!line || !narration || !imagePrompt) {
    throw new Error("Model did not return complete fragment fields");
  }

  return { line, narration, imagePrompt };
}

function safeParseJson(content) {
  const cleaned = String(content)
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(cleaned || "{}");
}

module.exports = {
  normalizeWordEntry,
  parseFragment,
  parseWordBank,
};
