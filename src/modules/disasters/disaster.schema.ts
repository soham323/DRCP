import { z } from 'zod';
import { DisasterStatus } from '../../common/enums';

export { DisasterStatus };

export const LocationObjectSchema = z.object({
  name: z.string().min(1, 'Location name cannot be empty'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

export const CreateDisasterSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters long')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters long')
    .max(3000, 'Description cannot exceed 3000 characters'),
  location: LocationObjectSchema.optional(),
  tags: z.array(z.string().min(1)).optional().default([]),
  status: z.nativeEnum(DisasterStatus).optional().default(DisasterStatus.ACTIVE),
  createdBy: z.string().optional(),
});

export const UpdateDisasterSchema = z
  .object({
    title: z.string().min(3).max(150).optional(),
    description: z.string().min(10).max(3000).optional(),
    location: LocationObjectSchema.optional(),
    tags: z.array(z.string().min(1)).optional(),
    status: z.nativeEnum(DisasterStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const QueryDisastersSchema = z.object({
  tag: z.string().optional(),
  status: z.nativeEnum(DisasterStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const DisasterIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Disaster ID must be a valid UUID' }),
});

export type CreateDisasterInput = z.infer<typeof CreateDisasterSchema>;
export type UpdateDisasterInput = z.infer<typeof UpdateDisasterSchema>;
export type QueryDisastersInput = z.infer<typeof QueryDisastersSchema>;
