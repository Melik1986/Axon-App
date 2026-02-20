import { MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { LicenseMiddleware } from "./modules/license/license.middleware";
import {
  configureLicenseMiddleware,
  LICENSE_MIDDLEWARE_EXCLUDES,
} from "./modules/license/license.middleware.config";

interface RouteLike {
  path: string;
  method: RequestMethod;
}

function isRouteLike(value: unknown): value is RouteLike {
  if (!value || typeof value !== "object") {
    return false;
  }
  const maybeRoute = value as Partial<RouteLike>;
  return (
    typeof maybeRoute.path === "string" && typeof maybeRoute.method === "number"
  );
}

describe("AppModule license middleware configuration", () => {
  it("registers explicit excludes for license bootstrap and docs endpoints", () => {
    const forRoutes = jest.fn();
    let excludedRoutes: RouteLike[] = [];
    const exclude = jest.fn((...routes: unknown[]) => {
      excludedRoutes = routes.filter(isRouteLike);
      return { forRoutes };
    });
    const apply = jest.fn(() => ({ exclude, forRoutes }));

    const consumer = { apply } as unknown as MiddlewareConsumer;
    configureLicenseMiddleware(consumer);

    expect(apply).toHaveBeenCalledWith(LicenseMiddleware);
    const routeMap = new Set(
      excludedRoutes.map((route) => `${route.method}:${route.path}`),
    );
    expect(Array.from(routeMap)).toEqual(
      expect.arrayContaining([
        `${RequestMethod.POST}:license/validate`,
        `${RequestMethod.POST}:api/license/validate`,
        `${RequestMethod.GET}:health`,
        `${RequestMethod.GET}:api/docs`,
        `${RequestMethod.GET}:api/docs/(.*)`,
      ]),
    );
    expect(excludedRoutes).toEqual(
      expect.arrayContaining(LICENSE_MIDDLEWARE_EXCLUDES),
    );
    expect(forRoutes).toHaveBeenCalledWith({
      path: "*",
      method: RequestMethod.ALL,
    });
  });
});
