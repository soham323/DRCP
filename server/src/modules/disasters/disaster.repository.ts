import { prisma } from '../../common/prisma';
import { Disaster } from '@prisma/client';

export interface FormattedDisaster {
  id: string;
  title: string;
  description: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  tags: string[];
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function formatDisaster(raw: Disaster): FormattedDisaster {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(raw.tags);
  } catch {
    parsedTags = [];
  }

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    location: {
      name: raw.locationName,
      latitude: raw.latitude,
      longitude: raw.longitude,
    },
    tags: parsedTags,
    status: raw.status,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export class DisasterRepository {
  public async create(data: {
    title: string;
    description: string;
    locationName: string;
    latitude: number;
    longitude: number;
    tags: string[];
    status: string;
    createdBy: string;
  }): Promise<FormattedDisaster> {
    const record = await prisma.disaster.create({
      data: {
        title: data.title,
        description: data.description,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        tags: JSON.stringify(data.tags),
        status: data.status,
        createdBy: data.createdBy,
      },
    });

    return formatDisaster(record);
  }

  public async findById(id: string): Promise<FormattedDisaster | null> {
    const record = await prisma.disaster.findUnique({
      where: { id },
    });

    return record ? formatDisaster(record) : null;
  }

  public async findMany(filters: {
    tag?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: FormattedDisaster[]; total: number }> {
    const whereClause: any = {};

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.tag) {
      // In SQLite, tags is a JSON string. Filter using string contains
      whereClause.tags = {
        contains: `"${filters.tag}"`,
      };
    }

    const [records, total] = await Promise.all([
      prisma.disaster.findMany({
        where: whereClause,
        take: filters.limit,
        skip: filters.offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.disaster.count({ where: whereClause }),
    ]);

    return {
      items: records.map(formatDisaster),
      total,
    };
  }

  public async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
      tags?: string[];
      status?: string;
    }
  ): Promise<FormattedDisaster> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.locationName !== undefined) updateData.locationName = data.locationName;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.status !== undefined) updateData.status = data.status;

    const record = await prisma.disaster.update({
      where: { id },
      data: updateData,
    });

    return formatDisaster(record);
  }

  public async delete(id: string): Promise<void> {
    await prisma.disaster.delete({
      where: { id },
    });
  }
}

export const disasterRepository = new DisasterRepository();
