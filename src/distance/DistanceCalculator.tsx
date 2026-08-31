import { useState } from 'react'
import { AddressNotFoundError, calculateRoadDistance, getCurrentCoordinates, LocationPermissionError, type Coordinates } from './distanceService'

interface DistanceCalculatorProps {
  getCurrentCoordinates?: () => Promise<Coordinates>
  calculateRoadDistance?: (origin: Coordinates, destination: string) => Promise<number>
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters).toLocaleString('pt-BR')} m`
  return `${(meters / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
}

export function DistanceCalculator({ getCurrentCoordinates: locate = getCurrentCoordinates, calculateRoadDistance: route = calculateRoadDistance }: DistanceCalculatorProps) {
  const [destination, setDestination] = useState('')
  const [distance, setDistance] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function calculate() {
    const address = destination.trim()
    setDistance(null)
    setError('')
    if (!address) {
      setError('Digite o endereço de destino.')
      return
    }

    setBusy(true)
    try {
      const origin = await locate()
      setDistance(await route(origin, address))
    } catch (caught) {
      if (caught instanceof LocationPermissionError) setError('A permissão de localização é necessária para calcular a distância.')
      else if (caught instanceof AddressNotFoundError) setError('Endereço não encontrado. Confira o endereço digitado.')
      else setError('Não foi possível consultar a rota agora. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="distance-panel" aria-labelledby="distance-title">
    <div><p className="eyebrow">Rota real pelas ruas</p><h2 id="distance-title">Calcular distância</h2></div>
    <div className="distance-form"><label htmlFor="distance-destination">Endereço de destino</label><div><input id="distance-destination" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Digite o endereço completo" /><button type="button" onClick={calculate} disabled={busy}>{busy ? 'Calculando…' : 'Calcular distância'}</button></div></div>
    {distance != null && <div className="distance-result" role="status"><small>Distância real pela rota</small><strong>{formatDistance(distance)}</strong><span>Powered by Google, ©{new Date().getFullYear()} Google</span></div>}
    {error && <p className="distance-error" role="alert">{error}</p>}
  </section>
}
