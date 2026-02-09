/**
 * Local SQLite store for all user data (zero-storage policy).
 * Conversations, messages, rules, skills -- everything on the phone.
 */
import * as SQLite from "expo-sqlite";
import { AppLogger } from "./logger";

// ─── Types ───────────────────────────────────────────────────
export interface LocalConversation {
  id: string;
  title: string;
  createdAt: number;
}

export interface LocalMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  attachments: string | null; // JSON string
  metadata: string | null; // JSON string
  createdAt: number;
}

export interface LocalRule {
  id: string;
  name: string;
  description: string | null;
  condition: string;
  action: string;
  message: string | null;
  priority: number;
  enabled: number; // SQLite boolean: 0 | 1
  createdAt: number;
}

export interface LocalSkill {
  id: string;
  name: string;
  description: string | null;
  code: string;
  inputSchema: string | null;
  outputSchema: string | null;
  enabled: number; // SQLite boolean: 0 | 1
  createdAt: number;
}

// ─── Helpers ─────────────────────────────────────────────────
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Store ───────────────────────────────────────────────────
class LocalStore {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    try {
      this.db = await SQLite.openDatabaseAsync("axon_user.db");
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          attachments TEXT,
          metadata TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          condition TEXT NOT NULL,
          action TEXT NOT NULL,
          message TEXT,
          priority INTEGER DEFAULT 0,
          enabled INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS skills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          code TEXT NOT NULL,
          input_schema TEXT,
          output_schema TEXT,
          enabled INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation
          ON messages(conversation_id);
      `);
      AppLogger.info("LocalStore initialized", undefined, "LocalStore");
    } catch (error) {
      AppLogger.error("Failed to init LocalStore", error, "LocalStore");
    }
  }

  private async ensureDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }

  // ─── Conversations ──────────────────────────────────────────
  async createConversation(title: string): Promise<LocalConversation> {
    const db = await this.ensureDb();
    const conv: LocalConversation = {
      id: uuid(),
      title,
      createdAt: Date.now(),
    };
    await db.runAsync(
      "INSERT INTO conversations (id, title, created_at) VALUES (?, ?, ?)",
      [conv.id, conv.title, conv.createdAt],
    );
    return conv;
  }

  async listConversations(): Promise<LocalConversation[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<LocalConversation>(
      "SELECT id, title, created_at AS createdAt FROM conversations ORDER BY created_at DESC",
    );
  }

  async getConversation(id: string): Promise<LocalConversation | null> {
    const db = await this.ensureDb();
    return (
      (await db.getFirstAsync<LocalConversation>(
        "SELECT id, title, created_at AS createdAt FROM conversations WHERE id = ?",
        [id],
      )) ?? null
    );
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync("DELETE FROM messages WHERE conversation_id = ?", [id]);
    await db.runAsync("DELETE FROM conversations WHERE id = ?", [id]);
  }

  // ─── Messages ───────────────────────────────────────────────
  async addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    attachments?: unknown,
    metadata?: unknown,
  ): Promise<LocalMessage> {
    const db = await this.ensureDb();
    const msg: LocalMessage = {
      id: uuid(),
      conversationId,
      role,
      content,
      attachments: attachments ? JSON.stringify(attachments) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: Date.now(),
    };
    await db.runAsync(
      "INSERT INTO messages (id, conversation_id, role, content, attachments, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        msg.id,
        msg.conversationId,
        msg.role,
        msg.content,
        msg.attachments,
        msg.metadata,
        msg.createdAt,
      ],
    );
    return msg;
  }

  async getMessages(conversationId: string): Promise<LocalMessage[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<LocalMessage>(
      `SELECT id, conversation_id AS conversationId, role, content, attachments, metadata, created_at AS createdAt
       FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversationId],
    );
  }

  async getRecentHistory(
    conversationId: string,
    limit = 20,
  ): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const db = await this.ensureDb();
    const rows = await db.getAllAsync<{ role: string; content: string }>(
      `SELECT role, content FROM messages
       WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?`,
      [conversationId, limit],
    );
    return rows.reverse().map((r) => ({
      role: r.role as "user" | "assistant",
      content: r.content,
    }));
  }

  // ─── Rules ──────────────────────────────────────────────────
  async createRule(rule: {
    name: string;
    description?: string;
    condition: string;
    action: string;
    message?: string;
    priority?: number;
  }): Promise<LocalRule> {
    const db = await this.ensureDb();
    const r: LocalRule = {
      id: uuid(),
      name: rule.name,
      description: rule.description ?? null,
      condition: rule.condition,
      action: rule.action,
      message: rule.message ?? null,
      priority: rule.priority ?? 0,
      enabled: 1,
      createdAt: Date.now(),
    };
    await db.runAsync(
      `INSERT INTO rules (id, name, description, condition, action, message, priority, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.name,
        r.description,
        r.condition,
        r.action,
        r.message,
        r.priority,
        r.enabled,
        r.createdAt,
      ],
    );
    return r;
  }

  async listRules(): Promise<LocalRule[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<LocalRule>(
      `SELECT id, name, description, condition, action, message, priority, enabled, created_at AS createdAt
       FROM rules ORDER BY priority ASC, created_at DESC`,
    );
  }

  async updateRule(
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
  ): Promise<void> {
    const db = await this.ensureDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [key, value] of Object.entries(updates)) {
      const col = key === "createdAt" ? "created_at" : key;
      sets.push(`${col} = ?`);
      vals.push(value);
    }
    if (sets.length === 0) return;
    vals.push(id);
    await db.runAsync(
      `UPDATE rules SET ${sets.join(", ")} WHERE id = ?`,
      vals as (string | number | null)[],
    );
  }

  async deleteRule(id: string): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync("DELETE FROM rules WHERE id = ?", [id]);
  }

  async getActiveRules(): Promise<LocalRule[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<LocalRule>(
      `SELECT id, name, description, condition, action, message, priority, enabled, created_at AS createdAt
       FROM rules WHERE enabled = 1 ORDER BY priority ASC`,
    );
  }

  // ─── Skills ─────────────────────────────────────────────────
  async createSkill(skill: {
    name: string;
    description?: string;
    code: string;
    inputSchema?: string;
    outputSchema?: string;
  }): Promise<LocalSkill> {
    const db = await this.ensureDb();
    const s: LocalSkill = {
      id: uuid(),
      name: skill.name,
      description: skill.description ?? null,
      code: skill.code,
      inputSchema: skill.inputSchema ?? null,
      outputSchema: skill.outputSchema ?? null,
      enabled: 1,
      createdAt: Date.now(),
    };
    await db.runAsync(
      `INSERT INTO skills (id, name, description, code, input_schema, output_schema, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.name,
        s.description,
        s.code,
        s.inputSchema,
        s.outputSchema,
        s.enabled,
        s.createdAt,
      ],
    );
    return s;
  }

  async listSkills(): Promise<LocalSkill[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<LocalSkill>(
      `SELECT id, name, description, code, input_schema AS inputSchema, output_schema AS outputSchema, enabled, created_at AS createdAt
       FROM skills ORDER BY created_at DESC`,
    );
  }

  async updateSkill(
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
  ): Promise<void> {
    const db = await this.ensureDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [key, value] of Object.entries(updates)) {
      const col =
        key === "inputSchema"
          ? "input_schema"
          : key === "outputSchema"
            ? "output_schema"
            : key === "createdAt"
              ? "created_at"
              : key;
      sets.push(`${col} = ?`);
      vals.push(value);
    }
    if (sets.length === 0) return;
    vals.push(id);
    await db.runAsync(
      `UPDATE skills SET ${sets.join(", ")} WHERE id = ?`,
      vals as (string | number | null)[],
    );
  }

  async deleteSkill(id: string): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync("DELETE FROM skills WHERE id = ?", [id]);
  }

  async getEnabledSkills(): Promise<LocalSkill[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<LocalSkill>(
      `SELECT id, name, description, code, input_schema AS inputSchema, output_schema AS outputSchema, enabled, created_at AS createdAt
       FROM skills WHERE enabled = 1`,
    );
  }
}

export const localStore = new LocalStore();
