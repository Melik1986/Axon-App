import { IsString, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  LlmSettingsDto,
  ErpSettingsDto,
  RagSettingsDto,
} from "../chat/chat.dto";

export class ConductorParseDto {
  @ApiProperty({
    type: String,
    description: "Raw text from voice/Whisper (e.g. «три колы и один пирожок»)",
    example: "три колы и один пирожок",
  })
  @IsString()
  rawText!: string;

  @ApiPropertyOptional({ type: () => LlmSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LlmSettingsDto)
  llmSettings?: LlmSettingsDto;

  @ApiPropertyOptional({ type: () => ErpSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErpSettingsDto)
  erpSettings?: ErpSettingsDto;

  @ApiPropertyOptional({ type: () => RagSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RagSettingsDto)
  ragSettings?: RagSettingsDto;
}
