export interface OcrWorker {
  recognize(image: Blob): Promise<{ data: { text: string } }>
  terminate(): Promise<unknown>
}

type OcrWorkerFactory = () => Promise<OcrWorker>

async function createPortugueseWorker(): Promise<OcrWorker> {
  const { createWorker } = await import('tesseract.js')
  return createWorker('por') as Promise<OcrWorker>
}

export async function recognizeErpImage(
  image: Blob,
  createWorker: OcrWorkerFactory = createPortugueseWorker,
): Promise<string> {
  const worker = await createWorker()
  try {
    const result = await worker.recognize(image)
    return result.data.text.trim()
  } finally {
    await worker.terminate()
  }
}
