import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { useIsFocused } from "@react-navigation/native";

/**
 * Hook to prevent screen capture on sensitive screens.
 * Automatically enables protection when screen is focused
 * and disables it when screen loses focus.
 */
export function useProtectScreen() {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      ScreenCapture.preventScreenCaptureAsync();
    } else {
      ScreenCapture.allowScreenCaptureAsync();
    }

    return () => {
      // Cleanup on unmount
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, [isFocused]);
}
