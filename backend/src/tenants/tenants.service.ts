import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Create a new tenant
   * Only GODMODE users can create tenants
   */
  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Check if tenant name already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: createTenantDto.name },
    });

    if (existingTenant) {
      throw new ConflictException(
        `Tenant with name "${createTenantDto.name}" already exists`,
      );
    }

    // Check if KSP contract ID is unique (if provided)
    if (createTenantDto.ksp_contract_id) {
      const existingKsp = await this.tenantRepository.findOne({
        where: { ksp_contract_id: createTenantDto.ksp_contract_id },
      });

      if (existingKsp) {
        throw new ConflictException(
          `Tenant with KSP contract ID "${createTenantDto.ksp_contract_id}" already exists`,
        );
      }
    }

    const tenant = this.tenantRepository.create(createTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  /**
   * Get all tenants
   * GODMODE: can see all
   */
  async findAll(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get one tenant by ID
   */
  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['users', 'sensors', 'spaces'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  /**
   * Get tenant by name
   */
  async findByName(name: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { name },
    });
  }

  /**
   * Get tenant by KSP contract ID
   */
  async findByKspContractId(contractId: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { ksp_contract_id: contractId },
    });
  }

  /**
   * Update a tenant
   * Only GODMODE users can update tenants
   */
  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Check if new name conflicts with existing tenant
    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { name: updateTenantDto.name },
      });

      if (existingTenant) {
        throw new ConflictException(
          `Tenant with name "${updateTenantDto.name}" already exists`,
        );
      }
    }

    // Check if new KSP contract ID conflicts
    if (
      updateTenantDto.ksp_contract_id &&
      updateTenantDto.ksp_contract_id !== tenant.ksp_contract_id
    ) {
      const existingKsp = await this.tenantRepository.findOne({
        where: { ksp_contract_id: updateTenantDto.ksp_contract_id },
      });

      if (existingKsp) {
        throw new ConflictException(
          `Tenant with KSP contract ID "${updateTenantDto.ksp_contract_id}" already exists`,
        );
      }
    }

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  /**
   * Delete a tenant
   * Only GODMODE users can delete tenants
   * NOTE: This should cascade delete all related data (users, sensors, etc.)
   */
  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);

    // Check if tenant has users
    if (tenant.users && tenant.users.length > 0) {
      throw new BadRequestException(
        `Cannot delete tenant with ${tenant.users.length} user(s). Please delete or reassign users first.`,
      );
    }

    // Check if tenant has sensors
    if (tenant.sensors && tenant.sensors.length > 0) {
      throw new BadRequestException(
        `Cannot delete tenant with ${tenant.sensors.length} sensor(s). Please delete sensors first.`,
      );
    }

    await this.tenantRepository.remove(tenant);
  }

  /**
   * Suspend a tenant (soft disable)
   */
  async suspend(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.SUSPENDED;
    return await this.tenantRepository.save(tenant);
  }

  /**
   * Activate a tenant
   */
  async activate(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.ACTIVE;
    return await this.tenantRepository.save(tenant);
  }

  /**
   * Get tenant statistics
   */
  async getStats(id: string): Promise<any> {
    const tenant = await this.findOne(id);

    return {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      status: tenant.status,
      users_count: tenant.users?.length || 0,
      sensors_count: tenant.sensors?.length || 0,
      spaces_count: tenant.spaces?.length || 0,
      sync_enabled: tenant.sync_enabled,
      ksp_integration: !!tenant.ksp_contract_id,
      created_at: tenant.created_at,
    };
  }
}
