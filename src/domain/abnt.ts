export const ABNT_COLORS = [
  'VERDE',
  'AMARELO',
  'BRANCO',
  'AZUL',
  'VERMELHO',
  'VIOLETA',
  'MARROM',
  'ROSA',
  'PRETO',
  'CINZA',
  'LARANJA',
  'AQUA',
] as const

export type AbntColor = (typeof ABNT_COLORS)[number]

export interface AbntIdentification {
  globalFiber: number
  group: number
  groupColor: AbntColor
  fiber: number
  fiberColor: AbntColor
}

export function calculateAbnt(globalFiber: number): AbntIdentification {
  if (!Number.isInteger(globalFiber) || globalFiber < 1 || globalFiber > 144) {
    throw new RangeError('A fibra global deve estar entre 1 e 144')
  }

  const group = Math.ceil(globalFiber / 12)
  const fiber = ((globalFiber - 1) % 12) + 1

  return {
    globalFiber,
    group,
    groupColor: ABNT_COLORS[(group - 1) % ABNT_COLORS.length],
    fiber,
    fiberColor: ABNT_COLORS[fiber - 1],
  }
}

export function parseFiberReference(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null

  const grouped = normalized.match(/^G\s*(\d+)\s*-\s*F\s*(\d+)$/i)
  if (grouped) {
    const group = Number(grouped[1])
    const fiber = Number(grouped[2])
    if (group < 1 || group > 12 || fiber < 1 || fiber > 12) return null
    return (group - 1) * 12 + fiber
  }

  const named = normalized.match(/^Fibra\s*0*(\d+)$/i)
  if (named) {
    const parsed = Number(named[1])
    return parsed >= 1 && parsed <= 144 ? parsed : null
  }

  if (/^\d+$/.test(normalized)) {
    const parsed = Number(normalized)
    return parsed >= 1 && parsed <= 144 ? parsed : null
  }

  return null
}
