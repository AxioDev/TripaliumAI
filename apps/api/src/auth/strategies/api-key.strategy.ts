import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiKeyService, ApiKeyWithUser } from '../api-key.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async validate(req: Request): Promise<ApiKeyWithUser & { isApiKey: true }> {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const keyData = await this.apiKeyService.validateApiKey(apiKey);

    if (!keyData) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Return user with API key context
    return {
      ...keyData,
      isApiKey: true,
    };
  }
}
