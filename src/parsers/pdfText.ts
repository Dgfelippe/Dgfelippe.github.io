interface PdfTextItem {
  str: string
  hasEOL: boolean
}

export function assemblePdfText(items: PdfTextItem[]): string {
  return items.map((item) => `${item.str}${item.hasEOL ? '\n' : ''}`).join('')
}

type PdfJsApi = Pick<typeof import('pdfjs-dist/legacy/build/pdf.mjs'), 'getDocument'>

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  return extractPdfTextWithPdfJs(buffer, pdfjs)
}

export async function extractPdfTextWithPdfJs(buffer: ArrayBuffer, pdfjs: PdfJsApi): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const document = await loadingTask.promise
  const pages: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const items = content.items
        .filter((item): item is typeof item & PdfTextItem => 'str' in item)
        .map((item) => ({ str: item.str, hasEOL: item.hasEOL }))
      pages.push(assemblePdfText(items))
    }
  } finally {
    await loadingTask.destroy()
  }

  return pages.join('\n')
}
