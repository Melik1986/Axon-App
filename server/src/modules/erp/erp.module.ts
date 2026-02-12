import { Module } from "@nestjs/common";
import { ErpService } from "./erp.service";
import { ErpController } from "./erp.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [ErpService],
  controllers: [ErpController],
  exports: [ErpService],
})
export class ErpModule {}
