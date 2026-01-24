import React from "react";
import { StyleSheet, View, Image, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { SettingsItem } from "@/components/SettingsItem";
import { useSettingsStore } from "@/store/settingsStore";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();

  const { llm, erp, voice } = useSettingsStore();

  const getLLMProviderLabel = () => {
    switch (llm.provider) {
      case "replit":
        return "Replit AI";
      case "openai":
        return "OpenAI";
      case "ollama":
        return "Ollama (Local)";
      case "groq":
        return "Groq";
      default:
        return "Custom";
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.dark.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={require("../../assets/images/avatar-default.png")}
            style={styles.avatar}
          />
          <Pressable style={styles.editAvatarButton}>
            <Feather name="edit-2" size={14} color={Colors.dark.buttonText} />
          </Pressable>
        </View>
        <ThemedText type="h3" style={styles.userName}>
          User
        </ThemedText>
        <ThemedText style={styles.userSubtitle}>
          JSRVIS Enterprise
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>AI Settings</ThemedText>
        <SettingsItem
          icon="cpu"
          title="LLM Provider"
          value={getLLMProviderLabel()}
          onPress={() => navigation.navigate("Modal")}
        />
        <SettingsItem
          icon="terminal"
          title="Model"
          value={llm.modelName || "gpt-5.1"}
          onPress={() => navigation.navigate("Modal")}
        />
        <SettingsItem
          icon="volume-2"
          title="Voice"
          value={voice}
          onPress={() => navigation.navigate("Modal")}
        />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>ERP Connection</ThemedText>
        <SettingsItem
          icon="link"
          title="System URL"
          subtitle={erp.url || "Not configured"}
          onPress={() => navigation.navigate("Modal")}
        />
        <SettingsItem
          icon="code"
          title="API Type"
          value={erp.apiType.toUpperCase()}
          onPress={() => navigation.navigate("Modal")}
        />
        <SettingsItem
          icon="file-text"
          title="API Specification"
          subtitle={erp.specUrl || "Not configured"}
          onPress={() => navigation.navigate("Modal")}
        />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
        <SettingsItem
          icon="globe"
          title="Language"
          value="Russian"
          onPress={() => navigation.navigate("Modal")}
        />
        <SettingsItem
          icon="moon"
          title="Theme"
          value="Dark"
          showChevron={false}
        />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>About</ThemedText>
        <SettingsItem
          icon="info"
          title="Version"
          value="1.0.0"
          showChevron={false}
        />
        <SettingsItem
          icon="help-circle"
          title="Help & Support"
          onPress={() => {}}
        />
        <SettingsItem
          icon="shield"
          title="Privacy Policy"
          onPress={() => {}}
        />
      </View>

      <Pressable style={styles.logoutButton}>
        <Feather name="log-out" size={20} color={Colors.dark.error} />
        <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  avatarContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.dark.backgroundRoot,
  },
  userName: {
    marginBottom: Spacing.xs,
  },
  userSubtitle: {
    color: Colors.dark.textSecondary,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.dark.error + "15",
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  logoutText: {
    color: Colors.dark.error,
    fontSize: 16,
    fontWeight: "600",
  },
});
