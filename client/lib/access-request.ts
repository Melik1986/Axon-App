import { useServerAccessStore } from "@/store/serverAccessStore";
import { getOrCreateDeviceId } from "@/lib/device-id";

export async function getHostedAccessHeaders(): Promise<
  Record<string, string>
> {
  const state = useServerAccessStore.getState();
  if (!state.isConfigured || state.mode !== "hosted") {
    return {};
  }

  const licenseKey = state.licenseKey.trim();
  if (!licenseKey) {
    return {};
  }

  const deviceId = await getOrCreateDeviceId();
  return {
    "X-License-Key": licenseKey,
    "X-Device-Id": deviceId,
  };
}

export async function appendHostedAccessHeaders(
  headers: Headers,
): Promise<void> {
  const accessHeaders = await getHostedAccessHeaders();
  const entries = Object.entries(accessHeaders);
  for (const [headerName, headerValue] of entries) {
    if (!headers.has(headerName)) {
      headers.set(headerName, headerValue);
    }
  }
}

export async function fetchWithAccessHeaders(
  input: string | URL | RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  await appendHostedAccessHeaders(headers);
  return fetch(input, { ...init, headers });
}
