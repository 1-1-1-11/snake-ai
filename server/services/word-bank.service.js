const { buildFallbackWordBank } = require("../domain/fallback-words");
const { buildWordBankPrompt } = require("../domain/prompt-builder");
const { normalizeWordEntry } = require("../domain/normalize");

async function getWordBank(input, context) {
  const excluded = new Set([
    ...(Array.isArray(input.excludeWords) ? input.excludeWords : []),
    ...(Array.isArray(input.historyWords) ? input.historyWords : []),
  ]);

  let words = [];
  let textSource = "fallback";

  if (context.config.text.enabled) {
    try {
      const provider = context.providers.text[context.config.text.provider];
      const prompt = buildWordBankPrompt(input);
      words = await provider.generateWordBank(context.config.text, prompt);
      textSource = context.config.text.provider;
    } catch (error) {
      context.logger.warn("Word bank provider failed, using fallback", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const deduped = [];
  const seen = new Set();

  words.map(normalizeWordEntry).filter(Boolean).forEach((word) => {
    if (seen.has(word.word) || excluded.has(word.word)) {
      return;
    }

    seen.add(word.word);
    deduped.push(word);
  });

  if (deduped.length < 6) {
    const fallbackWords = buildFallbackWordBank(input.themeKey, [...excluded, ...seen], 6);

    fallbackWords.forEach((word) => {
      if (deduped.length >= 6 || seen.has(word.word) || excluded.has(word.word)) {
        return;
      }

      seen.add(word.word);
      deduped.push(word);
    });
  }

  return {
    ok: true,
    provider: context.config.provider,
    textSource,
    imageSource: context.config.image.enabled ? context.config.image.provider : "fallback",
    requestId: String(input.requestId || ""),
    roundVersion: Number.isInteger(input.roundVersion) ? input.roundVersion : 0,
    words: deduped.slice(0, 6),
  };
}

module.exports = {
  getWordBank,
};
