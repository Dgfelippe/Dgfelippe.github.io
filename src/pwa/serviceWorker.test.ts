import serviceWorker from '../../public/sw.js?raw'
import { describe, expect, it } from 'vitest'

describe('service worker offline', () => {
  it('usa uma estratégia de cache runtime somente para recursos da própria aplicação', () => {
    expect(serviceWorker).toContain("const url = new URL(event.request.url)")
    expect(serviceWorker).toContain("event.request.destination === 'document'")
    expect(serviceWorker).toContain("event.request.mode === 'navigate'")
  })

  it('não transforma falhas de recursos externos em entradas no cache local', () => {
    expect(serviceWorker).toContain("if (url.origin !== self.location.origin) return")
  })
})
