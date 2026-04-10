const { postJson } = require("../../utils/http");
const { parseFragment, parseWordBank } = require("../../domain/normalize");

async function generateWordBank(config, prompt) {
  const data = await postJson(`${config.baseUrl}/v1/messages`, {
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: {
      model: config.model,
      max_tokens: 4096,
      temperature: 1,
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: JSON.stringify(prompt.user) }],
        },
      ],
    },
  });

  return parseWordBank(extractText(data));
}

async function generateFragment(config, prompt) {
  const data = await postJson(`${config.baseUrl}/v1/messages`, {
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: {
      model: config.model,
      max_tokens: 4096,
      temperature: 1,
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: JSON.stringify(prompt.user) }],
        },
      ],
    },
  });

  return parseFragment(extractText(data));
}

function extractText(data) {
  return (Array.isArray(data.content) ? data.content : [])
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

module.exports = {
  generateFragment,
  generateWordBank,
};
