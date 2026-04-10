const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { createServer } = require("../../server/index.js");

test("GET /api/config returns normalized capability fields", async () => {
  const { server } = createServer({
    rootDir: path.resolve(__dirname, "../.."),
    env: {
      PORT: "0",
      TEXT_PROVIDER: "zhipu",
      ZHIPU_API_KEY: "",
      VOLC_IMAGE_API_KEY: "",
    },
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/config`);
    const data = await response.json();

    assert.equal(data.ok, true);
    assert.equal(data.provider, "fallback");
    assert.equal(data.textSource, "fallback");
    assert.equal(data.imageSource, "fallback");
    assert.equal(data.aiEnabled, false);
    assert.equal(data.imageEnabled, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/word-bank falls back without provider keys and preserves request metadata", async () => {
  const { server } = createServer({
    rootDir: path.resolve(__dirname, "../.."),
    env: {
      PORT: "0",
      TEXT_PROVIDER: "zhipu",
      ZHIPU_API_KEY: "",
      VOLC_IMAGE_API_KEY: "",
    },
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/word-bank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "wb_test",
        roundVersion: 7,
        themeKey: "fairytale",
        excludeWords: [],
      }),
    });
    const data = await response.json();

    assert.equal(data.ok, true);
    assert.equal(data.requestId, "wb_test");
    assert.equal(data.roundVersion, 7);
    assert.equal(data.textSource, "fallback");
    assert.equal(Array.isArray(data.words), true);
    assert.equal(data.words.length > 0, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET / serves the module entry page", async () => {
  const { server } = createServer({
    rootDir: path.resolve(__dirname, "../.."),
    env: {
      PORT: "0",
      TEXT_PROVIDER: "zhipu",
      ZHIPU_API_KEY: "",
      VOLC_IMAGE_API_KEY: "",
    },
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();

    assert.equal(response.ok, true);
    assert.equal(html.includes('type="module" src="app.mjs"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/generate-fragment returns ready fallback fragment metadata", async () => {
  const { server } = createServer({
    rootDir: path.resolve(__dirname, "../.."),
    env: {
      PORT: "0",
      TEXT_PROVIDER: "zhipu",
      ZHIPU_API_KEY: "",
      VOLC_IMAGE_API_KEY: "",
    },
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/generate-fragment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "fg_test",
        roundVersion: 5,
        themeKey: "fairytale",
        moodKey: "meadow",
        wordEntry: {
          word: "鹿",
          association: "晨露",
          scene: "林间空地",
          art: "林中小鹿",
        },
        historyLines: [],
      }),
    });
    const data = await response.json();

    assert.equal(data.ok, true);
    assert.equal(data.requestId, "fg_test");
    assert.equal(data.roundVersion, 5);
    assert.equal(data.status, "ready");
    assert.equal(data.textSource, "fallback");
    assert.equal(typeof data.line, "string");
    assert.equal(data.line.length > 0, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
