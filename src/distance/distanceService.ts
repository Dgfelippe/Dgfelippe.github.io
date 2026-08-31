export interface Coordinates {
  latitude: number
  longitude: number
}

interface RouteResult {
  distanceMeters?: number
}

interface RoutesLibrary {
  Route: {
    computeRoutes(request: {
      origin: { lat: number; lng: number }
      destination: string
      travelMode: 'DRIVING'
      units: 'METRIC'
      fields: ['distanceMeters']
    }): Promise<{ routes?: RouteResult[] }>
  }
}

type RoutesLoader = () => Promise<RoutesLibrary>

declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary(name: 'routes'): Promise<unknown>
      }
    }
  }
}

export class LocationPermissionError extends Error {}
export class LocationUnavailableError extends Error {}
export class AddressNotFoundError extends Error {}

let googleMapsPromise: Promise<void> | null = null

function loadGoogleMapsScript(): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  if (googleMapsPromise) return googleMapsPromise

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  if (!apiKey) return Promise.reject(new Error('Google Maps API key is not configured'))

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps could not load'))
    document.head.append(script)
  })
  return googleMapsPromise
}

async function loadRoutesLibrary(): Promise<RoutesLibrary> {
  await loadGoogleMapsScript()
  if (!window.google?.maps) throw new Error('Google Maps is unavailable')
  return window.google.maps.importLibrary('routes') as Promise<RoutesLibrary>
}

export function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationUnavailableError())
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(error.code === error.PERMISSION_DENIED ? new LocationPermissionError() : new LocationUnavailableError()),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  })
}

export async function calculateRoadDistance(origin: Coordinates, destination: string, loadRoutes: RoutesLoader = loadRoutesLibrary): Promise<number> {
  try {
    const { Route } = await loadRoutes()
    const { routes } = await Route.computeRoutes({
      origin: { lat: origin.latitude, lng: origin.longitude },
      destination,
      travelMode: 'DRIVING',
      units: 'METRIC',
      fields: ['distanceMeters'],
    })
    const distance = routes?.[0]?.distanceMeters
    if (distance == null) throw new AddressNotFoundError()
    return distance
  } catch (error) {
    if (error instanceof AddressNotFoundError) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (/NOT_FOUND|ZERO_RESULTS/i.test(message)) throw new AddressNotFoundError()
    throw error
  }
}
