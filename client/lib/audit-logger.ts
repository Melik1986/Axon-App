import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppLogger } from "./logger";

export type SecurityEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "SETTINGS_ACCESS"
  | "MIGRATION_SUCCESS"
  | "MIGRATION_FAILURE"
  | "SECURE_STORE_ERROR";

export interface SecurityEvent {
  id: string;
  timestamp: number;
  event: SecurityEventType;
  details?: string;
  deviceId?: string;
}

const AUDIT_LOG_KEY = "axon-audit-log";
const MAX_LOG_SIZE = 50;

export const AuditService = {
  /**
   * Log a security event
   */
  logEvent: async (
    event: SecurityEventType,
    details?: string,
  ): Promise<void> => {
    try {
      const newLog: SecurityEvent = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        event,
        details,
      };

      // Get existing logs
      const existingLogsStr = await AsyncStorage.getItem(AUDIT_LOG_KEY);
      let logs: SecurityEvent[] = [];
      if (existingLogsStr) {
        try {
          logs = JSON.parse(existingLogsStr);
        } catch {
          // Ignore parse error
        }
      }

      // Add new log and trim
      logs.unshift(newLog);
      if (logs.length > MAX_LOG_SIZE) {
        logs = logs.slice(0, MAX_LOG_SIZE);
      }

      await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));

      // Also log to console for dev
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log(`[SecurityAudit] ${event}: ${details || ""}`);
      }
    } catch (error) {
      AppLogger.error("Failed to write audit log", error);
    }
  },

  /**
   * Get all security logs
   */
  getLogs: async (): Promise<SecurityEvent[]> => {
    try {
      const logsStr = await AsyncStorage.getItem(AUDIT_LOG_KEY);
      if (!logsStr) return [];
      return JSON.parse(logsStr);
    } catch {
      return [];
    }
  },

  /**
   * Clear audit logs
   */
  clearLogs: async (): Promise<void> => {
    await AsyncStorage.removeItem(AUDIT_LOG_KEY);
  },
};
