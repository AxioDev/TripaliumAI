import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark an endpoint as public (no auth required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
