import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { ApiKeyScope, ActionType } from '@tripalium/shared';

export interface ApiKeyWithUser {
  id: string;
  userId: string;
  scope: ApiKeyScope;
  name: string;
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  /**
   * Generate a new API key for a user
   */
  async createApiKey(
    userId: string,
    name: string,
    scope: ApiKeyScope,
    expiresInDays?: number,
  ) {
    // Generate a random key
    const rawKey = `trpl_${randomBytes(24).toString('base64url')}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = this.hashKey(rawKey);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        keyPrefix,
        name,
        scope,
        expiresAt,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'api_key',
      entityId: apiKey.id,
      action: ActionType.API_KEY_CREATED,
      metadata: { name, scope },
    });

    return {
      // Only return the raw key once, at creation time
      key: rawKey,
      info: {
        id: apiKey.id,
        name: apiKey.name,
        scope: apiKey.scope,
        keyPrefix: apiKey.keyPrefix,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      },
    };
  }

  /**
   * Validate an API key and return the associated user
   */
  async validateApiKey(rawKey: string): Promise<ApiKeyWithUser | null> {
    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check if revoked
    if (apiKey.revokedAt) {
      return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      userId: apiKey.userId,
      scope: apiKey.scope as ApiKeyScope,
      name: apiKey.name,
      user: apiKey.user,
    };
  }

  /**
   * List API keys for a user
   */
  async listApiKeys(userId: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
        name: true,
        scope: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return apiKeys;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(userId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
        revokedAt: null,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    await this.logService.log({
      userId,
      entityType: 'api_key',
      entityId: keyId,
      action: ActionType.API_KEY_REVOKED,
    });

    return { success: true };
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
