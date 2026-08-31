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
  point: string | null
  opticalLengthMeters: number | null
}

const POINT_AND_LENGTH = /^(.*?)\s+(Fibra\s*\d+|G\s*\d+\s*-\s*F\s*\d+|S\s*\d+\s*-\s*P\s*\d+|P\s*\d+|\d+)\s+([\d.,]+)$/i
const COMPONENT_MARKER = /\b(?:CEO[S]?-RJO-|Rack\s+44U-|TOA\s+2F-|(?:12|24|48|72|144)F-)/i
const ADDRESS_PREFIX = /^(?:Rua|R\.|Avenida|Av\.|Estrada|Rodovia|Travessa|Tv\.|Alameda|Praça|Largo)\b/i

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
  if (!pending.point) return
  segments.push({
    sequence: segments.length,
    address: pending.address,
    component: pending.component,
    cable: '',
    point: pending.point,
    opticalLengthMeters: pending.opticalLengthMeters,
  })
}

function flushPending(
  segments: RouteSegment[],
  warnings: string[],
  pending: PendingComponent,
): void {
  if (pending.point) {
    appendEndpoint(segments, pending)
    warnings.push(`O componente ${pending.component} não possui cabo de saída identificado.`)
    return
  }
  warnings.push(`O componente ${pending.component} não possui ponto óptico ou cabo de saída identificado.`)
}

function isAddressLine(line: string): boolean {
  return ADDRESS_PREFIX.test(line) && !COMPONENT_MARKER.test(line)
}

function extractComponent(line: string): { address: string, component: string } | null {
  const marker = line.match(COMPONENT_MARKER)
  if (!marker?.index && marker?.index !== 0) return null
  return {
    address: line.slice(0, marker.index).trim(),
    component: line.slice(marker.index).trim(),
  }
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
  let lastAddress = ''

  for (const originalLine of lines) {
    if (/^(?:Ponto:|ConnectMaster\s|Relat[oó]rio\s+ConnectMaster|P[aá]gina\s+\d+|Emitido\s+em\s)/i.test(originalLine)) continue
    const hasCityPrefix = /RIO DE JANEIRO/i.test(originalLine)
    const line = removeReportAndCityPrefix(originalLine)

    if (!hasCityPrefix && isAddressLine(line)) {
      lastAddress = line
      continue
    }

    const parsedLine = parseRouteLine(line)
    if (!parsedLine) {
      if (!hasCityPrefix) {
        const standalone = extractComponent(line)
        if (standalone && standalone.address === '') {
          if (pending) flushPending(segments, warnings, pending)
          pending = {
            address: lastAddress,
            component: standalone.component,
            point: null,
            opticalLengthMeters: null,
          }
        }
      }
      continue
    }

    const marker = parsedLine.beforePoint.match(COMPONENT_MARKER)
    if (!marker?.index && marker?.index !== 0) continue

    const isLocation = hasCityPrefix || marker.index > 0
    if (isLocation) {
      if (pending) flushPending(segments, warnings, pending)
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

  if (pending) flushPending(segments, warnings, pending)
  if (segments.length === 0) {
    warnings.push('Nenhum trecho de rota foi reconhecido no relatório.')
  }

  return { orderCode: orderMatch?.[1] ?? null, segments, warnings }
}
