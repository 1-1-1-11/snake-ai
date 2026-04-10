const { buildFallbackFragment } = require("../domain/fallback-fragment");
const { buildFragmentPrompt } = require("../domain/prompt-builder");

async function getFragment(input, context) {
  let textResult;
  let textSource = "fallback";
  let errorMessage = "";

  if (context.config.text.enabled) {
    try {
      const provider = context.providers.text[context.config.text.provider];
      const prompt = buildFragmentPrompt(input);
      textResult = await provider.generateFragment(context.config.text, prompt);
      textSource = context.config.text.provider;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      context.logger.warn("Text fragment provider failed, using fallback", { message: errorMessage });
    }
  }

  if (!textResult) {
    textResult = buildFallbackFragment(input);
  }

  let imageDataUrl = "";
  let imageError = "";
  let imageSource = "fallback";

  if (context.config.image.enabled) {
    try {
      const image = await context.providers.image.volcengine.generateImage(context.config.image, {
        themeKey: input.themeKey,
        moodKey: input.moodKey,
        imagePrompt: textResult.imagePrompt || input.wordEntry?.art || "诗意画面",
      });

      imageDataUrl = image.imageDataUrl;
      imageError = image.imageError;
      imageSource = image.imageSource;
    } catch (error) {
      imageError = error instanceof Error ? error.message : String(error);
      context.logger.warn("Image provider failed, keeping text result", { message: imageError });
    }
  }

  return {
    ok: true,
    provider: context.config.provider,
    textSource,
    imageSource,
    requestId: String(input.requestId || ""),
    roundVersion: Number.isInteger(input.roundVersion) ? input.roundVersion : 0,
    line: textResult.line,
    narration: textResult.narration,
    imageDataUrl,
    imageError,
    status: "ready",
    error: errorMessage,
  };
}

module.exports = {
  getFragment,
};
