import { z } from 'zod'

export const RouteSegmentSchema = z.object({
  sequence: z.number().int().nonnegative(),
  address: z.string().trim().min(1),
  component: z.string().trim().min(1),
  cable: z.string().trim(),
  point: z.string().trim().min(1),
  opticalLengthMeters: z.number().nonnegative().nullable(),
})

export const ErpDetailsSchema = z.object({
  customerIp: z.string().trim().default(''),
  popAddress: z.string().trim().default(''),
  instructions: z.string().trim().default(''),
  serviceType: z.string().trim().default(''),
  serviceStatus: z.string().trim().default(''),
  scheduledWindow: z.string().trim().default(''),
  occurrence: z.string().trim().default(''),
  activity: z.string().trim().default(''),
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
  erpDetails: ErpDetailsSchema.optional(),
  warnings: z.array(z.string()),
  segments: z.array(RouteSegmentSchema),
})

export type RouteSegment = z.infer<typeof RouteSegmentSchema>
export type ErpDetails = z.infer<typeof ErpDetailsSchema>
export type ServiceOrder = z.infer<typeof ServiceOrderSchema>
