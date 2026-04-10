class AppError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function toErrorResponse(error, requestId = "") {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
        requestId,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      ok: false,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown server error",
      requestId,
    },
  };
}

module.exports = {
  AppError,
  toErrorResponse,
};
