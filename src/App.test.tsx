import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

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
})
