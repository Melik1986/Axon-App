import * as Crypto from "expo-crypto";
import { useServerAccessStore } from "@/store/serverAccessStore";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function generateDeviceId(): string {
  const bytes = Crypto.getRandomBytes(16);
  return `axon-${bytesToHex(bytes)}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = useServerAccessStore.getState().deviceId;
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const generated = generateDeviceId();
  useServerAccessStore.getState().setDeviceId(generated);
  return generated;
}
