import { SetMetadata } from '@nestjs/common';
import { ApiKeyScope } from '@tripalium/shared';

export const REQUIRED_SCOPE_KEY = 'requiredScope';

/**
 * Decorator to specify the minimum API key scope required for an endpoint.
 * Used with CombinedAuthGuard.
 *
 * @example
 * @RequiredScope(ApiKeyScope.WRITE)
 * @UseGuards(CombinedAuthGuard)
 * async createSomething() {}
 */
export const RequiredScope = (scope: ApiKeyScope) =>
  SetMetadata(REQUIRED_SCOPE_KEY, scope);
