async function postJson(url, { headers = {}, body, timeoutMs = 45000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readErrorBody(response));
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAsDataUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image fetch failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function readErrorBody(response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text);
    return parsed.error?.message || parsed.error?.code || parsed.message || text;
  } catch (error) {
    return text;
  }
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

module.exports = {
  fetchAsDataUrl,
  postJson,
  readJsonBody,
  sendJson,
};
