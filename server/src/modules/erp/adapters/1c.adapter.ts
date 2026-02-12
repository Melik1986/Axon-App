import {
  ErpConfig,
  StockItem,
  Product,
  Invoice,
  CreateInvoiceRequest,
} from "../erp.types";
import { ErpAdapter } from "./erp-adapter.interface";

export class OneCAdapter implements ErpAdapter {
  constructor(private config: ErpConfig) {}

  private getAuthHeader(): string {
    const user = this.config.username || "";
    const pass = this.config.password || "";
    return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }

  async getStock(productName?: string): Promise<StockItem[]> {
    let url = `${this.config.baseUrl}/AccumulationRegister_ТоварыНаСкладах/Balance?$format=json`;
    if (productName) {
      url += `&$filter=contains(Номенклатура/Description,'${encodeURIComponent(productName)}')`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`ERP OData error: ${response.status}`);
    }

    const data = await response.json();
    return (data.value || []).map(
      (item: { Номенклатура_Key: string; КоличествоBalance: number }) => ({
        id: item.Номенклатура_Key,
        name: productName || "Товар",
        quantity: item.КоличествоBalance || 0,
        unit: "шт",
      }),
    );
  }

  async testConnection(): Promise<boolean> {
    const url = `${this.config.baseUrl}/Catalog_Номенклатура?$top=1&$format=json`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: "application/json",
      },
    });
    return response.ok;
  }

  async getProducts(filter?: string): Promise<Product[]> {
    let url = `${this.config.baseUrl}/Catalog_Номенклатура?$format=json&$select=Ref_Key,Description,Артикул,Цена,ЭтоУслуга`;
    if (filter) {
      url += `&$filter=contains(Description,'${encodeURIComponent(filter)}')`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`ERP OData error: ${response.status}`);
    }

    const data = await response.json();
    return (data.value || []).map(
      (item: {
        Ref_Key: string;
        Description: string;
        Артикул?: string;
        Цена?: number;
        ЭтоУслуга?: boolean;
      }) => ({
        id: item.Ref_Key,
        name: item.Description,
        sku: item.Артикул,
        price: item.Цена,
        isService: item.ЭтоУслуга,
      }),
    );
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    const items = request.items.map((item) => ({
      productId: "",
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      amount: item.quantity * item.price,
    }));

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    const documentData = {
      Date: new Date().toISOString(),
      Контрагент: request.customerName,
      Комментарий: request.comment || "",
      Товары: items.map((item) => ({
        Номенклатура: item.productName,
        Количество: item.quantity,
        Цена: item.price,
        Сумма: item.amount,
      })),
    };

    const response = await fetch(
      `${this.config.baseUrl}/Document_РеализацияТоваровИУслуг?$format=json`,
      {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(documentData),
      },
    );

    if (!response.ok) {
      throw new Error(`ERP OData error: ${response.status}`);
    }

    const result = await response.json();

    return {
      id: result.Ref_Key || `inv-${Date.now()}`,
      number: result.Number || `РТУ-${Date.now()}`,
      date: result.Date || new Date().toISOString(),
      customerName: request.customerName,
      items,
      total,
      status: "draft",
      comment: request.comment,
    };
  }
}
