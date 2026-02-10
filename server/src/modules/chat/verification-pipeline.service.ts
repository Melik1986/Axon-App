import { Injectable, Inject } from "@nestjs/common";
import { Tool } from "ai";
import { CoveWorkflowService } from "./cove-workflow.service";
import { ToolRegistryService } from "./tool-registry.service";
import { ConfidenceScorerService } from "./confidence-scorer.service";
import { DiffPreviewService } from "./diff-preview.service";
import type { ErpConfig } from "../erp/erp.types";

/**
 * VerificationPipeline
 *
 * Handles the execution of tool calls with CoVe (Chain of Verification) workflow.
 * Responsibilities:
 * - Determine if verification is needed for a tool call
 * - Execute verification tools before main tool call
 * - Calculate confidence scores
 * - Generate diff previews
 * - Return final tool call results with metadata
 *
 * Extracted from ChatService (Etap 3 refactor) for cleaner separation of concerns.
 */
@Injectable()
export class VerificationPipeline {
  constructor(
    @Inject(CoveWorkflowService) private coveWorkflow: CoveWorkflowService,
    @Inject(ToolRegistryService) private toolRegistry: ToolRegistryService,
    @Inject(ConfidenceScorerService)
    private confidenceScorer: ConfidenceScorerService,
    @Inject(DiffPreviewService) private diffPreview: DiffPreviewService,
  ) {}

  /**
   * Process a tool call with verification pipeline
   *
   * @param toolCall - The original tool call
   * @param userId - User ID for tool registry
   * @param erpSettings - ERP configuration
   * @returns Processed tool calls with verifications, confidence scores, and diffs
   */
  async processTool(
    toolCall: {
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      resultSummary?: string;
    },
    userId: string,
    erpSettings?: Partial<ErpConfig>,
  ): Promise<
    {
      toolName: string;
      args: Record<string, unknown>;
      resultSummary: string;
      confidence?: number;
      isVerification?: boolean;
      diffPreview?:
        | {
            before: Record<string, unknown>;
            after: Record<string, unknown>;
          }
        | undefined;
    }[]
  > {
    const result: {
      toolName: string;
      args: Record<string, unknown>;
      resultSummary: string;
      confidence?: number;
      isVerification?: boolean;
      diffPreview?:
        | {
            before: Record<string, unknown>;
            after: Record<string, unknown>;
          }
        | undefined;
    }[] = [];

    // Step 1: Execute verification tools if needed (CoVe workflow)
    if (this.coveWorkflow.needsVerification(toolCall.toolName)) {
      const verifications = this.coveWorkflow.getVerificationTools(
        toolCall.toolName,
        toolCall.args,
      );

      for (const verification of verifications) {
        const verificationResult = await this.executeVerificationTool(
          verification.toolName,
          verification.args,
          userId,
          erpSettings,
        );

        result.push({
          toolName: verification.toolName,
          args: verification.args as Record<string, unknown>,
          resultSummary: verificationResult,
          isVerification: true,
          confidence: 1.0, // Verifications have high confidence
        });
      }
    }

    // Step 2: Add main tool call with metadata
    result.push({
      toolName: toolCall.toolName,
      args: toolCall.args,
      resultSummary: toolCall.resultSummary ?? "",
      confidence: this.confidenceScorer.calculateConfidence(toolCall),
      diffPreview: this.diffPreview.generateDiffPreview(toolCall, erpSettings),
    });

    return result;
  }

  /**
   * Process multiple tool calls through the verification pipeline
   *
   * @param toolCalls - Array of tool calls to process
   * @param userId - User ID for tool registry
   * @param erpSettings - ERP configuration
   * @returns All processed tool calls (including verifications)
   */
  async processTools(
    toolCalls: {
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      resultSummary?: string;
    }[],
    userId: string,
    erpSettings?: Partial<ErpConfig>,
  ): Promise<
    {
      toolName: string;
      args: Record<string, unknown>;
      resultSummary: string;
      confidence?: number;
      isVerification?: boolean;
      diffPreview?:
        | {
            before: Record<string, unknown>;
            after: Record<string, unknown>;
          }
        | undefined;
    }[]
  > {
    const allResults: {
      toolName: string;
      args: Record<string, unknown>;
      resultSummary: string;
      confidence?: number;
      isVerification?: boolean;
      diffPreview?:
        | {
            before: Record<string, unknown>;
            after: Record<string, unknown>;
          }
        | undefined;
    }[] = [];

    for (const toolCall of toolCalls) {
      const processed = await this.processTool(toolCall, userId, erpSettings);
      allResults.push(...processed);
    }

    return allResults;
  }

  /**
   * Execute a verification tool and return its result summary
   *
   * @private
   */
  private async executeVerificationTool(
    toolName: string,
    args: Record<string, unknown>,
    userId: string,
    erpSettings?: Partial<ErpConfig>,
  ): Promise<string> {
    try {
      const tools: Record<
        string,
        Tool<unknown, unknown>
      > = await this.toolRegistry.getTools(userId, erpSettings, []);
      const tool = tools[toolName];

      if (!tool || !("execute" in tool) || !tool.execute) {
        return `Tool '${toolName}' not found or not executable`;
      }

      const output = await tool.execute(args, {
        toolCallId: "verification",
        messages: [],
      });

      return typeof output === "string" ? output : JSON.stringify(output);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Verification failed: ${errorMessage}`;
    }
  }
}
