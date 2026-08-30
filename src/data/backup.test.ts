import { describe, expect, it } from 'vitest'
import type { ServiceOrder } from '../domain/order'
import { createBackup, parseBackup } from './backup'

const order: ServiceOrder = {
  id: 'os-98216', code: '98216', customer: 'Cliente', address: 'Rua A, 10',
  building: '', rack: 'RACK-01', slot: '1', switchPort: '', switchIp: '',
  createdAt: '2026-08-30T12:00:00.000Z', updatedAt: '2026-08-30T12:00:00.000Z',
  rawErpText: '', rawRouteText: '', warnings: [], segments: [],
}

describe('versioned backup', () => {
  it('exports and validates all saved orders', () => {
    const text = createBackup([order], () => '2026-08-30T20:00:00.000Z')
    const restored = parseBackup(text)

    expect(restored.version).toBe(1)
    expect(restored.exportedAt).toBe('2026-08-30T20:00:00.000Z')
    expect(restored.orders[0]).toEqual(order)
  })

  it('rejects unrelated or corrupted JSON files', () => {
    expect(() => parseBackup('{"orders":"not-an-array"}')).toThrow()
    expect(() => parseBackup('not-json')).toThrow('Arquivo de backup inválido')
  })
})
