import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Isolation Middleware
 *
 * Adds tenant context to request for automatic filtering.
 * This can be used with TypeORM global scopes or manual filtering.
 *
 * Note: For now, this is informational. Actual tenant isolation
 * should be implemented in services by filtering with user.tenant_id
 */
@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Tenant context is already available via req.user.tenant_id
    // after JWT authentication

    // Future: Could add QueryRunner tenant context here
    // for automatic query filtering with TypeORM

    next();
  }
}
