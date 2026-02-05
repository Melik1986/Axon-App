import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { ServicesModule } from "../../services/services.module";

@Module({
  imports: [ServicesModule],
  controllers: [McpController],
})
export class McpModule {}
