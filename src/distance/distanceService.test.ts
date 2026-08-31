import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateRoadDistance, getCurrentCoordinates } from './distanceService'

describe('distance service', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns distanceMeters from a real driving route request', async () => {
    const computeRoutes = vi.fn().mockResolvedValue({ routes: [{ distanceMeters: 2847 }] })
    const loadRoutes = vi.fn().mockResolvedValue({ Route: { computeRoutes } })

    const result = await calculateRoadDistance(
      { latitude: -22.9068, longitude: -43.1729 },
      'Rua Ipadu, 520, Rio de Janeiro',
      loadRoutes,
    )

    expect(result).toBe(2847)
    expect(computeRoutes).toHaveBeenCalledWith({
      origin: { lat: -22.9068, lng: -43.1729 },
      destination: 'Rua Ipadu, 520, Rio de Janeiro',
      travelMode: 'DRIVING',
      units: 'METRIC',
      fields: ['distanceMeters'],
    })
  })

  it('requests the browser current position with high accuracy', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: -22.9, longitude: -43.1 } } as GeolocationPosition))
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })

    await expect(getCurrentCoordinates()).resolves.toEqual({ latitude: -22.9, longitude: -43.1 })
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
  })
})
