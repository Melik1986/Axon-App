import { Injectable } from "@nestjs/common";
import { AppLogger } from "../../utils/logger";
import type { ClientRuleDto } from "../chat/chat.dto";

/**
 * Stateless rule validation service.
 * Rules come from the client payload -- server stores nothing.
 */
@Injectable()
export class RulebookService {
  /**
   * Validate a tool call against client-provided rules (stateless).
   * No DB access -- rules are in-memory from the request.
   */
  validateToolCallStateless(
    rules: ClientRuleDto[],
    toolName: string,
    args: Record<string, unknown>,
  ): {
    allowed: boolean;
    action: string;
    message?: string;
    ruleId?: string;
  } {
    for (const rule of rules) {
      try {
        const condition = JSON.parse(rule.condition) as {
          tool?: string;
          field?: string;
          operator?: string;
          value?: unknown;
        };

        // Basic condition check: tool name match
        if (condition.tool && condition.tool !== toolName) continue;

        // Field value check
        if (condition.field && args[condition.field] !== undefined) {
          const val = args[condition.field];
          let match = false;

          switch (condition.operator) {
            case "<":
              match =
                typeof val === "number" && typeof condition.value === "number"
                  ? val < condition.value
                  : false;
              break;
            case ">":
              match =
                typeof val === "number" && typeof condition.value === "number"
                  ? val > condition.value
                  : false;
              break;
            case "==":
              match = val === condition.value;
              break;
            case "!=":
              match = val !== condition.value;
              break;
            case "contains":
              match = String(val).includes(String(condition.value));
              break;
          }

          if (match) {
            AppLogger.warn(
              `Rule violation: ${rule.name} for tool ${toolName}`,
              undefined,
              "Rulebook",
            );
            return {
              allowed: rule.action !== "reject",
              action: rule.action,
              message: rule.message || `Rule violated: ${rule.name}`,
              ruleId: rule.id,
            };
          }
        }
      } catch (error) {
        AppLogger.error(
          `Error parsing rule condition: ${rule.id}`,
          error,
          "Rulebook",
        );
      }
    }

    return { allowed: true, action: "allow" };
  }
}
