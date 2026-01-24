import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ApiKeyScope } from '@tripalium/shared';
import { REQUIRED_SCOPE_KEY } from '../decorators/required-scope.decorator';

/**
 * Combined auth guard that accepts either JWT or API Key authentication.
 * Use with @RequiredScope() decorator to specify minimum API key scope.
 */
@Injectable()
export class CombinedAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try to authenticate with either strategy
    const result = (await super.canActivate(context)) as boolean;

    if (!result) {
      return false;
    }

    // Check API key scope if required
    const requiredScope = this.reflector.getAllAndOverride<ApiKeyScope>(
      REQUIRED_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If it's a session-based auth (not API key), allow all
    if (!user.isApiKey) {
      return true;
    }

    // Check if API key has sufficient scope
    const scopeHierarchy: ApiKeyScope[] = [
      ApiKeyScope.READ,
      ApiKeyScope.WRITE,
      ApiKeyScope.TEST,
      ApiKeyScope.ADMIN,
    ];

    const userScopeIndex = scopeHierarchy.indexOf(user.scope);
    const requiredScopeIndex = scopeHierarchy.indexOf(requiredScope);

    // Special case: TEST scope is equivalent to WRITE for non-test endpoints
    if (
      user.scope === ApiKeyScope.TEST &&
      requiredScope === ApiKeyScope.WRITE
    ) {
      return true;
    }

    if (userScopeIndex < requiredScopeIndex) {
      throw new UnauthorizedException(
        `API key scope '${user.scope}' insufficient. Required: '${requiredScope}'`,
      );
    }

    return true;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
