import { create } from "zustand";
import { localStore, type LocalSkill } from "@/lib/local-store";
import { AppLogger } from "@/lib/logger";

interface SkillsState {
  skills: LocalSkill[];
  isLoading: boolean;

  loadSkills: () => Promise<void>;
  createSkill: (skill: {
    name: string;
    description?: string;
    code: string;
    inputSchema?: string;
    outputSchema?: string;
  }) => Promise<LocalSkill>;
  updateSkill: (
    id: string,
    updates: Partial<
      Pick<
        LocalSkill,
        | "name"
        | "description"
        | "code"
        | "inputSchema"
        | "outputSchema"
        | "enabled"
      >
    >,
  ) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  toggleSkill: (id: string) => Promise<void>;
  /** Returns only enabled skills (for chat payload) */
  getEnabledSkills: () => Promise<LocalSkill[]>;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  isLoading: false,

  loadSkills: async () => {
    try {
      set({ isLoading: true });
      const skills = await localStore.listSkills();
      set({ skills });
    } catch (e) {
      AppLogger.error("loadSkills failed", e);
    } finally {
      set({ isLoading: false });
    }
  },

  createSkill: async (skill) => {
    const created = await localStore.createSkill(skill);
    set((s) => ({ skills: [...s.skills, created] }));
    return created;
  },

  updateSkill: async (id, updates) => {
    await localStore.updateSkill(id, updates);
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...updates } : sk)),
    }));
  },

  deleteSkill: async (id) => {
    await localStore.deleteSkill(id);
    set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) }));
  },

  toggleSkill: async (id) => {
    const skill = get().skills.find((sk) => sk.id === id);
    if (!skill) return;
    const newEnabled = skill.enabled ? 0 : 1;
    await localStore.updateSkill(id, { enabled: newEnabled });
    set((s) => ({
      skills: s.skills.map((sk) =>
        sk.id === id ? { ...sk, enabled: newEnabled } : sk,
      ),
    }));
  },

  getEnabledSkills: async () => {
    return localStore.getEnabledSkills();
  },
}));
