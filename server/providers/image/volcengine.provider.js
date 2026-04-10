const { buildImagePrompt } = require("../../domain/prompt-builder");
const { fetchAsDataUrl, postJson } = require("../../utils/http");

async function generateImage(config, { themeKey, moodKey, imagePrompt }) {
  const data = await postJson(`${config.baseUrl}/api/v3/images/generations`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      prompt: buildImagePrompt(themeKey, moodKey, imagePrompt),
      sequential_image_generation: "disabled",
      response_format: config.responseFormat,
      size: config.size,
      stream: false,
      watermark: config.watermark,
    },
  });

  const asset = extractAsset(data);

  if (asset.base64) {
    return {
      imageDataUrl: `data:image/png;base64,${asset.base64}`,
      imageError: "",
      imageSource: "volcengine",
    };
  }

  if (asset.url) {
    return {
      imageDataUrl: await fetchAsDataUrl(asset.url),
      imageError: "",
      imageSource: "volcengine",
    };
  }

  throw new Error("Volcengine image endpoint returned no image data");
}

function extractAsset(data) {
  const item = Array.isArray(data.data) ? data.data[0] || {} : data.data || {};

  return {
    base64: item.b64_json || item.image_base64 || data.b64_json || data.image_base64 || "",
    url: item.url || item.image_url || item.image_urls?.[0] || data.url || "",
  };
}

module.exports = {
  generateImage,
};
