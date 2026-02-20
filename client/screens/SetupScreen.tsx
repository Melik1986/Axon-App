import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { fetchWithAccessHeaders } from "@/lib/access-request";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { AppLogger } from "@/lib/logger";
import {
  DEFAULT_HOSTED_BASE_URL,
  normalizeServerUrl,
  useServerAccessStore,
} from "@/store/serverAccessStore";

type SetupMode = "hosted" | "self_hosted";

interface LicenseValidateResponse {
  valid?: boolean;
  message?: string;
  reason?: string;
}

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  const [mode, setMode] = useState<SetupMode>("hosted");
  const [licenseKey, setLicenseKey] = useState("");
  const [selfHostedUrl, setSelfHostedUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const configuredHostedUrl = useServerAccessStore((state) => state.hostedUrl);
  const configureHosted = useServerAccessStore(
    (state) => state.configureHosted,
  );
  const configureSelfHosted = useServerAccessStore(
    (state) => state.configureSelfHosted,
  );

  const hostedUrl = useMemo(() => {
    const fromStore = configuredHostedUrl?.trim();
    if (fromStore && fromStore.length > 0) {
      return fromStore;
    }
    return DEFAULT_HOSTED_BASE_URL;
  }, [configuredHostedUrl]);

  const handleHostedSetup = async (): Promise<void> => {
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) {
      Alert.alert(t("error"), t("setupLicenseRequired"));
      return;
    }

    let normalizedHostedUrl: string;
    try {
      normalizedHostedUrl = normalizeServerUrl(hostedUrl);
    } catch {
      Alert.alert(t("error"), t("setupInvalidUrl"));
      return;
    }

    const deviceId = await getOrCreateDeviceId();
    const validateUrl = new URL("/api/license/validate", normalizedHostedUrl)
      .href;

    const response = await fetchWithAccessHeaders(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: trimmedKey,
        deviceId,
      }),
    });

    let payload: LicenseValidateResponse | null = null;
    try {
      payload = (await response.json()) as LicenseValidateResponse;
    } catch {
      payload = null;
    }

    const isValid = response.ok && payload?.valid !== false;
    if (!isValid) {
      const fallbackMessage = t("setupValidationFailed");
      const message =
        payload?.message?.trim() || payload?.reason?.trim() || fallbackMessage;
      Alert.alert(t("error"), message);
      return;
    }

    configureHosted({
      licenseKey: trimmedKey,
      hostedUrl: normalizedHostedUrl,
      deviceId,
    });
  };

  const handleSelfHostedSetup = async (): Promise<void> => {
    let normalizedSelfHostedUrl: string;
    try {
      normalizedSelfHostedUrl = normalizeServerUrl(selfHostedUrl);
    } catch {
      Alert.alert(t("error"), t("setupInvalidUrl"));
      return;
    }

    const healthUrl = new URL("/health", normalizedSelfHostedUrl).href;
    const response = await fetchWithAccessHeaders(healthUrl, { method: "GET" });
    if (!response.ok) {
      Alert.alert(t("error"), t("setupHealthCheckFailed"));
      return;
    }

    const deviceId = await getOrCreateDeviceId();
    configureSelfHosted({
      selfHostedUrl: normalizedSelfHostedUrl,
      deviceId,
    });
  };

  const handleContinue = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      if (mode === "hosted") {
        await handleHostedSetup();
      } else {
        await handleSelfHostedSetup();
      }
    } catch (error) {
      AppLogger.error("Setup failed", error);
      Alert.alert(t("error"), t("setupValidationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#0A0E1A", "#1A1F2E", "#0A0E1A"]
          : ["#F8FAFC", "#E2E8F0", "#F8FAFC"]
      }
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + Spacing.xl,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>{t("setupTitle")}</ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {t("setupSubtitle")}
            </ThemedText>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode("hosted")}
              style={[
                styles.modeButton,
                {
                  borderColor: mode === "hosted" ? theme.primary : theme.border,
                  backgroundColor:
                    mode === "hosted"
                      ? `${theme.primary}20`
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText>{t("setupHostedMode")}</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setMode("self_hosted")}
              style={[
                styles.modeButton,
                {
                  borderColor:
                    mode === "self_hosted" ? theme.primary : theme.border,
                  backgroundColor:
                    mode === "self_hosted"
                      ? `${theme.primary}20`
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText>{t("setupSelfHostedMode")}</ThemedText>
            </Pressable>
          </View>

          {mode === "hosted" ? (
            <View style={styles.section}>
              <ThemedText
                style={[styles.helper, { color: theme.textSecondary }]}
              >
                {t("setupHostedHint")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t("setupLicenseKey")}
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                value={licenseKey}
                onChangeText={setLicenseKey}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <ThemedText
                style={[styles.helper, { color: theme.textSecondary }]}
              >
                {t("setupSelfHostedHint")}
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t("setupServerUrl")}
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={selfHostedUrl}
                onChangeText={setSelfHostedUrl}
              />
            </View>
          )}

          <Button onPress={handleContinue} disabled={isSubmitting}>
            {isSubmitting ? t("setupValidating") : t("setupContinue")}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
  },
  modeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
});
