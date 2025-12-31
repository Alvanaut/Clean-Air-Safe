import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Space,
  SpaceType,
  VentilationLevel,
  CleaningFrequency,
  SafetyScore,
} from './space.entity';

export interface CreateSpaceDto {
  name: string;
  description?: string;
  type: SpaceType;
  parent_space_id?: string;
  responsible_user_id?: string;
  tenant_id: string;
  metadata?: Record<string, any>;
  // CO2 baseline
  co2_baseline?: number;
  // Safety compliance
  has_hydro_gel?: boolean;
  has_temp_check?: boolean;
  has_mask_required?: boolean;
  ventilation_level?: VentilationLevel;
  max_capacity?: number;
  current_capacity?: number;
  cleaning_frequency?: CleaningFrequency;
  has_isolation_room?: boolean;
  social_distancing?: boolean;
}

export interface UpdateSpaceDto {
  name?: string;
  description?: string;
  type?: SpaceType;
  parent_space_id?: string;
  responsible_user_id?: string;
  metadata?: Record<string, any>;
  // CO2 baseline
  co2_baseline?: number;
  // Safety compliance
  has_hydro_gel?: boolean;
  has_temp_check?: boolean;
  has_mask_required?: boolean;
  ventilation_level?: VentilationLevel;
  max_capacity?: number;
  current_capacity?: number;
  cleaning_frequency?: CleaningFrequency;
  has_isolation_room?: boolean;
  social_distancing?: boolean;
}

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
  ) {}

  /**
   * Create a new space
   */
  async create(dto: CreateSpaceDto): Promise<Space> {
    const space = this.spaceRepository.create(dto);

    // Build hierarchy path
    if (dto.parent_space_id) {
      const parent = await this.findOne(dto.parent_space_id);
      space.hierarchy_path = `${parent.hierarchy_path}/${space.id}`;
    } else {
      space.hierarchy_path = `/${space.id}`;
    }

    // Calculate safety score automatically
    space.safety_score = this.calculateSafetyScore(space);

    return await this.spaceRepository.save(space);
  }

  /**
   * Get all spaces for a tenant
   */
  async findByTenant(tenantId: string, type?: SpaceType): Promise<Space[]> {
    const query = this.spaceRepository
      .createQueryBuilder('space')
      .where('space.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('space.parent_space', 'parent')
      .leftJoinAndSelect('space.responsible_user', 'user')
      .orderBy('space.hierarchy_path', 'ASC');

    if (type) {
      query.andWhere('space.type = :type', { type });
    }

    return await query.getMany();
  }

  /**
   * Get buildings for a tenant (with addresses)
   */
  async getBuildingsByTenant(tenantId: string): Promise<Space[]> {
    return await this.spaceRepository.find({
      where: {
        tenant_id: tenantId,
        type: SpaceType.BUILDING,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find one space by ID
   */
  async findOne(id: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({
      where: { id },
      relations: ['parent_space', 'responsible_user', 'sensors'],
    });

    if (!space) {
      throw new NotFoundException(`Space with ID ${id} not found`);
    }

    return space;
  }

  /**
   * Update a space
   */
  async update(id: string, dto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findOne(id);

    Object.assign(space, dto);

    // Update hierarchy path if parent changed
    if (dto.parent_space_id && dto.parent_space_id !== space.parent_space_id) {
      const parent = await this.findOne(dto.parent_space_id);
      space.hierarchy_path = `${parent.hierarchy_path}/${space.id}`;
    }

    // Recalculate safety score if any safety field changed
    const safetyFieldsChanged =
      dto.has_hydro_gel !== undefined ||
      dto.has_temp_check !== undefined ||
      dto.has_mask_required !== undefined ||
      dto.ventilation_level !== undefined ||
      dto.cleaning_frequency !== undefined ||
      dto.has_isolation_room !== undefined ||
      dto.social_distancing !== undefined ||
      dto.max_capacity !== undefined ||
      dto.current_capacity !== undefined;

    if (safetyFieldsChanged) {
      space.safety_score = this.calculateSafetyScore(space);
    }

    return await this.spaceRepository.save(space);
  }

  /**
   * Delete a space
   */
  async remove(id: string): Promise<void> {
    const space = await this.findOne(id);
    await this.spaceRepository.remove(space);
  }

  /**
   * Get child spaces
   */
  async getChildren(parentId: string): Promise<Space[]> {
    return await this.spaceRepository.find({
      where: { parent_space_id: parentId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Calculate safety score based on COVID compliance criteria
   * Score calculation:
   * - Gel hydro: 15 pts
   * - Temperature check: 15 pts
   * - Ventilation: HEPA=20, Mechanical=15, Natural=10, None=0
   * - Mask required: 10 pts
   * - Cleaning: Hourly=15, Daily=10, Weekly=5, None=0
   * - Social distancing: 10 pts
   * - Isolation room: 10 pts (building level)
   *
   * Total /100:
   * A: 90-100, B: 80-89, C: 70-79, D: 60-69, E: 50-59, F: <50
   */
  calculateSafetyScore(space: Space): SafetyScore {
    let totalPoints = 0;

    // Equipment criteria
    if (space.has_hydro_gel) totalPoints += 15;
    if (space.has_temp_check) totalPoints += 15;
    if (space.has_mask_required) totalPoints += 10;

    // Ventilation
    switch (space.ventilation_level) {
      case VentilationLevel.HEPA:
        totalPoints += 20;
        break;
      case VentilationLevel.MECHANICAL:
        totalPoints += 15;
        break;
      case VentilationLevel.NATURAL:
        totalPoints += 10;
        break;
      case VentilationLevel.NONE:
        totalPoints += 0;
        break;
    }

    // Cleaning frequency
    switch (space.cleaning_frequency) {
      case CleaningFrequency.HOURLY:
        totalPoints += 15;
        break;
      case CleaningFrequency.DAILY:
        totalPoints += 10;
        break;
      case CleaningFrequency.WEEKLY:
        totalPoints += 5;
        break;
      case CleaningFrequency.NONE:
        totalPoints += 0;
        break;
    }

    // Protocols
    if (space.social_distancing) totalPoints += 10;
    if (space.has_isolation_room) totalPoints += 10;

    // Capacity check (bonus 5 pts if current_capacity <= max_capacity)
    if (
      space.max_capacity &&
      space.current_capacity &&
      space.current_capacity <= space.max_capacity
    ) {
      totalPoints += 5;
    }

    // Convert to letter grade
    if (totalPoints >= 90) return SafetyScore.A;
    if (totalPoints >= 80) return SafetyScore.B;
    if (totalPoints >= 70) return SafetyScore.C;
    if (totalPoints >= 60) return SafetyScore.D;
    if (totalPoints >= 50) return SafetyScore.E;
    return SafetyScore.F;
  }

  /**
   * Update safety score for a specific space
   */
  async updateSafetyScore(id: string): Promise<Space> {
    const space = await this.findOne(id);
    space.safety_score = this.calculateSafetyScore(space);
    return await this.spaceRepository.save(space);
  }

  /**
   * Update safety scores for all spaces in a tenant
   */
  async updateAllSafetyScores(tenantId: string): Promise<number> {
    const spaces = await this.findByTenant(tenantId);
    let updatedCount = 0;

    for (const space of spaces) {
      space.safety_score = this.calculateSafetyScore(space);
      await this.spaceRepository.save(space);
      updatedCount++;
    }

    return updatedCount;
  }
}
