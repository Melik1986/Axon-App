import { Body, Controller, Post, UseGuards, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { ErpService } from "./erp.service";
import { ErpSettingsDto } from "./erp.dto";

@ApiTags("erp")
@Controller("erp")
@UseGuards(AuthGuard)
export class ErpController {
  constructor(@Inject(ErpService) private readonly erpService: ErpService) {}

  @Post("test")
  async testConnection(@Body() body: { erpSettings: ErpSettingsDto }) {
    const { erpSettings } = body || {};
    const result = await this.erpService.testConnection(erpSettings || {});
    return result;
  }
}
