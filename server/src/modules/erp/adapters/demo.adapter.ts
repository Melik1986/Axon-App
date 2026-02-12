import {
  StockItem,
  Product,
  Invoice,
  CreateInvoiceRequest,
} from "../erp.types";
import { ErpAdapter } from "./erp-adapter.interface";

export class DemoAdapter implements ErpAdapter {
  async testConnection(): Promise<boolean> {
    return true;
  }

  async getStock(productName?: string): Promise<StockItem[]> {
    const mockStock: StockItem[] = [
      {
        id: "stock-1",
        name: "Кофе арабика 1кг",
        sku: "COFFEE-001",
        quantity: 150,
        unit: "шт",
      },
      {
        id: "stock-2",
        name: "Молоко 1л",
        sku: "MILK-001",
        quantity: 80,
        unit: "шт",
      },
      {
        id: "stock-3",
        name: "Сахар 1кг",
        sku: "SUGAR-001",
        quantity: 200,
        unit: "шт",
      },
      {
        id: "stock-4",
        name: "Печенье шоколадное",
        sku: "COOKIE-001",
        quantity: 45,
        unit: "уп",
      },
    ];

    if (productName) {
      const lowerName = productName.toLowerCase();
      return mockStock.filter((item) =>
        item.name.toLowerCase().includes(lowerName),
      );
    }
    return mockStock;
  }

  async getProducts(filter?: string): Promise<Product[]> {
    const mockProducts: Product[] = [
      {
        id: "prod-1",
        name: "Кофе арабика 1кг",
        sku: "COFFEE-001",
        price: 1200,
        isService: false,
      },
      {
        id: "prod-2",
        name: "Молоко 1л",
        sku: "MILK-001",
        price: 90,
        isService: false,
      },
      {
        id: "prod-3",
        name: "Услуга доставки",
        sku: "DELIVERY",
        price: 500,
        isService: true,
      },
    ];

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      return mockProducts.filter((item) =>
        item.name.toLowerCase().includes(lowerFilter),
      );
    }
    return mockProducts;
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    const items = request.items.map((item) => ({
      productId: `prod-${Date.now()}`,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      amount: item.quantity * item.price,
    }));

    return {
      id: `inv-${Date.now()}`,
      number: `РТУ-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString(),
      customerName: request.customerName || "Покупатель",
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      status: "draft",
      comment: request.comment,
    };
  }
}
