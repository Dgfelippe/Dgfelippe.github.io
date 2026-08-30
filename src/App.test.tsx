import { render, screen } from '@testing-library/react'
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
  it('shows the approved identity and changes to the night theme', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'ROTAS MUNDIVOX' }),
    ).toBeVisible()
    expect(
      screen.getByText('Desenvolvido por Diogo Felippe Do Nascimento'),
    ).toBeVisible()

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
      screen.getByLabelText('Foto ou print do ERP'),
      new File(['image'], 'erp.png', { type: 'image/png' }),
    )
    await user.upload(
      screen.getByLabelText('PDF do ConnectMaster'),
      new File(['pdf'], 'rota.pdf', { type: 'application/pdf' }),
    )

    expect(await screen.findByDisplayValue('98216')).toBeVisible()
    expect(screen.getByDisplayValue('CDI BARRA PRODUTOS IMPORTADOS LTDA')).toBeVisible()
    expect(screen.getByText('CEO-RJO-0001')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Salvar ordem de serviço' }))

    expect(await screen.findByText('OS 98216 salva neste aparelho.')).toBeVisible()
    expect(screen.getByText('CDI BARRA PRODUTOS IMPORTADOS LTDA')).toBeVisible()
  })
})
