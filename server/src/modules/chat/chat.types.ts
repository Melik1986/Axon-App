import type { TextPart, ImagePart } from "ai";

export interface Attachment {
  name: string;
  type: "image" | "file";
  mimeType: string;
  uri: string;
  base64?: string;
}

export type StreamPart = {
  type: string;
  toolName?: string;
  toolCallId?: string;
  args?: Record<string, unknown>;
  input?: Record<string, unknown>;
  result?: unknown;
  output?: unknown;
  text?: string;
  delta?: string;
};

export type UserContentPart = TextPart | ImagePart;
