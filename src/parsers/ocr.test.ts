import { describe, expect, it, vi } from 'vitest'
import { recognizeErpImage, type OcrWorker } from './ocr'

describe('ERP image recognition', () => {
  it('returns recognized text and always releases the OCR worker', async () => {
    const terminate = vi.fn(async () => undefined)
    const worker: OcrWorker = {
      recognize: vi.fn(async () => ({ data: { text: 'OS: 98216' } })),
      terminate,
    }

    await expect(recognizeErpImage(new Blob(['image']), async () => worker)).resolves.toBe(
      'OS: 98216',
    )
    expect(terminate).toHaveBeenCalledOnce()
  })
})
