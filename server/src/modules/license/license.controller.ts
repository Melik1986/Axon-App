import {
  Req,
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ValidateLicenseDto } from "./license.dto";
import { LicenseService } from "./license.service";
import { LicenseHttpError, PaddleWebhookResult } from "./license.types";
import { Request } from "express";

interface RequestWithRawBody extends Request {
  rawBody?: string;
}

@ApiTags("license")
@Controller("license")
export class LicenseController {
  constructor(
    @Inject(LicenseService) private readonly licenseService: LicenseService,
  ) {}

  @Post("validate")
  @ApiOperation({
    summary: "Validate hosted access license key before app bootstrap",
  })
  @ApiResponse({ status: 200, description: "License is valid" })
  @ApiResponse({ status: 401, description: "License is invalid or missing" })
  @ApiResponse({ status: 402, description: "License expired" })
  @ApiResponse({ status: 403, description: "License blocked" })
  async validateLicense(@Body() body: ValidateLicenseDto) {
    const result = await this.licenseService.validateLicenseKey(body.key);
    if (!result.valid) {
      throw new HttpException(
        {
          statusCode: result.statusCode,
          message: result.message,
          code: result.code,
          details: result.details ?? null,
          valid: false,
        },
        result.statusCode,
      );
    }

    return {
      valid: true,
      plan: result.license?.plan,
      expiresAt: result.license?.expiresAt.toISOString(),
      message: result.message,
      code: result.code,
    };
  }

  @Post("webhook/paddle")
  @ApiOperation({
    summary: "Paddle webhook for license lifecycle events",
  })
  @ApiResponse({
    status: 200,
    description: "Paddle webhook processed",
  })
  async paddleWebhook(
    @Req() req: RequestWithRawBody,
    @Headers("paddle-signature") paddleSignature: string | undefined,
  ): Promise<PaddleWebhookResult> {
    const rawBody =
      req.rawBody ??
      (typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {}));

    try {
      return await this.licenseService.processPaddleWebhook(
        rawBody,
        paddleSignature,
      );
    } catch (error) {
      if (error instanceof LicenseHttpError) {
        throw new HttpException(
          {
            statusCode: error.statusCode,
            message: error.message,
            code: error.code,
            details: error.details ?? null,
          },
          error.statusCode,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Failed to process Paddle webhook",
          code: "PADDLE_PROCESSING_ERROR",
          details: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
