import { describe, expect, it } from 'vitest'
import { parseConnectMasterText, parseOrderCodeFromFilename } from './connectMaster'

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

  it('preserves incomplete components without inventing cable data', () => {
    const result = parseConnectMasterText('Rua Sem Saída, 55 CEO-RJO-0099 Fibra08 10')

    expect(result.segments[0]).toMatchObject({ component: 'CEO-RJO-0099', cable: '' })
    expect(result.warnings[0]).toContain('CEO-RJO-0099')
  })

  it('returns a useful warning when no route can be recognized', () => {
    const result = parseConnectMasterText('documento ilegível')

    expect(result.segments).toEqual([])
    expect(result.warnings).toContain('Nenhum trecho de rota foi reconhecido no relatório.')
  })

  it('parses real ConnectMaster lines with long components, spaced cables and final rack', () => {
    const result = parseConnectMasterText(`
P/C:1 PontoDescrição Cam. Físico Estado do Caminho Físico Circuito P/C:1 RIO DE JANEIRO RIO DE JANEIRO Ipadu 520 TOA 2F-97966 - CDI BARRA PRODUTOS - IMPORTACAO E EXPORTACAO LTDA 1 0.00
12F-9858 - Ipadu 520-01 Fibra01 81.27
RIO DE JANEIRO RIO DE JANEIRO IPADU 521 CEO-RJO-1293>1<Bandeja 144F 3 81.27
48F-5992 - Mix Mall-01 G1-F8 9,308.92
97966 - CDI BARRA PRODUTOS - MA 200M RIO DE JANEIRO RIO DE JANEIRO Tindiba 179 Rack 44U-RJO-152>01<DGO-144F-RJO-016 S9-P08 9,308.92
    `)

    expect(result.segments).toHaveLength(3)
    expect(result.segments[0]).toMatchObject({ address: 'Ipadu 520', component: 'TOA 2F-97966 - CDI BARRA PRODUTOS - IMPORTACAO E EXPORTACAO LTDA', cable: '12F-9858 - Ipadu 520-01', point: 'Fibra01', opticalLengthMeters: 81.27 })
    expect(result.segments[1]).toMatchObject({ component: 'CEO-RJO-1293>1<Bandeja 144F', cable: '48F-5992 - Mix Mall-01', point: 'G1-F8', opticalLengthMeters: 9308.92 })
    expect(result.segments[2]).toMatchObject({ address: 'Tindiba 179', component: 'Rack 44U-RJO-152>01<DGO-144F-RJO-016', cable: '', point: 'S9-P08', opticalLengthMeters: 9308.92 })
  })

  it('keeps a route endpoint represented by a cable component', () => {
    const result = parseConnectMasterText('RIO DE JANEIRO RIO DE JANEIRO Rua São Miguel 11 12F-5722 - Rua São Miguel 11-02 Fibra01 636.93')
    expect(result.segments[0]).toMatchObject({ address: 'Rua São Miguel 11', component: '12F-5722 - Rua São Miguel 11-02', point: 'Fibra01' })
  })

  it('uses the OS number from the imported PDF filename when the report omits it', () => {
    expect(parseOrderCodeFromFilename('98216_CDI_BARRA_MA_200M.pdf')).toBe('98216')
    expect(parseOrderCodeFromFilename('rota-sem-os.pdf')).toBeNull()
  })

  it('does not confuse the end of an address word with an OS label', () => {
    expect(parseConnectMasterText('RIO DE JANEIRO RIO DE JANEIRO DOS TRÊS RIOS 1200 CEO-RJO-1369>1<Bandeja 144F 37 6,329.57').orderCode).toBeNull()
    expect(parseConnectMasterText('RIO DE JANEIRO RIO DE JANEIRO ÉDISON PASSOS 1142 CEO-RJO-0526>1<Bandeja 144F 26 3,419.78').orderCode).toBeNull()
  })
})

  it('reconhece relatório extraído pelo PDF.js com componente e cabo em linhas separadas', () => {
    const result = parseConnectMasterText(`
Relatório ConnectMaster - Ordem de Serviço: 98216
Rua Ipadu, 520
TOA 2F-97966
12F-RJO-0001 Fibra03 180
CEO-RJO-1293
12F-RJO-2333 Fibra03 250
    `)

    expect(result.segments).toEqual([
      {
        sequence: 0,
        address: 'Rua Ipadu, 520',
        component: 'TOA 2F-97966',
        cable: '12F-RJO-0001',
        point: 'Fibra03',
        opticalLengthMeters: 180,
      },
      {
        sequence: 1,
        address: 'Rua Ipadu, 520',
        component: 'CEO-RJO-1293',
        cable: '12F-RJO-2333',
        point: 'Fibra03',
        opticalLengthMeters: 250,
      },
    ])
  })
