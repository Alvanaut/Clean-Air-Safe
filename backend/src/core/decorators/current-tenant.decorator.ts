import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Tenant } from '../../tenants/tenant.entity';

/**
 * Get current user's tenant from request
 * Usage: @CurrentTenant() tenant: Tenant
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Tenant => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenant;
  },
);

/**
 * Get current tenant ID from request
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenant_id;
  },
);
