import { Module } from "@nestjs/common";
import { McpController } from "./mcp.controller";
import { ServicesModule } from "../../services/services.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ServicesModule, AuthModule],
  controllers: [McpController],
})
export class McpModule {}
