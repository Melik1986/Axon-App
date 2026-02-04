import { useState, useEffect, useCallback, useRef } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLogger } from "@/lib/logger";
import { AuditService } from "@/lib/audit-logger";

interface BiometricAuthResult {
  isUnlocked: boolean;
  isAuthenticating: boolean;
  biometricAvailable: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
}

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to require biometric authentication for a screen.
 * Implements Fallback, Audit Logging, and Session Timeout.
 */
export function useBiometricAuth(
  promptMessage: string = "Подтвердите личность для доступа к настройкам",
): BiometricAuthResult {
  const [isUnlocked, setIsUnlocked] = useState(Platform.OS === "web");
  const [isAuthenticating, setIsAuthenticating] = useState(
    Platform.OS !== "web",
  );
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const authenticate = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsUnlocked(true);
      setIsAuthenticating(false);
      return;
    }

    try {
      setIsAuthenticating(true);
      setError(null);

      // 1. Check security level (Biometrics OR Passcode)
      const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
      const isSecured =
        enrolledLevel !== LocalAuthentication.SecurityLevel.NONE;

      setBiometricAvailable(isSecured);

      if (!isSecured) {
        AppLogger.warn("Device not secured, falling back to unlocked");
        setIsUnlocked(true);
        setIsAuthenticating(false);
        // Fallback Alert
        Alert.alert(
          "⚠️ Устройство не защищено",
          "На устройстве не установлен пароль или биометрия. Настройки не защищены.",
        );
        return;
      }

      // 2. Authenticate (Biometrics with Passcode Fallback)
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Использовать пароль устройства",
        disableDeviceFallback: false,
        cancelLabel: "Отмена",
      });

      if (result.success) {
        setIsUnlocked(true);
        AuditService.logEvent("AUTH_SUCCESS", "Biometric auth passed");
      } else {
        setError("Ошибка аутентификации");
        AuditService.logEvent("AUTH_FAILURE", result.error || "Unknown error");

        Alert.alert("Доступ отклонен", "Не удалось подтвердить личность", [
          {
            text: "Назад",
            onPress: () => navigation.goBack(),
            style: "cancel",
          },
          {
            text: "Попробовать снова",
            onPress: () => {
              authenticate();
            },
          },
        ]);
      }
    } catch (e) {
      AppLogger.error("Biometric authentication error:", e);
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
      setIsUnlocked(true); // Fail open on system error to prevent lockout
      AuditService.logEvent("AUTH_FAILURE", "System error");
    } finally {
      setIsAuthenticating(false);
    }
  }, [navigation, promptMessage]);

  // Initial Auth
  useEffect(() => {
    if (Platform.OS !== "web") {
      authenticate();
    }
  }, [authenticate]);

  // Session Timeout
  useEffect(() => {
    if (isUnlocked && Platform.OS !== "web") {
      timeoutRef.current = setTimeout(() => {
        Alert.alert(
          "Сессия истекла",
          "Экран настроек будет закрыт в целях безопасности",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
        setIsUnlocked(false);
      }, SESSION_TIMEOUT);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isUnlocked, navigation]);

  return {
    isUnlocked,
    isAuthenticating,
    biometricAvailable,
    error,
    authenticate,
  };
}
