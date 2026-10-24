import { prisma } from '../../common/prisma';
import { EmergencyResource } from '@prisma/client';

export interface FormattedResource {
  id: string;
  name: string;
  type: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  capacity: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function formatResource(raw: EmergencyResource): FormattedResource {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    location: {
      name: raw.locationName,
      latitude: raw.latitude,
      longitude: raw.longitude,
    },
    capacity: raw.capacity,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export class ResourceRepository {
  public async findAll(filter?: { type?: string }): Promise<FormattedResource[]> {
    const whereClause: any = {};
    if (filter?.type) {
      whereClause.type = filter.type;
    }

    const records = await prisma.emergencyResource.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    return records.map(formatResource);
  }

  public async findById(id: string): Promise<FormattedResource | null> {
    const record = await prisma.emergencyResource.findUnique({
      where: { id },
    });
    return record ? formatResource(record) : null;
  }

  public async create(data: {
    name: string;
    type: string;
    locationName: string;
    latitude: number;
    longitude: number;
    capacity: number;
    status: string;
  }): Promise<FormattedResource> {
    const record = await prisma.emergencyResource.create({
      data: {
        name: data.name,
        type: data.type,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        capacity: data.capacity,
        status: data.status,
      },
    });
    return formatResource(record);
  }
}

export const resourceRepository = new ResourceRepository();
