import React from "react";
import {
  StyleSheet,
  View,
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface EmptyStateProps {
  image?: ImageSourcePropType | null;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  imageStyle?: StyleProp<ImageStyle>;
  icon?: React.ReactNode;
}

export function EmptyState({
  image,
  title,
  subtitle,
  children,
  imageStyle,
  icon,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconContainer}>{icon}</View>
      ) : image ? (
        <Image
          source={image}
          style={[styles.image, imageStyle]}
          resizeMode="contain"
        />
      ) : null}
      <ThemedText type="h4" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  iconContainer: {
    marginBottom: Spacing["2xl"],
    opacity: 0.8,
  },
  image: {
    width: 160,
    height: 160,
    marginBottom: Spacing["2xl"],
    opacity: 0.8,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
});
