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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useRulesStore } from "@/store/rulesStore";
import { localVectorStore } from "@/lib/local-rag/vector-store";
import { AppLogger } from "@/lib/logger";
import type { LocalRule } from "@/lib/local-store";
import type { LocalDocument } from "@/lib/local-rag/vector-store";

type Rule = Omit<LocalRule, "enabled"> & { enabled: boolean };
type Document = LocalDocument;

export default function RulebookScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { rules: rawRules, isLoading: loading, loadRules } = useRulesStore();
  const rules: Rule[] = rawRules.map((r) => ({ ...r, enabled: !!r.enabled }));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // New rule form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState(
    '{"tool": "create_invoice", "field": "quantity", "operator": "<", "value": 0}',
  );
  const [action, setAction] = useState<
    "reject" | "warn" | "require_confirmation"
  >("reject");
  const [message, setMessage] = useState("Quantity cannot be negative");

  const fetchData = async () => {
    await loadRules();
    try {
      const docs = await localVectorStore.listAll();
      setDocuments(docs);
    } catch (error) {
      AppLogger.error("Failed to fetch docs:", error);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    createRule: storeCreateRule,
    toggleRule: storeToggleRule,
    deleteRule: storeDeleteRule,
  } = useRulesStore();

  const handleAddRule = async () => {
    if (!name || !condition) {
      Alert.alert(t("error"), t("configurationRequired"));
      return;
    }

    try {
      await storeCreateRule({ name, description, condition, action, message });
      setIsAdding(false);
      setName("");
      setDescription("");
    } catch (error) {
      AppLogger.error("Failed to add rule:", error);
      Alert.alert(t("error"), "Failed to save rule");
    }
  };

  const toggleRule = async (rule: Rule) => {
    try {
      await storeToggleRule(rule.id);
    } catch (error) {
      AppLogger.error("Failed to toggle rule:", error);
    }
  };

  const deleteRule = async (id: string) => {
    Alert.alert(t("delete"), t("deleteRuleConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await storeDeleteRule(id);
          } catch (error) {
            AppLogger.error("Failed to delete rule:", error);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t("agentRules")}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("agentRulesDesc")}
          </ThemedText>
        </View>

        {!isAdding ? (
          <Button
            onPress={() => setIsAdding(true)}
            variant="outline"
            style={styles.addBtn}
          >
            {t("addNewRule")}
          </Button>
        ) : (
          <View
            style={[
              styles.form,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText style={styles.formTitle}>{t("newRule")}</ThemedText>

            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder={t("ruleNamePlaceholder")}
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

            <ThemedText style={styles.label}>{t("action")}</ThemedText>
            <View style={styles.actionRow}>
              {(["reject", "warn", "require_confirmation"] as const).map(
                (a) => (
                  <Pressable
                    key={a}
                    onPress={() => setAction(a)}
                    style={[
                      styles.actionChip,
                      {
                        backgroundColor:
                          action === a
                            ? theme.primary
                            : theme.backgroundTertiary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        color: action === a ? theme.buttonText : theme.text,
                        fontSize: 12,
                      }}
                    >
                      {a.replace("_", " ")}
                    </ThemedText>
                  </Pressable>
                ),
              )}
            </View>

            <ThemedText style={styles.label}>{t("messageToUser")}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder={t("messagePlaceholder")}
              placeholderTextColor={theme.textTertiary}
              value={message}
              onChangeText={setMessage}
            />

            <ThemedText style={styles.label}>{t("conditionJson")}</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: theme.text, borderColor: theme.border },
              ]}
              multiline
              value={condition}
              onChangeText={setCondition}
            />

            <View style={styles.formRow}>
              <Button onPress={() => setIsAdding(false)} variant="outline">
                {t("cancel")}
              </Button>
              <Button onPress={handleAddRule}>{t("saveRule")}</Button>
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
          <View style={styles.ruleList}>
            {rules.map((rule) => (
              <View
                key={rule.id}
                style={[
                  styles.ruleCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <View style={styles.ruleHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.ruleName}>{rule.name}</ThemedText>
                    <ThemedText
                      style={[styles.ruleDesc, { color: theme.textSecondary }]}
                    >
                      {rule.description}
                    </ThemedText>
                  </View>
                  <Switch
                    value={rule.enabled}
                    onValueChange={() => toggleRule(rule)}
                    trackColor={{ true: theme.primary }}
                  />
                </View>

                <View style={styles.ruleMeta}>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          rule.action === "reject" ? "#fee2e2" : "#fef3c7",
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        color: rule.action === "reject" ? "#991b1b" : "#92400e",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {rule.action.toUpperCase()}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => deleteRule(rule.id)}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.error}
                    />
                  </Pressable>
                </View>
              </View>
            ))}

            {rules.length === 0 && !isAdding && (
              <View style={styles.empty}>
                <ThemedText style={{ color: theme.textTertiary }}>
                  {t("noRulesYet")}
                </ThemedText>
              </View>
            )}

            {/* Document Rules Section */}
            {documents.length > 0 && (
              <View style={{ marginTop: Spacing.xl }}>
                <ThemedText
                  type="h4"
                  style={{
                    marginBottom: Spacing.md,
                    paddingHorizontal: Spacing.xs,
                  }}
                >
                  {t("documents")}
                </ThemedText>
                {documents.map((doc) => (
                  <View
                    key={doc.id}
                    style={[
                      styles.ruleCard,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        opacity: 0.8,
                      },
                    ]}
                  >
                    <View style={styles.ruleHeader}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={16}
                            color={theme.text}
                          />
                          <ThemedText style={styles.ruleName}>
                            {doc.name}
                          </ThemedText>
                        </View>
                        <ThemedText
                          style={[
                            styles.ruleDesc,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {((doc.metadata as Record<string, unknown>)
                            ?.type as string) ?? "document"}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    fontFamily: "monospace",
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  ruleList: {
    padding: Spacing.lg,
  },
  ruleCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  ruleName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  ruleDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  ruleMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  empty: {
    alignItems: "center",
    marginTop: 40,
  },
});
