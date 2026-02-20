import { License } from "../../../../shared/schema";

export interface LicenseValidationResult {
  valid: boolean;
  statusCode: number;
  message: string;
  code: string;
  details?: Record<string, unknown>;
  license?: License;
}

export interface PaddleWebhookPayload {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
}

export type PaddleAction =
  | "activated"
  | "updated"
  | "deactivated"
  | "ignored"
  | "duplicate";

export interface PaddleWebhookResult {
  ok: true;
  eventId: string;
  eventType: string;
  action: PaddleAction;
}

export class LicenseHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "LicenseHttpError";
  }
}
