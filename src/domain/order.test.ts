import { describe, expect, it } from 'vitest'

import { ServiceOrderSchema } from './order'

describe('ServiceOrderSchema', () => {
  it('accepts a complete service order with an ordered optical route', () => {
    const parsed = ServiceOrderSchema.parse({
      id: 'os-98216',
      code: '98216',
      customer: 'CDI BARRA PRODUTOS',
      address: 'Rua Ipadu, 520 - Jacarepaguá',
      building: '9858 - IPADU 520',
      rack: 'Rack 44U-RJO-152>01<DGO-144F-RJO-016',
      slot: '1',
      switchPort: '1/1/9',
      switchIp: '10.10.8.233',
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:00:00.000Z',
      rawErpText: 'texto ERP',
      rawRouteText: 'texto ConnectMaster',
      erpDetails: { serviceType: 'CLIENTES - REATIVO DADOS', customerIp: '10.21.1.1', instructions: 'Testar enlace' },
      warnings: [],
      segments: [{
        sequence: 0,
        address: 'IPADU 520',
        component: 'TOA 2F-97966',
        cable: '12F-9858',
        point: 'Fibra01',
        opticalLengthMeters: 81.27,
      }],
    })

    expect(parsed.segments[0].sequence).toBe(0)
    expect(parsed.erpDetails?.serviceType).toBe('CLIENTES - REATIVO DADOS')
    expect(parsed.erpDetails?.customerIp).toBe('10.21.1.1')
  })

  it('rejects an order without a code or route segment address', () => {
    expect(() => ServiceOrderSchema.parse({ code: '', segments: [] })).toThrow()
  })

  it('accepts a draft with no recognized route so field data is not lost', () => {
    const parsed = ServiceOrderSchema.parse({
      id: 'draft-98533', code: '98533', customer: 'Cliente em revisão',
      address: 'Endereço a revisar', building: '', rack: 'RACK-02', slot: '2',
      switchPort: '', switchIp: '', createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:00:00.000Z', rawErpText: '', rawRouteText: '',
      warnings: ['Rota pendente'], segments: [],
    })

    expect(parsed.segments).toEqual([])
  })

  it('keeps an endpoint that has no outgoing cable', () => {
    expect(() => ServiceOrderSchema.shape.segments.parse([{
      sequence: 0, address: 'R2 - Américas 500', component: '48F-RJO-2513',
      cable: '', point: 'G3-F12', opticalLengthMeters: 17681.43,
    }])).not.toThrow()
  })
})
