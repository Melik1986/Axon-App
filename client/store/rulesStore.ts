import { create } from "zustand";
import { localStore, type LocalRule } from "@/lib/local-store";
import { AppLogger } from "@/lib/logger";

interface RulesState {
  rules: LocalRule[];
  isLoading: boolean;

  loadRules: () => Promise<void>;
  createRule: (rule: {
    name: string;
    description?: string;
    condition: string;
    action: string;
    message?: string;
    priority?: number;
  }) => Promise<LocalRule>;
  updateRule: (
    id: string,
    updates: Partial<
      Pick<
        LocalRule,
        | "name"
        | "description"
        | "condition"
        | "action"
        | "message"
        | "priority"
        | "enabled"
      >
    >,
  ) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  /** Returns only enabled rules (for chat payload) */
  getActiveRules: () => Promise<LocalRule[]>;
}

export const useRulesStore = create<RulesState>((set, get) => ({
  rules: [],
  isLoading: false,

  loadRules: async () => {
    try {
      set({ isLoading: true });
      const rules = await localStore.listRules();
      set({ rules });
    } catch (e) {
      AppLogger.error("loadRules failed", e);
    } finally {
      set({ isLoading: false });
    }
  },

  createRule: async (rule) => {
    const created = await localStore.createRule(rule);
    set((s) => ({ rules: [...s.rules, created] }));
    return created;
  },

  updateRule: async (id, updates) => {
    await localStore.updateRule(id, updates);
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  },

  deleteRule: async (id) => {
    await localStore.deleteRule(id);
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },

  toggleRule: async (id) => {
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const newEnabled = rule.enabled ? 0 : 1;
    await localStore.updateRule(id, { enabled: newEnabled });
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === id ? { ...r, enabled: newEnabled } : r,
      ),
    }));
  },

  getActiveRules: async () => {
    return localStore.getActiveRules();
  },
}));
