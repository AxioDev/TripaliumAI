import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiKeyScope } from '@tripalium/shared';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My API Key' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ApiKeyScope, example: ApiKeyScope.WRITE })
  @IsEnum(ApiKeyScope)
  scope: ApiKeyScope;

  @ApiPropertyOptional({ example: 90, description: 'Expiration in days' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

export class ApiKeyInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ApiKeyScope })
  scope: ApiKeyScope;

  @ApiProperty({ example: 'trpl_abc123...' })
  keyPrefix: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lastUsedAt: Date | null;

  @ApiPropertyOptional()
  expiresAt: Date | null;
}
