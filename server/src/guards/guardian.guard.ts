import { Injectable, Inject } from "@nestjs/common";
import { RulebookService } from "../modules/rules/rulebook.service";
import { ValidationService } from "../services/validation.service";
import type { ClientRuleDto } from "../modules/chat/chat.dto";

export interface GuardianCheckResult {
  allowed: boolean;
  message?: string;
  action: "allow" | "reject" | "warn" | "require_confirmation";
}

@Injectable()
export class GuardianGuard {
  constructor(
    @Inject(RulebookService) private rulebook: RulebookService,
    @Inject(ValidationService) private validationService: ValidationService,
  ) {}

  /**
   * Comprehensive check of a tool call before execution.
   * Rules come from the client payload (zero-storage).
   */
  async check(
    userId: string,
    toolName: string,
    args: Record<string, unknown>,
    clientRules?: ClientRuleDto[],
  ): Promise<GuardianCheckResult> {
    // 1. Rulebook Check -- validate against rules from client payload
    const ruleResult = this.rulebook.validateToolCallStateless(
      clientRules ?? [],
      toolName,
      args,
    );
    if (!ruleResult.allowed) {
      return {
        allowed: false,
        action: "reject",
        message: ruleResult.message,
      };
    }

    // 2. Semantic Validation (Hardcoded/Complex logic)
    const semanticResult = await this.validationService.validate(
      toolName,
      args,
    );
    if (!semanticResult.valid) {
      return {
        allowed: false,
        action: "reject",
        message: semanticResult.message,
      };
    }

    // 3. Warning Check
    if (semanticResult.level === "warning" && semanticResult.message) {
      return {
        allowed: true,
        action: "require_confirmation",
        message: semanticResult.message,
      };
    }

    if (
      ruleResult.action === "warn" ||
      ruleResult.action === "require_confirmation"
    ) {
      return {
        allowed: true,
        action: ruleResult.action as
          | "allow"
          | "reject"
          | "warn"
          | "require_confirmation",
        message: ruleResult.message,
      };
    }

    return { allowed: true, action: "allow" };
  }
}
