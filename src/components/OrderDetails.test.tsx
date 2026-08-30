import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ServiceOrder } from '../domain/order'
import { OrderDetails } from './OrderDetails'

const order: ServiceOrder = {
  id: 'os-two-routes', code: '98533', customer: 'Cliente teste', address: 'Rua Inicial, 1',
  building: '', rack: 'RACK-02', slot: '2', switchPort: '1/1/2', switchIp: '10.0.0.2',
  createdAt: '2026-08-30T12:00:00.000Z', updatedAt: '2026-08-30T12:00:00.000Z',
  rawErpText: '', rawRouteText: '', warnings: [],
  segments: [
    { sequence: 0, address: 'Rua A, 10', component: 'CEO-RJO-1', cable: '12F-1', point: 'Fibra03', opticalLengthMeters: 10 },
    { sequence: 1, address: 'Rua B, 20', component: 'CEO-RJO-2', cable: '48F-2', point: 'G2-F7', opticalLengthMeters: 20 },
  ],
}

describe('order route details', () => {
  it('changes the technical panel, navigation and ABNT fiber with the selected location', async () => {
    const user = userEvent.setup()
    render(<OrderDetails order={order} onBack={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('Selecionar endereço da rota'), '1')

    expect(screen.getByText('CEO-RJO-2')).toBeVisible()
    expect(screen.getByText('48F-2')).toBeVisible()
    expect(screen.getByRole('spinbutton', { name: 'Número global da fibra' })).toHaveValue(19)
    expect(screen.getByText('Fibra 7 (Global 19)')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Abrir no Waze' })).toHaveAttribute(
      'href', expect.stringContaining('Rua%20B%2C%2020'),
    )
  })
})
