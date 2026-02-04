import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";
import { AuthModule } from "../auth/auth.module";
import { ServicesModule } from "../../services/services.module";

@Module({
  imports: [
    AuthModule,
    ServicesModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
