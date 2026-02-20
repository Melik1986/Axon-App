import { ExpoConfig, ConfigContext } from "expo/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "app.json"), "utf8"),
) as { expo: ExpoConfig };

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = appJson.expo || config;
  const isProd = process.env.NODE_ENV === "production";
  const allowCleartextDev =
    !isProd && process.env.AXON_ALLOW_CLEARTEXT_DEV === "true";
  const androidConfig = {
    ...(base.android || {}),
    usesCleartextTraffic: allowCleartextDev,
  } as ExpoConfig["android"];

  return {
    ...base,
    android: androidConfig,
  };
};
