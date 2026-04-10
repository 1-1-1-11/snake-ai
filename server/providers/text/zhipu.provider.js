const { postJson } = require("../../utils/http");
const { parseFragment, parseWordBank } = require("../../domain/normalize");

async function generateWordBank(config, prompt) {
  const data = await postJson(`${config.baseUrl}/chat/completions`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: JSON.stringify(prompt.user) },
      ],
    },
  });

  return parseWordBank(data.choices?.[0]?.message?.content || "{}");
}

async function generateFragment(config, prompt) {
  const data = await postJson(`${config.baseUrl}/chat/completions`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      temperature: 0.95,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: JSON.stringify(prompt.user) },
      ],
    },
  });

  return parseFragment(data.choices?.[0]?.message?.content || "{}");
}

module.exports = {
  generateFragment,
  generateWordBank,
};
