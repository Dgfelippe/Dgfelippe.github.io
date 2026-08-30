import { describe, expect, it } from 'vitest'
import { parseErpText } from './erp'

const ERP_TEXT = `
Ordem de Serviço: 98216
Cliente: CDI BARRA PRODUTOS IMPORTADOS LTDA
Prédio: 9858 - IPADU 520
Endereço Cliente: Rua Ipadu, 520 - Barra da Tijuca - Rio de Janeiro/RJ
Rack: RACK-01 Slot: 1
IP do switch: 10.10.8.233 Porta do switch: 1/1/9
`

describe('ERP parser', () => {
  it('extracts service and network fields from OCR text', () => {
    const result = parseErpText(ERP_TEXT)

    expect(result.orderCode.value).toBe('98216')
    expect(result.customer.value).toBe('CDI BARRA PRODUTOS IMPORTADOS LTDA')
    expect(result.building.value).toBe('9858 - IPADU 520')
    expect(result.address.value).toContain('Rua Ipadu, 520')
    expect(result.rack.value).toBe('RACK-01')
    expect(result.slot.value).toBe('1')
    expect(result.switchIp.value).toBe('10.10.8.233')
    expect(result.switchPort.value).toBe('1/1/9')
  })

  it('marks missing values for manual review', () => {
    const result = parseErpText('OS: 98533\nCliente: Mercado Exemplo')

    expect(result.orderCode.value).toBe('98533')
    expect(result.switchIp.value).toBeNull()
    expect(result.warnings).toContain('IP do switch não identificado; revise manualmente.')
  })

  it('understands common OCR variations for OS, rack and slot', () => {
    const result = parseErpText(`
      Nº da O.S. 98533
      Rack / DGO Rack 44U-RJO-204>03<DGO-144F (3U)-RJO-029
      Slot / Módulo 2
    `)

    expect(result.orderCode.value).toBe('98533')
    expect(result.rack.value).toBe('Rack 44U-RJO-204>03<DGO-144F (3U)-RJO-029')
    expect(result.slot.value).toBe('2')
  })
})
