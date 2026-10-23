import { disasterRepository, FormattedDisaster } from './disaster.repository';
import { geocodingService } from '../geocoding/geocoding.service';
import { CreateDisasterInput, UpdateDisasterInput, QueryDisastersInput } from './disaster.schema';
import { NotFoundError } from '../../common/errors';
import { logger } from '../../common/logger';

export class DisasterService {
  /**
   * Create a new disaster incident.
   * If explicit coordinates are omitted, automatically resolves location from the description.
   */
  public async create(input: CreateDisasterInput): Promise<FormattedDisaster> {
    let locationName: string;
    let latitude: number;
    let longitude: number;

    if (input.location && input.location.latitude !== undefined && input.location.longitude !== undefined) {
      locationName = input.location.name;
      latitude = input.location.latitude;
      longitude = input.location.longitude;
      logger.info(`[DisasterService] Using explicitly provided coordinates for "${locationName}"`);
    } else {
      logger.info(`[DisasterService] Resolving location from description: "${input.description.slice(0, 60)}..."`);
      const resolved = await geocodingService.resolveFromDescription(input.description);
      locationName = input.location?.name || resolved.name;
      latitude = resolved.latitude;
      longitude = resolved.longitude;
      logger.info(`[DisasterService] Successfully resolved location to "${locationName}" -> [${latitude}, ${longitude}]`);
    }

    const disaster = await disasterRepository.create({
      title: input.title,
      description: input.description,
      locationName,
      latitude,
      longitude,
      tags: input.tags || [],
      status: input.status || 'ACTIVE',
      createdBy: input.createdBy || 'contributor',
    });

    return disaster;
  }

  /**
   * Retrieve disaster by its unique ID.
   */
  public async getById(id: string): Promise<FormattedDisaster> {
    const disaster = await disasterRepository.findById(id);
    if (!disaster) {
      throw new NotFoundError(`Disaster with ID '${id}' not found`);
    }
    return disaster;
  }

  /**
   * Retrieve paginated and filtered list of disaster incidents.
   */
  public async list(query: QueryDisastersInput): Promise<{
    items: FormattedDisaster[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { items, total } = await disasterRepository.findMany({
      tag: query.tag,
      status: query.status,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });

    return {
      items,
      total,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
  }

  /**
   * Partially update a disaster record.
   */
  public async update(id: string, input: UpdateDisasterInput): Promise<FormattedDisaster> {
    // 1. Ensure entity exists
    await this.getById(id);

    const updatePayload: any = {};
    if (input.title) updatePayload.title = input.title;
    if (input.status) updatePayload.status = input.status;
    if (input.tags) updatePayload.tags = input.tags;

    // Handle location updates
    if (input.location) {
      updatePayload.locationName = input.location.name;
      updatePayload.latitude = input.location.latitude;
      updatePayload.longitude = input.location.longitude;
    } else if (input.description) {
      updatePayload.description = input.description;
    }

    const updated = await disasterRepository.update(id, updatePayload);
    logger.info(`[DisasterService] Updated disaster: ${id}`);
    return updated;
  }

  /**
   * Delete a disaster incident.
   */
  public async delete(id: string): Promise<void> {
    // Ensure entity exists
    await this.getById(id);
    await disasterRepository.delete(id);
    logger.info(`[DisasterService] Deleted disaster: ${id}`);
  }
}

export const disasterService = new DisasterService();
