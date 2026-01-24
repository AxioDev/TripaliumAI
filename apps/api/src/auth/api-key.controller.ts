import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateApiKeyDto, ApiKeyInfoDto } from './dto/api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({ status: 200, type: [ApiKeyInfoDto] })
  async listApiKeys(@CurrentUser() user: { id: string }) {
    return this.apiKeyService.listApiKeys(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'Returns the API key (only shown once)',
  })
  async createApiKey(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.createApiKey(
      user.id,
      dto.name,
      dto.scope,
      dto.expiresInDays,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revokeApiKey(
    @CurrentUser() user: { id: string },
    @Param('id') keyId: string,
  ) {
    return this.apiKeyService.revokeApiKey(user.id, keyId);
  }
}
