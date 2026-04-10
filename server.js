const path = require("node:path");

const { startServer } = require("./server/index.js");

startServer({
  rootDir: path.resolve(__dirname),
});
