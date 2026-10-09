import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of } from "rxjs";

import { AuditLog } from "../decorators/audit-log.decorator";
import { AuditInterceptor } from "./audit.interceptor";

// LG-3: when the audit row cannot be written, a write-ahead action does not run at all.

class Probe {
  @AuditLog({ action: "probe.export", resourceType: "probe", writeAhead: true })
  ahead() {
    return "done";
  }

  @AuditLog({ action: "probe.read", resourceType: "probe" })
  after() {
    return "done";
  }
}

const user = { userId: "u1", organisationId: "o1" };

function context(handler: () => unknown): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => Probe,
    switchToHttp: () => ({ getRequest: () => ({ user, params: { id: "r1" } }) }),
  } as unknown as ExecutionContext;
}

function build(insert: jest.Mock) {
  const db = {
    query: { auditEvents: { findMany: async () => [] } },
    insert: () => ({ values: insert }),
  };
  return new AuditInterceptor(new Reflector(), db as never);
}

describe("audit interceptor fails closed on write-ahead routes (LG-3)", () => {
  it("does not run the handler when the audit write fails", async () => {
    const handle = jest.fn(() => of("done"));
    const interceptor = build(jest.fn().mockRejectedValue(new Error("audit store down")));
    const result = interceptor.intercept(context(Probe.prototype.ahead), { handle } as CallHandler);
    await expect(lastValueFrom(result)).rejects.toThrow("audit store down");
    expect(handle).not.toHaveBeenCalled();
  });

  it("writes the event first and then runs the handler", async () => {
    const order: string[] = [];
    const insert = jest.fn(async () => {
      order.push("audit");
    });
    const handle = jest.fn(() => {
      order.push("handler");
      return of("done");
    });
    const result = await lastValueFrom(
      build(insert).intercept(context(Probe.prototype.ahead), { handle } as CallHandler),
    );
    expect(result).toBe("done");
    expect(order).toEqual(["audit", "handler"]);
  });

  it("keeps the after-handler write for routes that do not opt in, and surfaces its failure", async () => {
    const handle = jest.fn(() => of("done"));
    const interceptor = build(jest.fn().mockRejectedValue(new Error("audit store down")));
    await expect(
      lastValueFrom(interceptor.intercept(context(Probe.prototype.after), { handle } as CallHandler)),
    ).rejects.toThrow("audit store down");
    expect(handle).toHaveBeenCalled();
  });
});
