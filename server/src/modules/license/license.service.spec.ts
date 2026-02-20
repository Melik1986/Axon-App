import { ConfigService } from "@nestjs/config";
import { Database } from "../../db/db.module";
import { LicenseService } from "./license.service";
import { License } from "../../../../shared/schema";

function createConfigServiceMock(
  values: Record<string, string | undefined>,
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function createDbMock(rows: License[]): Database {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });

  return {
    select,
  } as unknown as Database;
}

function buildLicense(overrides?: Partial<License>): License {
  const now = new Date();
  return {
    id: "lic-1",
    key: "AXON-VALID-KEY",
    email: null,
    status: "active",
    plan: "pro",
    maxDevices: 1,
    paddleSubscriptionId: null,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("LicenseService", () => {
  it("returns invalid when database is unavailable", async () => {
    const service = new LicenseService(
      createConfigServiceMock({
        LICENSE_KEY_PREFIX: "AXON-",
      }),
      null,
    );

    const result = await service.validateLicenseKey("AXON-TEST");
    expect(result.valid).toBe(false);
    expect(result.code).toBe("LICENSE_BACKEND_UNAVAILABLE");
    expect(result.statusCode).toBe(503);
  });

  it("returns invalid for wrong prefix", async () => {
    const service = new LicenseService(
      createConfigServiceMock({
        LICENSE_KEY_PREFIX: "AXON-",
      }),
      createDbMock([]),
    );

    const result = await service.validateLicenseKey("BAD-KEY");
    expect(result.valid).toBe(false);
    expect(result.code).toBe("LICENSE_INVALID");
    expect(result.statusCode).toBe(401);
  });

  it("returns expired when license is out of date", async () => {
    const service = new LicenseService(
      createConfigServiceMock({
        LICENSE_KEY_PREFIX: "AXON-",
      }),
      createDbMock([
        buildLicense({
          expiresAt: new Date(Date.now() - 60 * 1000),
        }),
      ]),
    );

    const result = await service.validateLicenseKey("AXON-VALID-KEY");
    expect(result.valid).toBe(false);
    expect(result.code).toBe("LICENSE_EXPIRED");
    expect(result.statusCode).toBe(402);
  });

  it("returns blocked when status is not active", async () => {
    const service = new LicenseService(
      createConfigServiceMock({
        LICENSE_KEY_PREFIX: "AXON-",
      }),
      createDbMock([
        buildLicense({
          status: "revoked",
        }),
      ]),
    );

    const result = await service.validateLicenseKey("AXON-VALID-KEY");
    expect(result.valid).toBe(false);
    expect(result.code).toBe("LICENSE_BLOCKED");
    expect(result.statusCode).toBe(403);
  });

  it("returns valid for active non-expired license", async () => {
    const service = new LicenseService(
      createConfigServiceMock({
        LICENSE_KEY_PREFIX: "AXON-",
      }),
      createDbMock([buildLicense()]),
    );

    const result = await service.validateLicenseKey("AXON-VALID-KEY");
    expect(result.valid).toBe(true);
    expect(result.code).toBe("LICENSE_VALID");
    expect(result.statusCode).toBe(200);
  });
});
