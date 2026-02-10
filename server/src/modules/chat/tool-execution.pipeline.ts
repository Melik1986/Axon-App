import { Injectable, Inject } from "@nestjs/common";
import { GuardianGuard } from "../../guards/guardian.guard";
import { ConfidenceScorerService } from "./confidence-scorer.service";
import { CoveWorkflowService } from "./cove-workflow.service";
import type { ClientRuleDto } from "./chat.dto";

export interface ToolExecutionContext {
  userId: string;
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
  clientRules?: ClientRuleDto[];
}

export interface ToolExecutionResult {
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
  confidence: number;
  action: "allow" | "reject" | "warn" | "require_confirmation";
  diffPreview?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  isVerification?: boolean;
}

@Injectable()
export class ToolExecutionPipeline {
  constructor(
    @Inject(GuardianGuard) private guardian: GuardianGuard,
    @Inject(ConfidenceScorerService)
    private confidenceScorer: ConfidenceScorerService,
    @Inject(CoveWorkflowService) private coveWorkflow: CoveWorkflowService,
  ) {}

  /**
   * Execute tool with Guardian check, confidence scoring, and CoVe workflow.
   * Returns normalized result with metadata.
   */
  async executeTool(
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const { userId, toolName, args, resultSummary, clientRules } = context;

    // Step 1: Check Guardian rules
    const guardianResult = await this.guardian.check(
      userId,
      toolName,
      args,
      clientRules,
    );

    // Step 2: Calculate confidence score
    const confidence = this.confidenceScorer.calculateConfidence({
      toolName,
      args,
      resultSummary,
      guardianAction: guardianResult.action,
    });

    // Step 3: Generate diff preview (for display in UI)
    const diffPreview = this.generateDiffPreview(toolName, args, resultSummary);

    return {
      toolName,
      args,
      resultSummary,
      confidence,
      action: guardianResult.action,
      diffPreview,
      isVerification: false,
    };
  }

  /**
   * Get verification tools for CoVe workflow (read before write).
   */
  getVerificationTools(
    toolName: string,
    args: Record<string, unknown>,
  ): { toolName: string; args: Record<string, unknown> }[] {
    return this.coveWorkflow.getVerificationTools(toolName, args);
  }

  /**
   * Check if tool needs verification (write operation).
   */
  needsVerification(toolName: string): boolean {
    return this.coveWorkflow.needsVerification(toolName);
  }

  /**
   * Generate diff preview for tool execution (what will change).
   */
  private generateDiffPreview(
    toolName: string,
    args: Record<string, unknown>,
    resultSummary: string,
  ):
    | { before: Record<string, unknown>; after: Record<string, unknown> }
    | undefined {
    if (toolName === "create_invoice") {
      const typedArgs = args as {
        items?: { product_name: string; quantity: number; price: number }[];
        customer_name?: string;
      };

      if (typedArgs.items && typedArgs.items.length > 0) {
        const before: Record<string, unknown> = {};
        const after: Record<string, unknown> = {};

        typedArgs.items.forEach((item, index) => {
          before[`item_${index}`] = "Not created";
          after[`item_${index}`] =
            `${item.product_name}: ${item.quantity} × ${item.price} ₽`;
        });

        if (typedArgs.customer_name) {
          before.customer = "Not set";
          after.customer = typedArgs.customer_name;
        }

        return { before, after };
      }
    } else if (toolName === "get_stock") {
      const typedArgs = args as { product_name?: string };
      return {
        before: { query: typedArgs.product_name || "N/A" },
        after: { result: resultSummary || "No results" },
      };
    }

    return undefined;
  }
}
