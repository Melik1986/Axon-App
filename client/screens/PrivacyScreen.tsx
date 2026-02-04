import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing } from "@/constants/theme";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <ThemedText type="h2" style={styles.title}>
        {t("privacyPolicy")}
      </ThemedText>
      <ThemedText style={styles.text}>{t("privacyIntro")}</ThemedText>
      <ThemedText type="h4" style={styles.sectionTitle}>
        {t("dataCollection")}
      </ThemedText>
      <ThemedText style={styles.text}>{t("dataCollectionDesc")}</ThemedText>
      <ThemedText style={[styles.text, { marginTop: Spacing.xl }]}>
        {t("privacyPolicyFull")}
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});
