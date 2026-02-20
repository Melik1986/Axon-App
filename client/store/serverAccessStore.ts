import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createHybridStorage,
  SERVER_ACCESS_HIGH_SEC_PATHS,
  SERVER_ACCESS_STD_PATHS,
} from "@/lib/secure-settings-storage";

export type ServerMode = "hosted" | "self_hosted";

export const DEFAULT_HOSTED_BASE_URL = (() => {
  const configured = process.env.EXPO_PUBLIC_HOSTED_BASE_URL?.trim();
  return configured && configured.length > 0
    ? configured
    : "https://axon-ai.replit.app";
})();

export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Server URL is required");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return new URL(withProtocol).origin;
}

interface ConfigureHostedInput {
  licenseKey: string;
  deviceId: string;
  hostedUrl?: string;
}

interface ConfigureSelfHostedInput {
  selfHostedUrl: string;
  deviceId?: string;
}

export interface ServerAccessState {
  mode: ServerMode;
  hostedUrl: string;
  selfHostedUrl: string;
  licenseKey: string;
  deviceId: string;
  isConfigured: boolean;
  setDeviceId: (deviceId: string) => void;
  configureHosted: (input: ConfigureHostedInput) => void;
  configureSelfHosted: (input: ConfigureSelfHostedInput) => void;
  resetServerAccess: () => void;
}

const defaultState: Pick<
  ServerAccessState,
  | "mode"
  | "hostedUrl"
  | "selfHostedUrl"
  | "licenseKey"
  | "deviceId"
  | "isConfigured"
> = {
  mode: "hosted",
  hostedUrl: DEFAULT_HOSTED_BASE_URL,
  selfHostedUrl: "",
  licenseKey: "",
  deviceId: "",
  isConfigured: false,
};

export const useServerAccessStore = create<ServerAccessState>()(
  persist(
    (set) => ({
      ...defaultState,
      setDeviceId: (deviceId: string) => set({ deviceId }),
      configureHosted: (input: ConfigureHostedInput) =>
        set(() => ({
          mode: "hosted",
          hostedUrl: normalizeServerUrl(
            input.hostedUrl || DEFAULT_HOSTED_BASE_URL,
          ),
          selfHostedUrl: "",
          licenseKey: input.licenseKey.trim(),
          deviceId: input.deviceId,
          isConfigured: true,
        })),
      configureSelfHosted: (input: ConfigureSelfHostedInput) =>
        set((state) => ({
          mode: "self_hosted",
          selfHostedUrl: normalizeServerUrl(input.selfHostedUrl),
          licenseKey: "",
          deviceId: input.deviceId || state.deviceId,
          isConfigured: true,
        })),
      resetServerAccess: () =>
        set({
          ...defaultState,
        }),
    }),
    {
      name: "axon-server-access",
      storage: createJSONStorage(() =>
        createHybridStorage(
          "axon-server-access",
          SERVER_ACCESS_STD_PATHS,
          "axon-server-access-secrets",
          SERVER_ACCESS_HIGH_SEC_PATHS,
          "axon-server-access-high-sec",
        ),
      ),
    },
  ),
);
