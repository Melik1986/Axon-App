import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  WithSpringConfig,
} from "react-native-reanimated";

import { AnimatedMicIcon, AnimatedStopIcon } from "@/components/AnimatedIcons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface VoiceButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
};

export function VoiceButton({
  isRecording,
  onPress,
  disabled,
  size = Spacing.fabSize,
}: VoiceButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: isRecording ? 0.4 : 0,
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.92, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const iconSize = size * 0.6;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: theme.primary,
            width: size + 24,
            height: size + 24,
            borderRadius: (size + 24) / 2,
          },
          pulseStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          animatedStyle,
          disabled && styles.disabled,
          isRecording && { backgroundColor: theme.error + "15" },
        ]}
      >
        <Pressable
          style={styles.pressable}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
        >
          {isRecording ? (
            <AnimatedStopIcon size={iconSize} color={theme.error} />
          ) : (
            <AnimatedMicIcon size={iconSize} color={theme.primary} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
