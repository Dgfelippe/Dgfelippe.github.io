import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DistanceCalculator } from './DistanceCalculator'
import { AddressNotFoundError, LocationPermissionError } from './distanceService'

const coordinates = { latitude: -22.9068, longitude: -43.1729 }

describe('DistanceCalculator', () => {
  it('requires a destination address before requesting location', async () => {
    const user = userEvent.setup()
    const getCurrentCoordinates = vi.fn()
    render(<DistanceCalculator getCurrentCoordinates={getCurrentCoordinates} calculateRoadDistance={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Calcular distância' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Digite o endereço de destino.')
    expect(getCurrentCoordinates).not.toHaveBeenCalled()
  })

  it('shows that location permission is required when access is denied', async () => {
    const user = userEvent.setup()
    render(<DistanceCalculator getCurrentCoordinates={vi.fn().mockRejectedValue(new LocationPermissionError())} calculateRoadDistance={vi.fn()} />)

    await user.type(screen.getByLabelText('Endereço de destino'), 'Rua Ipadu, 520, Rio de Janeiro')
    await user.click(screen.getByRole('button', { name: 'Calcular distância' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A permissão de localização é necessária para calcular a distância.')
  })

  it('reports an address that the routing API cannot find', async () => {
    const user = userEvent.setup()
    render(<DistanceCalculator getCurrentCoordinates={vi.fn().mockResolvedValue(coordinates)} calculateRoadDistance={vi.fn().mockRejectedValue(new AddressNotFoundError())} />)

    await user.type(screen.getByLabelText('Endereço de destino'), 'endereço inexistente')
    await user.click(screen.getByRole('button', { name: 'Calcular distância' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Endereço não encontrado. Confira o endereço digitado.')
  })

  it('shows a comprehensible message when the routes API fails', async () => {
    const user = userEvent.setup()
    render(<DistanceCalculator getCurrentCoordinates={vi.fn().mockResolvedValue(coordinates)} calculateRoadDistance={vi.fn().mockRejectedValue(new Error('network'))} />)

    await user.type(screen.getByLabelText('Endereço de destino'), 'Avenida Rio Branco, 1, Rio de Janeiro')
    await user.click(screen.getByRole('button', { name: 'Calcular distância' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível consultar a rota agora. Tente novamente.')
  })

  it('displays the real road distance returned by the routes API', async () => {
    const user = userEvent.setup()
    const calculateRoadDistance = vi.fn().mockResolvedValue(1234)
    render(<DistanceCalculator getCurrentCoordinates={vi.fn().mockResolvedValue(coordinates)} calculateRoadDistance={calculateRoadDistance} />)

    await user.type(screen.getByLabelText('Endereço de destino'), 'Rua Ipadu, 520, Rio de Janeiro')
    await user.click(screen.getByRole('button', { name: 'Calcular distância' }))

    expect(await screen.findByRole('status')).toHaveTextContent('1,23 km')
    expect(calculateRoadDistance).toHaveBeenCalledWith(coordinates, 'Rua Ipadu, 520, Rio de Janeiro')
  })
})
