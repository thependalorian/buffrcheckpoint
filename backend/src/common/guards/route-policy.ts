import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";

import { AUTHENTICATED_ONLY_KEY } from "../decorators/authenticated-only.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";

export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface RoutePolicyGap {
  controller: string;
  handler: string;
  method: string;
  path: string;
}

function read(key: string, handler: object, controller: object): unknown {
  return Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller);
}

/**
 * State-changing handlers on `controller` that declare none of
 * @RequirePermission, @Public or @AuthenticatedOnly. RbacGuard refuses these at
 * runtime (§9.2 rule 10); this static pass lets a test fail before deploy.
 */
export function findRoutePolicyGaps(controller: abstract new (...args: never[]) => unknown): RoutePolicyGap[] {
  const gaps: RoutePolicyGap[] = [];
  const prototype = controller.prototype as Record<string, unknown>;
  const basePath = String(Reflect.getMetadata(PATH_METADATA, controller) ?? "");
  for (const name of Object.getOwnPropertyNames(prototype)) {
    if (name === "constructor") continue;
    const handler = prototype[name];
    if (typeof handler !== "function") continue;
    const methodValue = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
    if (methodValue === undefined) continue;
    const method = RequestMethod[methodValue];
    if (!MUTATING_METHODS.has(method)) continue;
    const declared =
      read(PERMISSION_KEY, handler, controller) ||
      read(IS_PUBLIC_KEY, handler, controller) ||
      read(AUTHENTICATED_ONLY_KEY, handler, controller);
    if (!declared) {
      gaps.push({
        controller: controller.name,
        handler: name,
        method,
        path: `/${basePath}/${String(Reflect.getMetadata(PATH_METADATA, handler) ?? "")}`.replace(/\/+/g, "/"),
      });
    }
  }
  return gaps;
}
