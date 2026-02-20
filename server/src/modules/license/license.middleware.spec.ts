import { NextFunction, Request, Response } from "express";
import { LicenseMiddleware } from "./license.middleware";
import { LicenseService, LicenseValidationResult } from "./license.service";

function createResponseMock(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function createLicenseServiceMock(
  overrides?: Partial<{
    isEnforced: () => boolean;
    validateLicenseKey: (key: string) => Promise<LicenseValidationResult>;
  }>,
): LicenseService {
  return {
    isEnforced: overrides?.isEnforced ?? (() => true),
    validateLicenseKey:
      overrides?.validateLicenseKey ??
      (async () => ({
        valid: true,
        statusCode: 200,
        message: "ok",
        code: "LICENSE_VALID",
      })),
  } as unknown as LicenseService;
}

describe("LicenseMiddleware", () => {
  it("skips checks when enforcement is disabled", async () => {
    const service = createLicenseServiceMock({
      isEnforced: () => false,
    });
    const middleware = new LicenseMiddleware(service);
    const req = { headers: {} } as Request;
    const res = createResponseMock();
    const next = jest.fn() as NextFunction;

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns LICENSE_REQUIRED when key is missing", async () => {
    const service = createLicenseServiceMock();
    const middleware = new LicenseMiddleware(service);
    const req = { headers: {} } as Request;
    const res = createResponseMock();
    const next = jest.fn() as NextFunction;

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: "LICENSE_REQUIRED",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns service validation error payload", async () => {
    const service = createLicenseServiceMock({
      validateLicenseKey: async () => ({
        valid: false,
        statusCode: 402,
        message: "License has expired",
        code: "LICENSE_EXPIRED",
      }),
    });
    const middleware = new LicenseMiddleware(service);
    const req = { headers: { "x-license-key": "AXON-EXPIRED" } } as Request;
    const res = createResponseMock();
    const next = jest.fn() as NextFunction;

    await middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 402,
        code: "LICENSE_EXPIRED",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("passes request to next when license is valid", async () => {
    const service = createLicenseServiceMock({
      validateLicenseKey: async () => ({
        valid: true,
        statusCode: 200,
        message: "License is valid",
        code: "LICENSE_VALID",
        license: {
          id: "lic-1",
          key: "AXON-VALID",
          status: "active",
          plan: "pro",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    });
    const middleware = new LicenseMiddleware(service);
    const req = { headers: { "x-license-key": "AXON-VALID" } } as Request;
    const res = createResponseMock();
    const next = jest.fn() as NextFunction;

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
