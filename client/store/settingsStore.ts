import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface LLMSettings {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  provider: "replit" | "openai" | "ollama" | "groq" | "custom";
}

interface ERPSettings {
  url: string;
  apiType: "rest" | "odata" | "graphql";
  apiKey: string;
  specUrl: string;
  preset: string;
}

interface SettingsState {
  llm: LLMSettings;
  erp: ERPSettings;
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  language: string;
  setLLMSettings: (settings: Partial<LLMSettings>) => void;
  setERPSettings: (settings: Partial<ERPSettings>) => void;
  setVoice: (voice: SettingsState["voice"]) => void;
  setLanguage: (language: string) => void;
  resetToDefaults: () => void;
}

const defaultLLM: LLMSettings = {
  baseUrl: "",
  apiKey: "",
  modelName: "gpt-5.1",
  provider: "replit",
};

const defaultERP: ERPSettings = {
  url: "",
  apiType: "rest",
  apiKey: "",
  specUrl: "",
  preset: "",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      llm: defaultLLM,
      erp: defaultERP,
      voice: "alloy",
      language: "ru",
      setLLMSettings: (settings) =>
        set((state) => ({ llm: { ...state.llm, ...settings } })),
      setERPSettings: (settings) =>
        set((state) => ({ erp: { ...state.erp, ...settings } })),
      setVoice: (voice) => set({ voice }),
      setLanguage: (language) => set({ language }),
      resetToDefaults: () =>
        set({ llm: defaultLLM, erp: defaultERP, voice: "alloy", language: "ru" }),
    }),
    {
      name: "jsrvis-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
