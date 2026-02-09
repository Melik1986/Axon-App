import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSkillsStore } from "@/store/skillsStore";
import { AppLogger } from "@/lib/logger";

interface Skill {
  id: string;
  name: string;
  description: string | null;
  code: string;
  enabled: boolean;
}

export default function SkillStoreScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const {
    skills: rawSkills,
    isLoading: loading,
    loadSkills,
    createSkill: storeCreateSkill,
    toggleSkill: storeToggleSkill,
    deleteSkill: storeDeleteSkill,
  } = useSkillsStore();
  const skills: Skill[] = rawSkills.map((s) => ({
    ...s,
    enabled: !!s.enabled,
  }));
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState(
    "result = { success: true, message: 'Hello from skill' };",
  );

  useEffect(() => {
    void loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddSkill = async () => {
    if (!name || !code) {
      Alert.alert(t("error"), t("configurationRequired"));
      return;
    }

    try {
      await storeCreateSkill({ name, description, code });
      setIsAdding(false);
      setName("");
      setDescription("");
    } catch (error) {
      AppLogger.error("Failed to add skill:", error);
    }
  };

  const toggleSkill = async (skill: Skill) => {
    try {
      await storeToggleSkill(skill.id);
    } catch (error) {
      AppLogger.error("Failed to toggle skill:", error);
    }
  };

  const deleteSkill = async (id: string) => {
    Alert.alert(t("delete"), t("deleteDocumentConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await storeDeleteSkill(id);
          } catch (error) {
            AppLogger.error("Failed to delete skill:", error);
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t("skillStore")}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("skillStoreDesc")}
          </ThemedText>
        </View>

        {!isAdding ? (
          <Button
            onPress={() => setIsAdding(true)}
            variant="outline"
            style={styles.addBtn}
          >
            {t("createNewSkill")}
          </Button>
        ) : (
          <View
            style={[
              styles.form,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText style={styles.formTitle}>{t("newSkill")}</ThemedText>

            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder={t("skillName")}
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder={t("description")}
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
            />

            <ThemedText style={styles.label}>{t("code")}</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: theme.text, borderColor: theme.border },
              ]}
              multiline
              value={code}
              onChangeText={setCode}
            />

            <View style={styles.formRow}>
              <Button onPress={() => setIsAdding(false)} variant="outline">
                {t("cancel")}
              </Button>
              <Button onPress={handleAddSkill}>{t("saveSkill")}</Button>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={{ marginTop: 20 }}
          />
        ) : (
          <View style={styles.list}>
            {skills.map((skill) => (
              <View
                key={skill.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.cardName}>
                      {skill.name}
                    </ThemedText>
                    <ThemedText
                      style={[styles.cardDesc, { color: theme.textSecondary }]}
                    >
                      {skill.description}
                    </ThemedText>
                  </View>
                  <Switch
                    value={skill.enabled}
                    onValueChange={() => toggleSkill(skill)}
                    trackColor={{ true: theme.primary }}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <ThemedText
                    style={{
                      fontSize: 10,
                      color: theme.textTertiary,
                      fontFamily: "monospace",
                    }}
                  >
                    ID: {skill.id.split("-")[0]}
                  </ThemedText>
                  <Pressable onPress={() => deleteSkill(skill.id)}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.error}
                    />
                  </Pressable>
                </View>
              </View>
            ))}

            {skills.length === 0 && !isAdding && (
              <View style={styles.empty}>
                <ThemedText style={{ color: theme.textTertiary }}>
                  {t("noSkillsYet")}
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addBtn: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  form: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    fontFamily: "monospace",
    fontSize: 12,
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  list: {
    padding: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  empty: {
    alignItems: "center",
    marginTop: 40,
  },
});
