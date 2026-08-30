import type { RouteSegment } from '../domain/order'

export interface ParsedConnectMaster {
  orderCode: string | null
  segments: RouteSegment[]
  warnings: string[]
}

interface PendingComponent {
  address: string
  component: string
}

const COMPONENT_LINE = /^(.*?)\s+(CEO-[^\s]+|Rack\s+44U-[^\s]+|TOA\s+2F-[^\s]+)\s+(?:Fibra\s*\d+|G\d+\s*-\s*F\d+|P\d+)\s+[\d.,]+$/i
const CABLE_LINE = /^((?:12|24|48|72|144)F[^\s]*)\s+(Fibra\s*\d+|G\d+\s*-\s*F\d+)\s+([\d.,]+)$/i

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function cleanAddress(value: string): string {
  return value.replace(/^(?:RIO DE JANEIRO\s+)+/i, '').trim()
}

function parseNumber(value: string): number | null {
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseConnectMasterText(text: string): ParsedConnectMaster {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean)
  const orderMatch = text.match(/(?:Ordem\s+de\s+Servi[cç]o|OS)\s*:?\s*(\d{4,})/i)
  const segments: RouteSegment[] = []
  const warnings: string[] = []
  let pending: PendingComponent | null = null

  for (const line of lines) {
    const componentMatch = line.match(COMPONENT_LINE)
    if (componentMatch) {
      if (pending) {
        warnings.push(`O componente ${pending.component} não possui cabo associado.`)
      }
      pending = {
        address: cleanAddress(componentMatch[1]),
        component: normalizeLine(componentMatch[2]),
      }
      continue
    }

    const cableMatch = line.match(CABLE_LINE)
    if (cableMatch && pending) {
      segments.push({
        sequence: segments.length,
        address: pending.address,
        component: pending.component,
        cable: cableMatch[1],
        point: cableMatch[2].replace(/\s+/g, ''),
        opticalLengthMeters: parseNumber(cableMatch[3]),
      })
      pending = null
    }
  }

  if (pending) {
    warnings.push(`O componente ${pending.component} não possui cabo associado.`)
  }
  if (segments.length === 0 && warnings.length === 0) {
    warnings.push('Nenhum trecho de rota foi reconhecido no relatório.')
  }

  return {
    orderCode: orderMatch?.[1] ?? null,
    segments,
    warnings,
  }
}
