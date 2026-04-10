const { getWordBank } = require("../services/word-bank.service");
const { readJsonBody, sendJson } = require("../utils/http");
const { toErrorResponse } = require("../domain/errors");

async function handleWordBankRoute(request, response, context) {
  let body = {};

  try {
    body = await readJsonBody(request);
    const payload = await getWordBank(body, context);
    sendJson(response, 200, payload);
  } catch (error) {
    const handled = toErrorResponse(error, body.requestId);
    sendJson(response, handled.statusCode, handled.body);
  }
}

module.exports = {
  handleWordBankRoute,
};
