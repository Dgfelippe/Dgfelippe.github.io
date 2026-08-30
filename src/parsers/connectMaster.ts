import type { RouteSegment } from '../domain/order'

export interface ParsedConnectMaster {
  orderCode: string | null
  segments: RouteSegment[]
  warnings: string[]
}

interface ParsedRouteLine {
  beforePoint: string
  point: string
  opticalLengthMeters: number | null
}

interface PendingComponent {
  address: string
  component: string
  point: string
  opticalLengthMeters: number | null
}

const POINT_AND_LENGTH = /^(.*?)\s+(Fibra\s*\d+|G\s*\d+\s*-\s*F\s*\d+|S\s*\d+\s*-\s*P\s*\d+|P\s*\d+|\d+)\s+([\d.,]+)$/i
const COMPONENT_MARKER = /\b(?:CEO[S]?-RJO-|Rack\s+44U-|TOA\s+2F-|(?:12|24|48|72|144)F-)/i

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function removeReportAndCityPrefix(value: string): string {
  const cityPair = value.match(/(?:RIO DE JANEIRO\s+){2}/i)
  if (cityPair?.index != null) {
    return value.slice(cityPair.index + cityPair[0].length).trim()
  }
  return value.replace(/^(?:RIO DE JANEIRO\s+)+/i, '').trim()
}

function parseNumber(value: string): number | null {
  let normalized = value
  if (value.includes(',') && value.includes('.')) {
    normalized = value.lastIndexOf('.') > value.lastIndexOf(',')
      ? value.replace(/,/g, '')
      : value.replace(/\./g, '').replace(',', '.')
  } else if (value.includes(',')) {
    normalized = value.replace(',', '.')
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseRouteLine(line: string): ParsedRouteLine | null {
  const match = line.match(POINT_AND_LENGTH)
  if (!match) return null
  return {
    beforePoint: match[1].trim(),
    point: match[2].replace(/\s+/g, ''),
    opticalLengthMeters: parseNumber(match[3]),
  }
}

function appendEndpoint(segments: RouteSegment[], pending: PendingComponent): void {
  segments.push({
    sequence: segments.length,
    address: pending.address,
    component: pending.component,
    cable: '',
    point: pending.point,
    opticalLengthMeters: pending.opticalLengthMeters,
  })
}

export function parseOrderCodeFromFilename(filename: string): string | null {
  return filename.match(/(?:^|\D)(\d{4,})(?=\D|$)/)?.[1] ?? null
}

export function parseConnectMasterText(text: string): ParsedConnectMaster {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean)
  const orderMatch = text.match(/(?:Ordem\s+de\s+Servi[cç]o|\bOS\b)\s*:?\s*(\d{4,})/i)
  const segments: RouteSegment[] = []
  const warnings: string[] = []
  let pending: PendingComponent | null = null

  for (const originalLine of lines) {
    if (/^(?:Ponto:|ConnectMaster\s)/i.test(originalLine)) continue
    const hasCityPrefix = /RIO DE JANEIRO/i.test(originalLine)
    const line = removeReportAndCityPrefix(originalLine)
    const parsedLine = parseRouteLine(line)
    if (!parsedLine) continue

    const marker = parsedLine.beforePoint.match(COMPONENT_MARKER)
    if (!marker?.index && marker?.index !== 0) continue

    const isLocation = hasCityPrefix || marker.index > 0
    if (isLocation) {
      if (pending) {
        appendEndpoint(segments, pending)
        warnings.push(`O componente ${pending.component} não possui cabo de saída identificado.`)
      }
      pending = {
        address: parsedLine.beforePoint.slice(0, marker.index).trim(),
        component: parsedLine.beforePoint.slice(marker.index).trim(),
        point: parsedLine.point,
        opticalLengthMeters: parsedLine.opticalLengthMeters,
      }
      continue
    }

    if (pending) {
      segments.push({
        sequence: segments.length,
        address: pending.address,
        component: pending.component,
        cable: parsedLine.beforePoint,
        point: parsedLine.point,
        opticalLengthMeters: parsedLine.opticalLengthMeters,
      })
      pending = null
    }
  }

  if (pending) {
    appendEndpoint(segments, pending)
    warnings.push(`O componente final ${pending.component} não possui cabo de saída, mas foi preservado.`)
  }
  if (segments.length === 0) {
    warnings.push('Nenhum trecho de rota foi reconhecido no relatório.')
  }

  return { orderCode: orderMatch?.[1] ?? null, segments, warnings }
}
