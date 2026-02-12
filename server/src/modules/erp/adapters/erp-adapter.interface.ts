import {
  StockItem,
  Product,
  Invoice,
  CreateInvoiceRequest,
} from "../erp.types";

export interface ErpAdapter {
  /**
   * Get stock balance for a product or all products.
   */
  getStock(productName?: string): Promise<StockItem[]>;

  /**
   * Get products list from catalog.
   */
  getProducts(filter?: string): Promise<Product[]>;

  /**
   * Create a sales document (Invoice/Order).
   */
  createInvoice(request: CreateInvoiceRequest): Promise<Invoice>;

  /**
   * Check connection and authentication.
   */
  testConnection?(): Promise<boolean>;
}
