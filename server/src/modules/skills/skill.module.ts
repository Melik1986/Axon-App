import { Module } from "@nestjs/common";
import { SkillService } from "./skill.service";
import { SandboxExecutorService } from "./sandbox-executor.service";

@Module({
  providers: [SkillService, SandboxExecutorService],
  exports: [SkillService, SandboxExecutorService],
})
export class SkillsModule {}
