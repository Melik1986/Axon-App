import { MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { LicenseMiddleware } from "./license.middleware";

export interface MiddlewareRoute {
  path: string;
  method: RequestMethod;
}

export const LICENSE_MIDDLEWARE_EXCLUDES: MiddlewareRoute[] = [
  { path: "license/validate", method: RequestMethod.POST },
  { path: "api/license/validate", method: RequestMethod.POST },
  { path: "license/webhook/paddle", method: RequestMethod.POST },
  { path: "api/license/webhook/paddle", method: RequestMethod.POST },
  { path: "health", method: RequestMethod.GET },
  { path: "api/docs", method: RequestMethod.GET },
  { path: "api/docs/(.*)", method: RequestMethod.GET },
];

export function configureLicenseMiddleware(consumer: MiddlewareConsumer): void {
  consumer
    .apply(LicenseMiddleware)
    .exclude(...LICENSE_MIDDLEWARE_EXCLUDES)
    .forRoutes({ path: "*", method: RequestMethod.ALL });
}
