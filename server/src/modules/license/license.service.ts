import { createHmac, timingSafeEqual } from "crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { licenses, processedEvents } from "../../../../shared/schema";
import { DATABASE_CONNECTION, Database } from "../../db/db.module";
import {
  PADDLE_ACTIVATING_EVENTS,
  PADDLE_DEACTIVATING_EVENTS,
  UnknownRecord,
  buildLicenseKey,
  deriveMaxDevices,
  extractEmail,
  extractExpiryDate,
  extractSubscriptionId,
  mapDeactivationStatus,
  parsePaddlePayload,
  parsePaddleSignatureHeader,
  resolvePlan,
} from "./license.helpers";
import {
  LicenseHttpError,
  LicenseValidationResult,
  PaddleWebhookPayload,
  PaddleWebhookResult,
} from "./license.types";

export type {
  LicenseValidationResult,
  PaddleWebhookResult,
} from "./license.types";
export { LicenseHttpError } from "./license.types";

@Injectable()
export class LicenseService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional()
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  isEnforced(): boolean {
    return this.configService.get<string>("LICENSE_ENFORCE") === "true";
  }

  async processPaddleWebhook(
    rawBody: string,
    signatureHeader: string | undefined,
  ): Promise<PaddleWebhookResult> {
    this.verifyPaddleSignature(rawBody, signatureHeader);
    const payload = parsePaddlePayload(rawBody);

    if (!this.db) {
      throw new LicenseHttpError(
        503,
        "LICENSE_BACKEND_UNAVAILABLE",
        "License backend is not available",
      );
    }

    const lock = await this.db
      .insert(processedEvents)
      .values({
        eventId: payload.eventId,
        source: "paddle",
      })
      .onConflictDoNothing({
        target: processedEvents.eventId,
      })
      .returning({
        id: processedEvents.id,
      });

    if (lock.length === 0) {
      return {
        ok: true,
        eventId: payload.eventId,
        eventType: payload.eventType,
        action: "duplicate",
      };
    }

    try {
      const action = await this.applyPaddleLifecycle(payload);
      return {
        ok: true,
        eventId: payload.eventId,
        eventType: payload.eventType,
        action,
      };
    } catch (error) {
      await this.db
        .delete(processedEvents)
        .where(eq(processedEvents.eventId, payload.eventId));
      throw error;
    }
  }

  async validateLicenseKey(key: string): Promise<LicenseValidationResult> {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return this.invalid(
        401,
        "LICENSE_REQUIRED",
        "License key is required for hosted access",
      );
    }

    const expectedPrefix =
      this.configService.get<string>("LICENSE_KEY_PREFIX") || "AXON-";
    if (expectedPrefix && !normalizedKey.startsWith(expectedPrefix)) {
      return this.invalid(
        401,
        "LICENSE_INVALID",
        "Invalid license key format",
        { expectedPrefix },
      );
    }

    if (!this.db) {
      return this.invalid(
        503,
        "LICENSE_BACKEND_UNAVAILABLE",
        "License backend is not available",
      );
    }

    const rows = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.key, normalizedKey))
      .limit(1);

    const current = rows[0];
    if (!current) {
      return this.invalid(401, "LICENSE_INVALID", "Invalid license key");
    }

    if (current.status !== "active") {
      return this.invalid(403, "LICENSE_BLOCKED", "License is not active", {
        status: current.status,
      });
    }

    if (current.expiresAt.getTime() <= Date.now()) {
      return this.invalid(402, "LICENSE_EXPIRED", "License has expired", {
        expiresAt: current.expiresAt.toISOString(),
      });
    }

    return {
      valid: true,
      statusCode: 200,
      message: "License is valid",
      code: "LICENSE_VALID",
      license: current,
    };
  }

  private verifyPaddleSignature(
    rawBody: string,
    signatureHeader: string | undefined,
  ): void {
    const secret = this.configService.get<string>("PADDLE_WEBHOOK_SECRET");
    if (!secret) {
      throw new LicenseHttpError(
        503,
        "PADDLE_NOT_CONFIGURED",
        "Paddle webhook secret is not configured",
      );
    }

    const parsedSignature = parsePaddleSignatureHeader(signatureHeader);
    const { timestamp, signature: receivedSignature } = parsedSignature;

    const toleranceSecondsRaw = this.configService.get<string>(
      "PADDLE_WEBHOOK_TOLERANCE_SEC",
    );
    const toleranceSeconds = Number.parseInt(toleranceSecondsRaw || "300", 10);
    const timestampSeconds = Number.parseInt(timestamp, 10);
    if (
      Number.isFinite(toleranceSeconds) &&
      Number.isFinite(timestampSeconds) &&
      toleranceSeconds > 0
    ) {
      const drift = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
      if (drift > toleranceSeconds) {
        throw new LicenseHttpError(
          401,
          "PADDLE_SIGNATURE_EXPIRED",
          "Paddle webhook signature timestamp is outside allowed skew",
          { driftSeconds: drift, toleranceSeconds },
        );
      }
    }

    const payloadToSign = `${timestamp}:${rawBody}`;
    const expectedSignature = createHmac("sha256", secret)
      .update(payloadToSign, "utf8")
      .digest("hex");

    const receivedBuffer = Buffer.from(receivedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (
      receivedBuffer.length === 0 ||
      receivedBuffer.length !== expectedBuffer.length
    ) {
      throw new LicenseHttpError(
        401,
        "PADDLE_SIGNATURE_INVALID",
        "Paddle webhook signature does not match",
      );
    }

    const isValid = timingSafeEqual(receivedBuffer, expectedBuffer);
    if (!isValid) {
      throw new LicenseHttpError(
        401,
        "PADDLE_SIGNATURE_INVALID",
        "Paddle webhook signature does not match",
      );
    }
  }

  private async applyPaddleLifecycle(
    payload: PaddleWebhookPayload,
  ): Promise<PaddleWebhookResult["action"]> {
    const eventType = payload.eventType;
    if (PADDLE_ACTIVATING_EVENTS.has(eventType)) {
      await this.upsertActiveLicense(payload.data);
      return eventType === "subscription.created" ? "activated" : "updated";
    }

    if (PADDLE_DEACTIVATING_EVENTS.has(eventType)) {
      await this.deactivateLicense(payload.data, eventType);
      return "deactivated";
    }

    return "ignored";
  }

  private async upsertActiveLicense(data: UnknownRecord): Promise<void> {
    if (!this.db) {
      throw new LicenseHttpError(
        503,
        "LICENSE_BACKEND_UNAVAILABLE",
        "License backend is not available",
      );
    }

    const subscriptionId = extractSubscriptionId(data);
    if (!subscriptionId) {
      throw new LicenseHttpError(
        400,
        "PADDLE_SUBSCRIPTION_ID_MISSING",
        "Paddle event is missing subscription id",
      );
    }

    const plan = resolvePlan(data);
    const maxDevices = deriveMaxDevices(plan);
    const expiresAt = extractExpiryDate(data);
    const email = extractEmail(data);
    const status =
      typeof data.status === "string" && data.status.trim().length > 0
        ? data.status.trim()
        : "active";

    const existing = await this.db
      .select()
      .from(licenses)
      .where(eq(licenses.paddleSubscriptionId, subscriptionId))
      .limit(1);
    const existingLicense = existing[0];

    if (existingLicense) {
      await this.db
        .update(licenses)
        .set({
          email: email ?? existingLicense.email,
          plan,
          maxDevices,
          status,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(licenses.id, existingLicense.id));
      return;
    }

    const keyPrefix =
      this.configService.get<string>("LICENSE_KEY_PREFIX") || "AXON-";
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const generatedKey = buildLicenseKey(keyPrefix);
      const inserted = await this.db
        .insert(licenses)
        .values({
          key: generatedKey,
          email,
          status,
          plan,
          maxDevices,
          paddleSubscriptionId: subscriptionId,
          expiresAt,
        })
        .onConflictDoNothing({
          target: licenses.key,
        })
        .returning({
          id: licenses.id,
        });

      if (inserted.length > 0) {
        return;
      }
    }

    throw new LicenseHttpError(
      500,
      "LICENSE_KEY_GENERATION_FAILED",
      "Unable to generate a unique license key",
    );
  }

  private async deactivateLicense(
    data: UnknownRecord,
    eventType: string,
  ): Promise<void> {
    if (!this.db) {
      throw new LicenseHttpError(
        503,
        "LICENSE_BACKEND_UNAVAILABLE",
        "License backend is not available",
      );
    }

    const subscriptionId = extractSubscriptionId(data);
    if (!subscriptionId) {
      return;
    }

    const status = mapDeactivationStatus(eventType);

    await this.db
      .update(licenses)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(licenses.paddleSubscriptionId, subscriptionId));
  }

  private invalid(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): LicenseValidationResult {
    return {
      valid: false,
      statusCode,
      code,
      message,
      details,
    };
  }
}
