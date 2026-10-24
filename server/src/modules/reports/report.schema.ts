import { z } from 'zod';

export const NormalizedReportSchema = z.object({
  id: z.string(),
  disasterId: z.string(),
  content: z.string(),
  author: z.string(),
  source: z.string(),
  createdAt: z.string(),
});

export type NormalizedReport = z.infer<typeof NormalizedReportSchema>;
