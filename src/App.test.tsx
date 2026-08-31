import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from './App'

vi.mock('./parsers/pdfText', () => ({
  extractPdfText: vi.fn(async () => `Ordem de Serviço: 98216
Rua Ipadu, 520 CEO-RJO-0001 G1-F8 12
12F-RJO-0001 Fibra03 180`),
}))

vi.mock('./parsers/ocr', () => ({
  recognizeErpImage: vi.fn(async () => `Ordem de Serviço: 98216
Cliente: CDI BARRA PRODUTOS IMPORTADOS LTDA
Prédio: 9858 - IPADU 520
Endereço Cliente: Rua Ipadu, 520
Rack: RACK-01 Slot: 1
IP do switch: 10.10.8.233 Porta do switch: 1/1/9`),
}))

describe('ROTAS MUNDIVOX application shell', () => {
  it('allows choosing an ERP image from the mobile gallery', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Importar nova OS/i }))

    const erpImageInput = screen.getByLabelText('Imagem do ERP')
    expect(erpImageInput).toHaveAttribute('accept', 'image/*')
    expect(erpImageInput).not.toHaveAttribute('capture')
  })

  it('shows the approved identity and changes to the night theme', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'ROTAS MUNDIVOX' }),
    ).toBeVisible()
    expect(
      screen.getByText('Desenvolvido por Diogo Felippe Do Nascimento'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Exportar backup' })).toBeVisible()
    expect(screen.getByLabelText('Restaurar backup')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Calcular distância' })).toBeVisible()
    expect(screen.getByLabelText('Endereço de destino')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Ativar tema noturno' }),
    )

    expect(document.documentElement).toHaveAttribute('data-theme', 'night')
  })

  it('imports the ERP image and ConnectMaster PDF, then saves the order', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Importar nova OS/i }))
    await user.upload(
      screen.getByLabelText('Imagem do ERP'),
      new File(['image'], 'erp.png', { type: 'image/png' }),
    )
    await user.upload(
      screen.getByLabelText('PDF do ConnectMaster'),
      new File(['pdf'], 'rota.pdf', { type: 'application/pdf' }),
    )

    expect(await screen.findByDisplayValue('98216')).toBeVisible()
    expect(screen.getByDisplayValue('CDI BARRA PRODUTOS IMPORTADOS LTDA')).toBeVisible()
    expect(screen.getByText('CEO-RJO-0001')).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Selecionar endereço importado' })).toBeVisible()
    expect(screen.getByText('Dados compatíveis: OS 98216')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Salvar ordem de serviço' }))

    expect(await screen.findByText('OS 98216 salva neste aparelho.')).toBeVisible()
    expect(screen.getByText('CDI BARRA PRODUTOS IMPORTADOS LTDA')).toBeVisible()
    expect(screen.getByText('Rack: RACK-01')).toBeVisible()
    expect(screen.getByText('Slot: 1')).toBeVisible()

    cleanup()
    render(<App />)

    expect(await screen.findByText('OS 98216')).toBeVisible()
    expect(screen.getByText('Rack: RACK-01')).toBeVisible()
    expect(screen.getByText('Slot: 1')).toBeVisible()

    await user.type(screen.getByRole('searchbox', { name: 'Pesquisar OS ou cliente' }), 'inexistente')
    expect(screen.getByText('Nenhuma OS encontrada.')).toBeVisible()
    await user.clear(screen.getByRole('searchbox', { name: 'Pesquisar OS ou cliente' }))

    await user.click(screen.getByRole('button', { name: 'Abrir OS 98216' }))

    expect(screen.getByRole('heading', { name: 'Detalhes da OS 98216' })).toBeVisible()
    expect(screen.getByText('10.10.8.233')).toBeVisible()
    expect(screen.getByText(/12F-RJO-0001/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Abrir endereço no mapa' })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/search'),
    )
    expect(screen.getByRole('link', { name: 'Abrir no Waze' })).toHaveAttribute(
      'href',
      expect.stringContaining('waze.com/ul'),
    )
    expect(screen.getByRole('spinbutton', { name: 'Número global da fibra' })).toHaveValue(3)
    expect(screen.getByText('Fibra 3 (Global 3)')).toBeVisible()

    await user.clear(screen.getByRole('spinbutton', { name: 'Número global da fibra' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Número global da fibra' }), '19')
    expect(screen.getByText('Grupo 2')).toBeVisible()
    expect(screen.getByText('Fibra 7 (Global 19)')).toBeVisible()
  })

  it('blocks saving when the ERP and PDF identify different service orders', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Importar nova OS/i }))
    await user.upload(screen.getByLabelText('Imagem do ERP'), new File(['image'], 'erp.png', { type: 'image/png' }))
    await user.upload(screen.getByLabelText('PDF do ConnectMaster'), new File(['pdf'], '98533_rota.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('Atenção: o ERP indica OS 98216, mas o PDF indica OS 98533.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Salvar ordem de serviço' }))
    expect(screen.getByText('Confira a divergência entre ERP e PDF antes de salvar.')).toBeVisible()
  })
})
