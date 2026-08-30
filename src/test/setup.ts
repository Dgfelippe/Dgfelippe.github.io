import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(async () => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  localStorage.clear()
  await Dexie.delete('rotas-mundivox')
})
