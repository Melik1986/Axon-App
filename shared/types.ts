export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: number;
  title: string;
  createdAt: string;
  messages?: ChatMessage[];
};
