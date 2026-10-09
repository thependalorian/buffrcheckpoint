import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from "@nestjs/common";

import { errorBody } from "./uniform-error.filter";

describe("uniform error body (API-7)", () => {
  it("adds a stable code and the request id to a plain HTTP error", () => {
    const { status, body } = errorBody(new NotFoundException("Visit not found"), "req-1");
    expect(status).toBe(404);
    expect(body).toMatchObject({ statusCode: 404, message: "Visit not found", code: "not_found", requestId: "req-1" });
  });

  it("keeps a controller's own code and extra fields", () => {
    const { body } = errorBody(
      new ForbiddenException({ code: "step_up_required", message: "Sign in again to confirm this action." }),
      "r",
    );
    expect(body).toMatchObject({
      code: "step_up_required",
      message: "Sign in again to confirm this action.",
      statusCode: 403,
    });
    const throttled = errorBody(new HttpException({ message: "Wait", retryAfterSeconds: 30 }, 429), "r");
    expect(throttled.body).toMatchObject({ code: "too_many_requests", retryAfterSeconds: 30 });
  });

  it("keeps a validation message array", () => {
    const { body } = errorBody(new BadRequestException(["email must be an email", "name must be a string"]), "r");
    expect(body.message).toEqual(["email must be an email", "name must be a string"]);
    expect(body.code).toBe("bad_request");
  });

  it("turns an unexpected error into a plain 500 with no stack, SQL or path", () => {
    const { status, body } = errorBody(
      new Error('relation "visitor_visits" does not exist at /app/src/db/x.ts:12'),
      "r",
    );
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toMatch(/relation|\/app|\.ts|at /);
    expect(body).toMatchObject({ code: "internal_error", requestId: "r" });
  });
});
