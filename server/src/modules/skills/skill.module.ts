import { Module } from "@nestjs/common";
import { SkillService } from "./skill.service";
import { SkillController } from "./skill.controller";
import { SandboxExecutorService } from "./sandbox-executor.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [SkillController],
  providers: [SkillService, SandboxExecutorService],
  exports: [SkillService],
})
export class SkillsModule {}
