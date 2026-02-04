import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";

interface McpServer {
  name: string;
  command: string;
  args: string[];
  status?: "connected" | "disconnected" | "error";
}

export default function MCPServersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [servers, setServers] = useState<McpServer[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState("");
  const [command, setCommand] = useState("npx");
  const [args, setArgs] = useState(
    "-y @modelcontextprotocol/server-everything",
  );

  const fetchServers = async () => {
    // Mock for now
    setServers([
      {
        name: "1C-ERP",
        command: "npx",
        args: ["-y", "@axon/mcp-1c"],
        status: "connected",
      },
    ]);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleAddServer = () => {
    const newServer: McpServer = {
      name,
      command,
      args: args.split(" "),
      status: "disconnected",
    };
    setServers([...servers, newServer]);
    setIsAdding(false);
    setName("");
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
          <ThemedText style={styles.title}>{t("mcpServers")}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("mcpServersDesc")}
          </ThemedText>
        </View>

        {!isAdding ? (
          <Button
            onPress={() => setIsAdding(true)}
            variant="outline"
            style={styles.addBtn}
          >
            {t("connectNewServer")}
          </Button>
        ) : (
          <View
            style={[
              styles.form,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText style={styles.formTitle}>
              {t("connectMcpServer")}
            </ThemedText>

            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder={t("serverName")}
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              placeholder={t("command")}
              placeholderTextColor={theme.textTertiary}
              value={command}
              onChangeText={setCommand}
            />

            <ThemedText style={styles.label}>{t("arguments")}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              value={args}
              onChangeText={setArgs}
            />

            <View style={styles.formRow}>
              <Button onPress={() => setIsAdding(false)} variant="outline">
                {t("cancel")}
              </Button>
              <Button onPress={handleAddServer}>{t("connect")}</Button>
            </View>
          </View>
        )}

        <View style={styles.list}>
          {servers.map((server, index) => (
            <View
              key={index}
              style={[
                styles.card,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.cardName}>{server.name}</ThemedText>
                  <ThemedText
                    style={[styles.cardDesc, { color: theme.textSecondary }]}
                  >
                    {server.command} {server.args.join(" ")}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        server.status === "connected" ? "#22c55e" : "#94a3b8",
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
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
    fontSize: 12,
    marginTop: 2,
    fontFamily: "monospace",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: Spacing.md,
  },
});
