import Dexie, { type EntityTable } from 'dexie'
import { ServiceOrderSchema, type ServiceOrder } from '../domain/order'

class RotasMundivoxDatabase extends Dexie {
  orders!: EntityTable<ServiceOrder, 'id'>

  constructor(databaseName: string) {
    super(databaseName)
    this.version(1).stores({
      orders: 'id, &code, updatedAt',
    })
  }
}

export interface OrderRepository {
  save(order: ServiceOrder): Promise<ServiceOrder>
  getById(id: string): Promise<ServiceOrder | undefined>
  findByCode(code: string): Promise<ServiceOrder | undefined>
  list(): Promise<ServiceOrder[]>
  remove(id: string): Promise<void>
  close(): void
}

interface RepositoryOptions {
  databaseName?: string
  now?: () => string
}

export function createOrderRepository(options: RepositoryOptions = {}): OrderRepository {
  const database = new RotasMundivoxDatabase(options.databaseName ?? 'rotas-mundivox')
  const now = options.now ?? (() => new Date().toISOString())

  return {
    async save(order) {
      const validOrder = ServiceOrderSchema.parse(order)
      const existing = await database.orders.get(validOrder.id)
      const savedOrder = ServiceOrderSchema.parse({
        ...validOrder,
        createdAt: existing?.createdAt ?? validOrder.createdAt,
        updatedAt: existing ? now() : validOrder.updatedAt,
      })

      await database.orders.put(savedOrder)
      return savedOrder
    },

    async getById(id) {
      return database.orders.get(id)
    },

    async findByCode(code) {
      return database.orders.where('code').equals(code.trim()).first()
    },

    async list() {
      return database.orders.orderBy('updatedAt').reverse().toArray()
    },

    async remove(id) {
      await database.orders.delete(id)
    },

    close() {
      database.close()
    },
  }
}
