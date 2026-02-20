import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { LicenseService } from "./license.service";

interface LicensedRequest extends Request {
  license?: unknown;
}

function readHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    return typeof first === "string" ? first : "";
  }
  return "";
}

@Injectable()
export class LicenseMiddleware implements NestMiddleware {
  constructor(private readonly licenseService: LicenseService) {}

  async use(req: LicensedRequest, res: Response, next: NextFunction) {
    if (!this.licenseService.isEnforced()) {
      next();
      return;
    }

    const licenseKey = readHeaderValue(req.headers["x-license-key"]).trim();
    if (!licenseKey) {
      res.status(401).json({
        statusCode: 401,
        message: "License key is required for hosted access",
        code: "LICENSE_REQUIRED",
        details: null,
      });
      return;
    }

    const result = await this.licenseService.validateLicenseKey(licenseKey);
    if (!result.valid) {
      res.status(result.statusCode).json({
        statusCode: result.statusCode,
        message: result.message,
        code: result.code,
        details: result.details ?? null,
      });
      return;
    }

    req.license = result.license;
    next();
  }
}
