/// <reference types="node" />

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { extractPdfTextWithPdfJs } from './pdfText'

function createPdfWithText(text: string): ArrayBuffer {
  const encoder = new TextEncoder()
  const stream = `BT /F1 12 Tf 72 72 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(encoder.encode(pdf).length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const xrefOffset = encoder.encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return encoder.encode(pdf).buffer
}

describe('PDF text extraction on Safari-compatible browsers', () => {
  it('extracts text when Promise.withResolvers is unavailable on older iOS WebKit', async () => {
    const promiseConstructor = Promise as PromiseConstructor & {
      withResolvers?: () => unknown
    }
    const originalWithResolvers = promiseConstructor.withResolvers

    try {
      Object.defineProperty(Promise, 'withResolvers', {
        configurable: true,
        value: undefined,
        writable: true,
      })

      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
        resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'),
      ).href

      await expect(
        extractPdfTextWithPdfJs(createPdfWithText('OS 87729'), pdfjs),
      ).resolves.toContain('OS 87729')
    } finally {
      Object.defineProperty(Promise, 'withResolvers', {
        configurable: true,
        value: originalWithResolvers,
        writable: true,
      })
    }
  })

  it('extracts text from a real PDF with the Safari-compatible build', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
      resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'),
    ).href

    await expect(
      extractPdfTextWithPdfJs(createPdfWithText('OS 87729'), pdfjs),
    ).resolves.toContain('OS 87729')
  })
})
