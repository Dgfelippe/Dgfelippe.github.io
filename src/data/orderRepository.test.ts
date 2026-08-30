import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import type { ServiceOrder } from '../domain/order'
import { createOrderRepository } from './orderRepository'

const databases = new Set<string>()

function makeOrder(overrides: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id: 'order-98216',
    code: '98216',
    customer: 'CDI Barra Produtos Importados Ltda',
    address: 'Rua Ipadu, 520',
    building: '9858 - IPADU 520',
    rack: 'RACK-01',
    slot: '1',
    switchPort: '1/1/9',
    switchIp: '10.10.8.233',
    createdAt: '2026-08-30T12:00:00.000Z',
    updatedAt: '2026-08-30T12:00:00.000Z',
    rawErpText: 'OS 98216',
    rawRouteText: 'Fibra03',
    warnings: [],
    segments: [
      {
        sequence: 0,
        address: 'Rua Ipadu, 520',
        component: 'CEO-RJO-001',
        cable: '12F-RJO-001',
        point: 'Fibra03',
        opticalLengthMeters: 180,
      },
    ],
    ...overrides,
  }
}

function newDatabaseName(): string {
  const name = `rotas-mundivox-test-${crypto.randomUUID()}`
  databases.add(name)
  return name
}

afterEach(async () => {
  await Promise.all([...databases].map((name) => Dexie.delete(name)))
  databases.clear()
})

describe('order repository', () => {
  it('persists an order after the database is closed and reopened', async () => {
    const databaseName = newDatabaseName()
    const firstSession = createOrderRepository({ databaseName })

    await firstSession.save(makeOrder())
    firstSession.close()

    const secondSession = createOrderRepository({ databaseName })
    await expect(secondSession.getById('order-98216')).resolves.toMatchObject({
      code: '98216',
      customer: 'CDI Barra Produtos Importados Ltda',
    })
    secondSession.close()
  })

  it('updates an existing order without losing its original creation date', async () => {
    const repository = createOrderRepository({
      databaseName: newDatabaseName(),
      now: () => '2026-08-30T15:30:00.000Z',
    })

    await repository.save(makeOrder())
    await repository.save(makeOrder({ customer: 'Cliente atualizado' }))

    await expect(repository.getById('order-98216')).resolves.toMatchObject({
      customer: 'Cliente atualizado',
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T15:30:00.000Z',
    })
    repository.close()
  })

  it('lists newest updates first and finds an order by code', async () => {
    const repository = createOrderRepository({ databaseName: newDatabaseName() })
    await repository.save(makeOrder())
    await repository.save(
      makeOrder({
        id: 'order-98533',
        code: '98533',
        updatedAt: '2026-08-30T14:00:00.000Z',
      }),
    )

    await expect(repository.findByCode('98533')).resolves.toMatchObject({ id: 'order-98533' })
    await expect(repository.list()).resolves.toHaveLength(2)
    expect((await repository.list())[0].code).toBe('98533')
    repository.close()
  })

  it('removes only the selected order', async () => {
    const repository = createOrderRepository({ databaseName: newDatabaseName() })
    await repository.save(makeOrder())
    await repository.save(makeOrder({ id: 'order-98533', code: '98533' }))

    await repository.remove('order-98216')

    await expect(repository.getById('order-98216')).resolves.toBeUndefined()
    await expect(repository.getById('order-98533')).resolves.toBeDefined()
    repository.close()
  })
})
