import { Injectable } from "@nestjs/common";
import type { ClientRuleDto, ClientSkillDto } from "./chat.dto";

const SYSTEM_PROMPT = `Ты — Axon Business AI-ассистент, AI-ассистент для управления бизнес-процессами в ERP.
Ты можешь:
- Проверять остатки товаров на складе (get_stock)
- Получать список товаров (get_products)
- Создавать документы реализации (create_invoice)
- Отвечать на вопросы по регламентам и инструкциям компании

Отвечай кратко и по делу. Используй функции когда это уместно.
При работе с данными ERP всегда показывай результаты в удобном формате.`;

@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(options: {
    ragContext?: string;
    clientRules?: ClientRuleDto[];
    clientSkills?: ClientSkillDto[];
    memoryFacts?: { key: string; value: string }[];
    conversationSummary?: string;
  }): string {
    const {
      ragContext,
      clientRules,
      clientSkills,
      memoryFacts,
      conversationSummary,
    } = options;

    let systemMessage = ragContext
      ? `${SYSTEM_PROMPT}\n\n${ragContext}`
      : SYSTEM_PROMPT;

    const ruleInstructions = (clientRules ?? [])
      .filter((r) => r.content)
      .map((r) => `### ${r.name}\n${r.content}`)
      .join("\n\n");

    const skillInstructions = (clientSkills ?? [])
      .filter((s) => s.content)
      .map((s) => `### ${s.name}\n${s.content}`)
      .join("\n\n");

    if (ruleInstructions) {
      systemMessage += `\n\n## User Rules:\n${ruleInstructions}`;
    }

    if (skillInstructions) {
      systemMessage += `\n\n## User Skills Context:\n${skillInstructions}`;
    }

    if (memoryFacts && memoryFacts.length > 0) {
      const factLines = memoryFacts
        .map((f) => `- ${f.key}: ${f.value}`)
        .join("\n");
      systemMessage += `\n\n## Long-term Memory:\n${factLines}`;
      systemMessage +=
        "\n\nYou have access to long-term memory. Use save_memory to remember important facts about the user, their business, preferences, and context that should persist across conversations. Use recall_memory to search past facts.";
    }

    if (conversationSummary) {
      systemMessage += `\n\n## Previous Conversation Context:\n${conversationSummary}`;
    }

    return systemMessage;
  }
}
