import { z } from 'zod';
import { ResourceType, ResourceStatus } from '../../common/enums';

export { ResourceType, ResourceStatus };

export const ResourceTypeEnum = z.nativeEnum(ResourceType);
export const ResourceStatusEnum = z.nativeEnum(ResourceStatus);

export const NearbyResourcesQuerySchema = z.object({
  radius: z.coerce
    .number()
    .positive('Radius must be a positive number')
    .max(1000, 'Radius cannot exceed 1000 km')
    .optional()
    .default(10),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  type: ResourceTypeEnum.optional(),
});

export const CreateResourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').max(200),
  type: ResourceTypeEnum,
  location: z.object({
    name: z.string().min(1, 'Location name is required'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  capacity: z.number().int().min(0).optional().default(0),
  status: ResourceStatusEnum.optional().default(ResourceStatus.AVAILABLE),
});

export type NearbyResourcesQueryInput = z.infer<typeof NearbyResourcesQuerySchema>;
export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
