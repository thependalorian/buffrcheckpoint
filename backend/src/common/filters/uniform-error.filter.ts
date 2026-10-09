import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-bc-request-id";

const DEFAULT_CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorised",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  413: "payload_too_large",
  422: "unprocessable",
  429: "too_many_requests",
  500: "internal_error",
  502: "bad_gateway",
  503: "unavailable",
};

interface ReplyLike {
  status(code: number): ReplyLike;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

/** Builds the response body for an exception: stable `code`, `message`, and a `requestId`, never a stack, SQL or internal path (API-7). */
export function errorBody(exception: unknown, requestId: string): { status: number; body: Record<string, unknown> } {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const extra =
      typeof response === "object" && response !== null ? (response as Record<string, unknown>) : { message: response };
    return {
      status,
      body: {
        ...extra,
        statusCode: status,
        error: extra.error ?? HttpStatus[status] ?? "Error",
        code: extra.code ?? DEFAULT_CODES[status] ?? "error",
        requestId,
      },
    };
  }
  return {
    status: 500,
    body: {
      statusCode: 500,
      error: "Internal Server Error",
      message: "Something went wrong. Try again.",
      code: "internal_error",
      requestId,
    },
  };
}

/**
 * The one place that shapes error responses. Keeps every field a controller already set (a message array, a retry hint, a step-up code),
 * adds a stable `code` and a `requestId`, and turns anything that is not an HttpException into a plain 500. Server errors go to Sentry.
 */
@Catch()
export class UniformErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const reply = http.getResponse<ReplyLike>();
    const incoming = request.headers[REQUEST_ID_HEADER];
    const requestId = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    const { status, body } = errorBody(exception, requestId);
    if (status >= 500) Sentry.captureException(exception);
    reply.setHeader(REQUEST_ID_HEADER, requestId);
    reply.status(status).json(body);
  }
}
