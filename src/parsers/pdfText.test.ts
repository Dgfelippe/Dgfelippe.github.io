import { describe, expect, it } from 'vitest'
import { assemblePdfText } from './pdfText'

describe('PDF text assembly', () => {
  it('preserves line endings so route rows remain parseable', () => {
    expect(
      assemblePdfText([
        { str: 'Rua Ipadu, 520 ', hasEOL: false },
        { str: 'CEO-RJO-0001', hasEOL: true },
        { str: '12F-RJO-0001 Fibra03 180', hasEOL: true },
      ]),
    ).toBe('Rua Ipadu, 520 CEO-RJO-0001\n12F-RJO-0001 Fibra03 180\n')
  })
})
