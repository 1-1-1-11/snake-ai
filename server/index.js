const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { handleConfigRoute } = require("./routes/config.route");
const { handleWordBankRoute } = require("./routes/word-bank.route");
const { handleFragmentRoute } = require("./routes/fragment.route");
const { toErrorResponse } = require("./domain/errors");
const { loadEnvFiles, buildServiceConfig } = require("./utils/env");
const { createLogger } = require("./utils/logger");
const { sendJson } = require("./utils/http");

const zhipuProvider = require("./providers/text/zhipu.provider");
const minimaxProvider = require("./providers/text/minimax.provider");
const volcengineProvider = require("./providers/image/volcengine.provider");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function createAppContext({ rootDir, env = process.env, logger = createLogger() }) {
  loadEnvFiles(rootDir);

  return {
    rootDir,
    logger,
    config: buildServiceConfig(env),
    providers: {
      text: {
        zhipu: zhipuProvider,
        minimax: minimaxProvider,
      },
      image: {
        volcengine: volcengineProvider,
      },
    },
  };
}

function createServer(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, "..");
  const context = options.context || createAppContext({ rootDir, env: options.env, logger: options.logger });

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (request.method === "GET" && url.pathname === "/api/config") {
        handleConfigRoute(response, context);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/word-bank") {
        await handleWordBankRoute(request, response, context);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/generate-fragment") {
        await handleFragmentRoute(request, response, context);
        return;
      }

      if (request.method === "GET") {
        serveStatic(rootDir, url.pathname, response);
        return;
      }

      sendJson(response, 404, {
        ok: false,
        code: "NOT_FOUND",
        message: "Not found",
        requestId: "",
      });
    } catch (error) {
      const handled = toErrorResponse(error);
      sendJson(response, handled.statusCode, handled.body);
    }
  });

  return { server, context };
}

function startServer(options = {}) {
  const { server, context } = createServer(options);

  server.listen(context.config.port, () => {
    context.logger.info(`Snake AI is running at http://localhost:${context.config.port}`);
    context.logger.info(buildStartupLine(context.config));
  });

  return { server, context };
}

function buildStartupLine(config) {
  if (config.text.enabled && config.image.enabled) {
    return `Text enabled with ${config.text.model}; image enabled with ${config.image.model}`;
  }

  if (config.text.enabled) {
    return `Text enabled with ${config.text.model}; image generation disabled`;
  }

  if (config.image.enabled) {
    return `Image enabled with ${config.image.model}; text generation disabled`;
  }

  return "AI disabled. Using fallback mode.";
}

function serveStatic(rootDir, pathname, response) {
  const resolvedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path
    .normalize(resolvedPath)
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(response);
}

module.exports = {
  createAppContext,
  createServer,
  startServer,
};
