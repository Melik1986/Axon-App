import { Test, TestingModule } from "@nestjs/testing";
import { DiffPreviewService } from "./diff-preview.service";

describe("DiffPreviewService", () => {
  let service: DiffPreviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiffPreviewService],
    }).compile();

    service = module.get<DiffPreviewService>(DiffPreviewService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateDiffPreview", () => {
    it("should generate diff for create_invoice", () => {
      const toolCall = {
        toolName: "create_invoice",
        args: {
          items: [
            { product_name: "Widget", quantity: 10, price: 100 },
            { product_name: "Gadget", quantity: 5, price: 200 },
          ],
          customer_name: "ACME Corp",
        },
        resultSummary: "",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeDefined();
      expect(result?.before.item_0).toBe("Not created");
      expect(result?.after.item_0).toBe("Widget: 10 × 100 ₽");
      expect(result?.before.customer).toBe("Not set");
      expect(result?.after.customer).toBe("ACME Corp");
    });

    it("should generate diff for get_stock", () => {
      const toolCall = {
        toolName: "get_stock",
        args: { product_name: "Widget" },
        resultSummary: "Widget: 50 units in stock",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeDefined();
      expect(result?.before.query).toBe("Widget");
      expect(result?.after.result).toBe("Widget: 50 units in stock");
    });

    it("should generate diff for update_product", () => {
      const toolCall = {
        toolName: "update_product",
        args: {
          product_id: "123",
          name: "Updated Widget",
          price: 150,
        },
        resultSummary: "",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeDefined();
      expect(result?.before.name).toBe("(existing value)");
      expect(result?.after.name).toBe("Updated Widget");
      expect(result?.before.price).toBe("(existing value)");
      expect(result?.after.price).toBe(150);
    });

    it("should generate diff for delete_document", () => {
      const toolCall = {
        toolName: "delete_document",
        args: {
          document_id: "doc-456",
          document_type: "Invoice",
        },
        resultSummary: "",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeDefined();
      expect(result?.before.status).toBe("Document exists");
      expect(result?.after.status).toBe("DELETED");
      expect(result?.before.id).toBe("doc-456");
      expect(result?.after.id).toBe("doc-456");
    });

    it("should return undefined for unknown tool", () => {
      const toolCall = {
        toolName: "unknown_tool",
        args: {},
        resultSummary: "",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeUndefined();
    });

    it("should return undefined for create_invoice without items", () => {
      const toolCall = {
        toolName: "create_invoice",
        args: { items: [], customer_name: "ACME" },
        resultSummary: "",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeUndefined();
    });

    it("should return undefined for update_product without product_id", () => {
      const toolCall = {
        toolName: "update_product",
        args: { name: "Updated Widget" },
        resultSummary: "",
      };

      const result = service.generateDiffPreview(toolCall);

      expect(result).toBeUndefined();
    });
  });
});
