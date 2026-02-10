import { Injectable } from "@nestjs/common";
import type { ErpConfig } from "../erp/erp.types";

/**
 * DiffPreviewService
 *
 * Generates before/after diff previews for tool calls.
 * Helps users understand what changes will be made in the ERP system
 * before confirming the operation.
 *
 * Extracted from ChatService (Etap 3 refactor) for cleaner separation of concerns.
 */
@Injectable()
export class DiffPreviewService {
  /**
   * Generate a diff preview showing before/after state for a tool call
   *
   * @param toolCall - The tool call with name and arguments
   * @param erpSettings - ERP configuration (for context)
   * @returns Diff preview object or undefined if not applicable
   */
  generateDiffPreview(
    toolCall: {
      toolName: string;
      args: unknown;
      resultSummary?: string;
    },
    erpSettings?: Partial<ErpConfig>,
  ):
    | { before: Record<string, unknown>; after: Record<string, unknown> }
    | undefined {
    switch (toolCall.toolName) {
      case "create_invoice":
        return this.previewCreateInvoice(toolCall);
      case "get_stock":
        return this.previewGetStock(toolCall);
      case "update_product":
        return this.previewUpdateProduct(toolCall);
      case "delete_document":
        return this.previewDeleteDocument(toolCall);
      // Add more tool-specific previews as needed
      default:
        return undefined;
    }
  }

  /**
   * Preview for create_invoice tool
   */
  private previewCreateInvoice(toolCall: {
    toolName: string;
    args: unknown;
    resultSummary?: string;
  }):
    | { before: Record<string, unknown>; after: Record<string, unknown> }
    | undefined {
    const args = toolCall.args as {
      items?: { product_name: string; quantity: number; price: number }[];
      customer_name?: string;
    };

    if (!args.items || args.items.length === 0) {
      return undefined;
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    // Show what will be created
    args.items.forEach((item, index) => {
      before[`item_${index}`] = "Not created";
      after[`item_${index}`] =
        `${item.product_name}: ${item.quantity} × ${item.price} ₽`;
    });

    if (args.customer_name) {
      before.customer = "Not set";
      after.customer = args.customer_name;
    }

    return { before, after };
  }

  /**
   * Preview for get_stock tool (read operation)
   */
  private previewGetStock(toolCall: {
    toolName: string;
    args: unknown;
    resultSummary?: string;
  }): { before: Record<string, unknown>; after: Record<string, unknown> } {
    const args = toolCall.args as { product_name?: string };
    return {
      before: { query: args.product_name || "N/A" },
      after: { result: toolCall.resultSummary || "No results" },
    };
  }

  /**
   * Preview for update_product tool
   */
  private previewUpdateProduct(toolCall: {
    toolName: string;
    args: unknown;
    resultSummary?: string;
  }):
    | { before: Record<string, unknown>; after: Record<string, unknown> }
    | undefined {
    const args = toolCall.args as Record<string, unknown>;
    if (!args.product_id) {
      return undefined;
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    // Show all fields that will be updated
    Object.keys(args).forEach((key) => {
      if (key !== "product_id") {
        before[key] = "(existing value)";
        after[key] = args[key];
      }
    });

    return { before, after };
  }

  /**
   * Preview for delete_document tool
   */
  private previewDeleteDocument(toolCall: {
    toolName: string;
    args: unknown;
    resultSummary?: string;
  }):
    | { before: Record<string, unknown>; after: Record<string, unknown> }
    | undefined {
    const args = toolCall.args as {
      document_id?: string;
      document_type?: string;
    };
    if (!args.document_id) {
      return undefined;
    }

    return {
      before: {
        status: "Document exists",
        id: args.document_id,
        type: args.document_type || "Unknown",
      },
      after: {
        status: "DELETED",
        id: args.document_id,
        type: args.document_type || "Unknown",
      },
    };
  }
}
