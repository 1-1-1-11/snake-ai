const { getFragment } = require("../services/fragment.service");
const { readJsonBody, sendJson } = require("../utils/http");
const { toErrorResponse } = require("../domain/errors");

async function handleFragmentRoute(request, response, context) {
  let body = {};

  try {
    body = await readJsonBody(request);
    const payload = await getFragment(body, context);
    sendJson(response, 200, payload);
  } catch (error) {
    const handled = toErrorResponse(error, body.requestId);
    sendJson(response, handled.statusCode, handled.body);
  }
}

module.exports = {
  handleFragmentRoute,
};
