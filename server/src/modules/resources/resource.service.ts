import { resourceRepository, FormattedResource } from './resource.repository';
import { disasterService } from '../disasters/disaster.service';
import { calculateHaversineDistanceKm } from '../../common/haversine';
import { NearbyResourcesQueryInput, CreateResourceInput } from './resource.schema';
import { logger } from '../../common/logger';

export interface ResourceWithDistance extends FormattedResource {
  distance_km: number;
}

export interface NearbyResourcesResult {
  origin: {
    disasterId: string;
    disasterTitle: string;
    latitude: number;
    longitude: number;
    radius_km: number;
  };
  count: number;
  data: ResourceWithDistance[];
}

export class ResourceService {
  /**
   * Find emergency resources within a radial distance (km) of a disaster incident.
   * If custom coordinates are omitted, the disaster's resolved coordinates are used as origin.
   */
  public async findNearbyForDisaster(
    disasterId: string,
    query: NearbyResourcesQueryInput
  ): Promise<NearbyResourcesResult> {
    // 1. Fetch disaster reference to determine default origin
    const disaster = await disasterService.getById(disasterId);

    const originLat = query.lat ?? disaster.location.latitude;
    const originLng = query.lng ?? disaster.location.longitude;
    const radiusKm = query.radius ?? 10;

    logger.info(
      `[ResourceService] Calculating nearby resources for disaster "${disaster.title}" around [${originLat}, ${originLng}], radius: ${radiusKm}km${
        query.type ? `, type: ${query.type}` : ''
      }`
    );

    // 2. Fetch resources from repository (optionally pre-filtered by type)
    const allResources = await resourceRepository.findAll(query.type ? { type: query.type } : undefined);

    // 3. Compute spherical distance for each resource using Haversine formula
    const originCoords = { latitude: originLat, longitude: originLng };
    const matchingResources: ResourceWithDistance[] = [];

    for (const res of allResources) {
      const distance = calculateHaversineDistanceKm(originCoords, {
        latitude: res.location.latitude,
        longitude: res.location.longitude,
      });

      if (distance <= radiusKm) {
        matchingResources.push({
          ...res,
          distance_km: distance,
        });
      }
    }

    // 4. Sort ascending by distance (nearest first)
    matchingResources.sort((a, b) => a.distance_km - b.distance_km);

    logger.info(`[ResourceService] Found ${matchingResources.length} resources within ${radiusKm}km radius.`);

    return {
      origin: {
        disasterId: disaster.id,
        disasterTitle: disaster.title,
        latitude: originLat,
        longitude: originLng,
        radius_km: radiusKm,
      },
      count: matchingResources.length,
      data: matchingResources,
    };
  }

  /**
   * Create a new emergency relief resource.
   */
  public async create(input: CreateResourceInput): Promise<FormattedResource> {
    return resourceRepository.create({
      name: input.name,
      type: input.type,
      locationName: input.location.name,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      capacity: input.capacity ?? 0,
      status: input.status ?? 'AVAILABLE',
    });
  }

  /**
   * List all registered relief resources.
   */
  public async listAll(type?: string): Promise<FormattedResource[]> {
    return resourceRepository.findAll(type ? { type } : undefined);
  }
}

export const resourceService = new ResourceService();
