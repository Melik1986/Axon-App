import { IsIn, IsOptional, IsString, IsEmpty } from "class-validator";
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

  @IsEmpty({ message: "password must NOT be provided in body (use JWE)" })
  @IsOptional()
  @IsString()
  password?: string;

  @IsEmpty({ message: "apiKey must NOT be provided in body (use JWE)" })
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
