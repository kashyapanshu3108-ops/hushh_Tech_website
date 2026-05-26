export class HttpError extends Error {
  constructor(statusCode, message, code = "http_error") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends HttpError {
  constructor(message, code = "validation_error") {
    super(400, message, code);
    this.name = "ValidationError";
  }
}

export class AuthError extends HttpError {
  constructor(message = "Unauthorized") {
    super(401, message, "unauthorized");
    this.name = "AuthError";
  }
}

export class UpstreamError extends HttpError {
  constructor(message = "Deep intelligence research is temporarily unavailable") {
    super(502, message, "upstream_error");
    this.name = "UpstreamError";
  }
}
