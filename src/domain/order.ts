import { z } from 'zod'

export const RouteSegmentSchema = z.object({
  sequence: z.number().int().nonnegative(),
  address: z.string().trim().min(1),
  component: z.string().trim().min(1),
  cable: z.string().trim().min(1),
  point: z.string().trim().min(1),
  opticalLengthMeters: z.number().nonnegative().nullable(),
})

export const ServiceOrderSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1),
  customer: z.string().trim(),
  address: z.string().trim(),
  building: z.string().trim().default(''),
  rack: z.string().trim().default(''),
  slot: z.string().trim().default(''),
  switchPort: z.string().trim().default(''),
  switchIp: z.string().trim().default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  rawErpText: z.string(),
  rawRouteText: z.string(),
  warnings: z.array(z.string()),
  segments: z.array(RouteSegmentSchema),
})

export type RouteSegment = z.infer<typeof RouteSegmentSchema>
export type ServiceOrder = z.infer<typeof ServiceOrderSchema>
