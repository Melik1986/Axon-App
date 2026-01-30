import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import { Spacing, BorderRadius } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || "";
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || "";
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || "";

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const colors = theme;
  const { t } = useTranslation();
  const { signInWithGoogle, isLoading } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const clientId = Platform.select({
    ios: GOOGLE_CLIENT_ID_IOS,
    android: GOOGLE_CLIENT_ID_ANDROID,
    default: GOOGLE_CLIENT_ID_WEB,
  }) || GOOGLE_CLIENT_ID_WEB;

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "jsrvis",
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ["openid", "profile", "email"],
      responseType: "id_token",
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === "success") {
      setIsSigningIn(true);
      const { id_token } = response.params;
      
      if (id_token) {
        const result = await signInWithGoogle(id_token);
        if (!result.success) {
          Alert.alert(t("error"), result.error || t("authFailed"));
        }
      }
      setIsSigningIn(false);
    } else if (response?.type === "error") {
      Alert.alert(t("error"), response.error?.message || t("authFailed"));
    }
  };

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID_WEB && !GOOGLE_CLIENT_ID_IOS && !GOOGLE_CLIENT_ID_ANDROID) {
      Alert.alert(
        t("configurationRequired"),
        t("googleOAuthNotConfigured"),
        [{ text: "OK" }]
      );
      return;
    }
    
    try {
      await promptAsync();
    } catch (error) {
      console.error("Google sign in error:", error);
      Alert.alert(t("error"), t("authFailed"));
    }
  };

  const loading = isLoading || isSigningIn;

  const handleDevLogin = async () => {
    setIsSigningIn(true);
    const { setUser, setSession } = useAuthStore.getState();
    setUser({
      id: "dev-user-1",
      email: "dev@axon.local",
      name: "Dev User",
      picture: null,
      googleId: null,
    });
    setSession({
      accessToken: "dev-token",
      refreshToken: "dev-refresh-token",
      expiresIn: 3600,
      expiresAt: Date.now() + 3600 * 1000,
    });
    setIsSigningIn(false);
  };

  const isDev = __DEV__ || !GOOGLE_CLIENT_ID_WEB;

  return (
    <LinearGradient
      colors={isDark ? ["#0A0E1A", "#1A1F2E", "#0A0E1A"] : ["#F8FAFC", "#E2E8F0", "#F8FAFC"]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="cpu" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>AXON</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("appTagline")}
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="message-circle"
            title={t("smartAssistant")}
            description={t("smartAssistantDesc")}
            colors={colors}
          />
          <FeatureItem
            icon="mic"
            title={t("voiceCommands")}
            description={t("voiceCommandsDesc")}
            colors={colors}
          />
          <FeatureItem
            icon="database"
            title={t("erpIntegration")}
            description={t("erpIntegrationDesc")}
            colors={colors}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              { opacity: pressed ? 0.8 : 1 },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading || !request}
            testID="button-google-signin"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>{t("signInWithGoogle")}</Text>
              </>
            )}
          </Pressable>

          {isDev ? (
            <Pressable
              style={({ pressed }) => [
                styles.devButton,
                { opacity: pressed ? 0.8 : 1, backgroundColor: colors.primary },
              ]}
              onPress={handleDevLogin}
              disabled={loading}
              testID="button-dev-signin"
            >
              <Feather name="code" size={18} color="#FFF" />
              <Text style={styles.googleButtonText}>Continue as Dev User</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            {t("termsAgreement")}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function FeatureItem({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  colors: any;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: Spacing["3xl"],
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    maxWidth: 280,
  },
  features: {
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: "#FFF",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  termsText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
});
