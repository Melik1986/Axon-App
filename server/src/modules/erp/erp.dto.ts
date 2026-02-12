import { IsIn, IsOptional, IsString } from "class-validator";
import { ErpConfig } from "./erp.types";

export class ErpSettingsDto implements Partial<ErpConfig> {
  @IsOptional()
  @IsIn(["demo", "1c", "sap", "odoo", "custom"])
  provider?: "demo" | "1c" | "sap" | "odoo" | "custom";

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  db?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsIn(["rest", "odata", "graphql"])
  apiType?: "rest" | "odata" | "graphql";

  @IsOptional()
  @IsString()
  openApiSpecUrl?: string;
}
