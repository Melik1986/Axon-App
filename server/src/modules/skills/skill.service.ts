import { Injectable, Inject } from "@nestjs/common";
import { SandboxExecutorService } from "./sandbox-executor.service";

/**
 * Stateless skill service.
 * Skills come from the client payload -- server stores nothing.
 * Execution happens in sandbox from the code provided in the request.
 */
@Injectable()
export class SkillService {
  constructor(
    @Inject(SandboxExecutorService) private sandbox: SandboxExecutorService,
  ) {}

  /**
   * Execute skill code in sandbox (stateless -- code from client payload).
   */
  async executeSkillCode(
    code: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    return this.sandbox.execute(code, input);
  }
}
