import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  replitId?: string | null;
}

export interface EphemeralCredentials {
  llmKey?: string;
  llmProvider?: string;
  llmBaseUrl?: string;
  dbUrl?: string;
  dbKey?: string;
  erpProvider?: string;
  erpBaseUrl?: string;
  erpApiType?: string;
  erpDb?: string;
  erpUsername?: string;
  erpPassword?: string;
  erpApiKey?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  ephemeralCredentials?: EphemeralCredentials;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
