import { describe, expect, it } from 'vitest'
import { parseConnectMasterText } from './connectMaster'

const REPORT_98216 = `
ConnectMaster - Relatório de Rota Óptica
Ordem de Serviço: 98216
RIO DE JANEIRO Rua Ipadu, 520 CEO-RJO-0001 G1-F8 12,5
12F-RJO-0001 Fibra03 180,0
RIO DE JANEIRO Av. das Américas, 3500 Rack 44U-POP-BARRA P07 22
48F-RJO-0450 G2-F7 425,75
Página 1 de 1
`

describe('ConnectMaster parser', () => {
  it('extracts ordered route segments and decimal lengths', () => {
    const result = parseConnectMasterText(REPORT_98216)

    expect(result.orderCode).toBe('98216')
    expect(result.segments).toEqual([
      {
        sequence: 0,
        address: 'Rua Ipadu, 520',
        component: 'CEO-RJO-0001',
        cable: '12F-RJO-0001',
        point: 'Fibra03',
        opticalLengthMeters: 180,
      },
      {
        sequence: 1,
        address: 'Av. das Américas, 3500',
        component: 'Rack 44U-POP-BARRA',
        cable: '48F-RJO-0450',
        point: 'G2-F7',
        opticalLengthMeters: 425.75,
      },
    ])
    expect(result.warnings).toEqual([])
  })

  it('ignores page headers and repeated city labels', () => {
    const result = parseConnectMasterText(`
      CONNECTMASTER
      Página 2 de 4
      RIO DE JANEIRO RIO DE JANEIRO Rua A, 10 TOA 2F-CLIENTE Fibra11 5
      12F-ACESSO Fibra11 30
      Emitido em 30/08/2026
    `)

    expect(result.segments[0]).toMatchObject({
      address: 'Rua A, 10',
      component: 'TOA 2F-CLIENTE',
      cable: '12F-ACESSO',
    })
  })

  it('reports incomplete components instead of inventing cable data', () => {
    const result = parseConnectMasterText('Rua Sem Saída, 55 CEO-RJO-0099 Fibra08 10')

    expect(result.segments).toEqual([])
    expect(result.warnings[0]).toContain('CEO-RJO-0099')
  })

  it('returns a useful warning when no route can be recognized', () => {
    const result = parseConnectMasterText('documento ilegível')

    expect(result.segments).toEqual([])
    expect(result.warnings).toContain('Nenhum trecho de rota foi reconhecido no relatório.')
  })
})
