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

  it('extracts every operational field from the real 98216 ERP layout', () => {
    const result = parseErpText(`
98216 - CDI BARRA PRODUTOS - IMPORTACAO E EXPORTACAO LTDA.
CLIENTES - REATIVO DADOS
DESLOCAMENTO EM ANDAMENTO
28/08/2026 09:00 até 14:00
Prédio: 9858 - IPADU 520
Endereço Cliente: Rua Ipadu, 520 - monoempresa - Bairro: Jacarepaguá - CEP: 22713-460 - Rio de Janeiro-RJ
Contato: Interno Ip do switch: 10.10.8.233 Porta do switch: 1/1/9 Valores de atenuação POP: Tx-Power [dBm]: -0.16 Rx-Power [dBm]: -40.0
Endereço do POP: Mix Mall
Instruções do que fazer: Favor verificar fibra desalinhada portando OTDR / KIT PADRÃO
Serviço MA300,0M - ISS (1)
    `)

    expect(result.orderCode.value).toBe('98216')
    expect(result.customer.value).toBe('CDI BARRA PRODUTOS - IMPORTACAO E EXPORTACAO LTDA.')
    expect(result.serviceType.value).toBe('CLIENTES - REATIVO DADOS')
    expect(result.serviceStatus.value).toBe('DESLOCAMENTO EM ANDAMENTO')
    expect(result.scheduledWindow.value).toBe('28/08/2026 09:00 até 14:00')
    expect(result.address.value).toContain('Rua Ipadu, 520')
    expect(result.switchIp.value).toBe('10.10.8.233')
    expect(result.switchPort.value).toBe('1/1/9')
    expect(result.popAddress.value).toBe('Mix Mall')
    expect(result.instructions.value).toContain('Favor verificar fibra desalinhada')
  })

  it('extracts client IP and long switch interface from the real 87729 layout', () => {
    const result = parseErpText(`
87729 - UNIDAS ARMAZENS GERAIS LTDA (*)
CLIENTES - REDUNDANCIA
DESLOCAMENTO EM ANDAMENTO
27/08/2026 10:30 até 15:00
Prédio: 1574 - DOWNTOWN BL 16
Endereço Prédio: Avenida das Américas, 500 - Rio de Janeiro-RJ
Contato: IP do cliente: 10.21.204.43 Ip do switch:10.10.5.235 Porta do switch:GigabitEthernet 0/0/8 Valores de atenuação POP: -40 dbm
Endereço do cliente: Prédio São Miguel 11, Rua São Miguel nº 11, Tijuca - Rio de Janeiro - RJ
Endereço do POP: Avenida das Américas, 500 Barra da Tijuca - Rio de Janeiro - RJ
Instruções do que fazer: Prezados, verificado interface GigabitEthernet 0/0/8 DOWN/DOWN em SWL2_H5720_DOWNTOWN_07
Serviço ZABBIX
    `)

    expect(result.orderCode.value).toBe('87729')
    expect(result.customerIp.value).toBe('10.21.204.43')
    expect(result.switchIp.value).toBe('10.10.5.235')
    expect(result.switchPort.value).toBe('GigabitEthernet 0/0/8')
    expect(result.address.value).toContain('Prédio São Miguel 11')
    expect(result.popAddress.value).toContain('Avenida das Américas, 500')
  })

  it('keeps monitoring details even when the ERP card has no OS number', () => {
    const result = parseErpText(`
MUNDIVOX - INTERFACE ATENUADA
DESLOCAMENTO EM ANDAMENTO
29/08/2026 02:00 até 04:00
Prédio: 1574 - DOWNTOWN BL 16
Endereço Prédio: Avenida das Américas, 500 - Rio de Janeiro-RJ
Contato: Favor realizar medição na interface atenuada no PE BARRA X CCARMO01 200.196.61.113 Te0/0/2/0 RX -23.1db Limiar em -23.979 Serviço ZABBIX
Ocorrência: 2608291140183594 Atividade: 478771
    `)

    expect(result.orderCode.value).toBeNull()
    expect(result.serviceType.value).toBe('MUNDIVOX - INTERFACE ATENUADA')
    expect(result.instructions.value).toContain('200.196.61.113')
    expect(result.occurrence.value).toBe('2608291140183594')
    expect(result.activity.value).toBe('478771')
  })
})

  it('delimits address and normalizes common OCR noise when labels share one line', () => {
    const result = parseErpText(`
Ordem de Serviço: 98216
Cliente: CDI BARRA PRODUTOS IMPORTADOS LTDA
Prédio: 9858 - IPADU 520
Endereço Cliente: Rua lIpadu, 520 Rack: RACK-01 Slot: 1l IP do switch: 10.10.8.233 Porta do switch: 1/1/9
    `)

    expect(result.address.value).toBe('Rua Ipadu, 520')
    expect(result.rack.value).toBe('RACK-01')
    expect(result.slot.value).toBe('1')
    expect(result.switchIp.value).toBe('10.10.8.233')
  })
