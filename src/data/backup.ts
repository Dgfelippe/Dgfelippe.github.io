import { z } from 'zod'
import { ServiceOrderSchema, type ServiceOrder } from '../domain/order'

const BackupSchema = z.object({
  format: z.literal('rotas-mundivox-backup'),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  orders: z.array(ServiceOrderSchema),
})

export type RotasBackup = z.infer<typeof BackupSchema>

export function createBackup(
  orders: ServiceOrder[],
  now: () => string = () => new Date().toISOString(),
): string {
  return JSON.stringify(BackupSchema.parse({
    format: 'rotas-mundivox-backup',
    version: 1,
    exportedAt: now(),
    orders,
  }), null, 2)
}

export function parseBackup(text: string): RotasBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Arquivo de backup inválido')
  }
  return BackupSchema.parse(data)
}
