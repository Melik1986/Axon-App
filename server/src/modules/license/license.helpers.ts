import { randomBytes } from "crypto";
import { LicenseHttpError, PaddleWebhookPayload } from "./license.types";

export type UnknownRecord = Record<string, unknown>;

export const PADDLE_ACTIVATING_EVENTS = new Set<string>([
  "subscription.activated",
  "subscription.created",
  "subscription.updated",
  "subscription.resumed",
  "subscription.trialing",
  "subscription.past_due",
]);

export const PADDLE_DEACTIVATING_EVENTS = new Set<string>([
  "subscription.canceled",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.expired",
  "subscription.terminated",
]);

export function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

export function readNestedValue(
  source: UnknownRecord,
  path: string[],
): unknown {
  let current: unknown = source;
  for (const segment of path) {
    const node = asRecord(current);
    if (!node || !(segment in node)) {
      return undefined;
    }
    current = node[segment];
  }
  return current;
}

export function derivePlanFromPriceId(priceId: string | null): string {
  if (!priceId) return "pro";
  const normalized = priceId.toLowerCase();
  if (normalized.includes("enterprise")) return "enterprise";
  if (normalized.includes("business")) return "business";
  return "pro";
}

export function deriveMaxDevices(plan: string): number {
  const normalized = plan.toLowerCase();
  if (normalized === "enterprise") return 100;
  if (normalized === "business") return 10;
  return 1;
}

export function buildLicenseKey(prefix: string): string {
  const normalizedPrefix = prefix.endsWith("-") ? prefix : `${prefix}-`;
  const segment = () => randomBytes(2).toString("hex").toUpperCase();
  return `${normalizedPrefix}${segment()}-${segment()}-${segment()}-${segment()}`;
}

export function parsePaddlePayload(rawBody: string): PaddleWebhookPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new LicenseHttpError(
      400,
      "PADDLE_INVALID_PAYLOAD",
      "Paddle webhook payload must be valid JSON",
    );
  }

  const root = asRecord(parsed);
  if (!root) {
    throw new LicenseHttpError(
      400,
      "PADDLE_INVALID_PAYLOAD",
      "Paddle webhook payload must be an object",
    );
  }

  const eventId = readString(root.event_id);
  const eventType = readString(root.event_type);
  const data = asRecord(root.data) ?? {};

  if (!eventId || !eventType) {
    throw new LicenseHttpError(
      400,
      "PADDLE_INVALID_PAYLOAD",
      "Paddle webhook payload is missing event_id or event_type",
    );
  }

  return { eventId, eventType, data };
}

export interface ParsedPaddleSignature {
  timestamp: string;
  signature: string;
}

export function parsePaddleSignatureHeader(
  signatureHeader: string | undefined,
): ParsedPaddleSignature {
  if (!signatureHeader) {
    throw new LicenseHttpError(
      401,
      "PADDLE_SIGNATURE_MISSING",
      "Paddle webhook signature is missing",
    );
  }

  const signaturePairs = signatureHeader
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  let timestamp: string | null = null;
  let receivedSignature: string | null = null;

  for (const pair of signaturePairs) {
    const [key, ...rest] = pair.split("=");
    if (!key || rest.length === 0) continue;
    const value = rest.join("=").trim();
    if (key === "ts") timestamp = value;
    if (key === "h1") receivedSignature = value;
  }

  if (!timestamp || !receivedSignature) {
    throw new LicenseHttpError(
      401,
      "PADDLE_SIGNATURE_INVALID",
      "Paddle webhook signature header is malformed",
    );
  }

  return {
    timestamp,
    signature: receivedSignature,
  };
}

export function extractSubscriptionId(data: UnknownRecord): string | null {
  const candidates: unknown[] = [
    data.id,
    data.subscription_id,
    readNestedValue(data, ["subscription", "id"]),
  ];

  for (const candidate of candidates) {
    const value = readString(candidate);
    if (value) return value;
  }
  return null;
}

export function extractExpiryDate(data: UnknownRecord): Date {
  const candidates: unknown[] = [
    readNestedValue(data, ["current_billing_period", "ends_at"]),
    data.next_billed_at,
    readNestedValue(data, ["billing_period", "ends_at"]),
    readNestedValue(data, ["scheduled_change", "effective_at"]),
  ];

  for (const candidate of candidates) {
    const value = readDate(candidate);
    if (value) return value;
  }

  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
}

export function resolvePlan(data: UnknownRecord): string {
  const customData = asRecord(data.custom_data);
  const customPlan = readString(customData?.plan);
  if (customPlan) {
    return customPlan;
  }

  const firstItem = Array.isArray(data.items) ? data.items[0] : null;
  const firstItemRecord = asRecord(firstItem);
  const price = asRecord(firstItemRecord?.price);
  const priceId =
    readString(price?.id) ?? readString(firstItemRecord?.price_id);
  return derivePlanFromPriceId(priceId);
}

export function extractEmail(data: UnknownRecord): string | null {
  const customer = asRecord(data.customer);
  const customData = asRecord(data.custom_data);
  const candidates: unknown[] = [
    data.email,
    customer?.email,
    customData?.email,
  ];

  for (const candidate of candidates) {
    const value = readString(candidate);
    if (value) return value;
  }
  return null;
}

export function mapDeactivationStatus(eventType: string): string {
  if (eventType === "subscription.expired") return "expired";
  if (eventType === "subscription.paused") return "paused";
  return "canceled";
}
