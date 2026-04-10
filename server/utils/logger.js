function createLogger() {
  return {
    info(message, meta) {
      log("INFO", message, meta);
    },
    warn(message, meta) {
      log("WARN", message, meta);
    },
    error(message, meta) {
      log("ERROR", message, meta);
    },
  };
}

function log(level, message, meta) {
  const prefix = `[SnakeAI] ${level}`;

  if (meta === undefined) {
    console.log(prefix, message);
    return;
  }

  console.log(prefix, message, meta);
}

module.exports = {
  createLogger,
};
