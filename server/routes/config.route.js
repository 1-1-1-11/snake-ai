const { getPublicConfig } = require("../services/config.service");
const { sendJson } = require("../utils/http");

function handleConfigRoute(response, context) {
  sendJson(response, 200, getPublicConfig(context.config));
}

module.exports = {
  handleConfigRoute,
};
