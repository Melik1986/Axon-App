import { Module } from "@nestjs/common";
import { RulebookService } from "./rulebook.service";
import { RulebookController } from "./rulebook.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [RulebookController],
  providers: [RulebookService],
  exports: [RulebookService],
})
export class RulebookModule {}
