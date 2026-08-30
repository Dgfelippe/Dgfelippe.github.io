export interface ExtractedField {
  value: string | null
  confidence: number
}

export interface ParsedErp {
  orderCode: ExtractedField
  customer: ExtractedField
  building: ExtractedField
  address: ExtractedField
  rack: ExtractedField
  slot: ExtractedField
  switchIp: ExtractedField
  switchPort: ExtractedField
  warnings: string[]
}

function extract(text: string, pattern: RegExp): ExtractedField {
  const value = text.match(pattern)?.[1]?.replace(/\s+/g, ' ').trim() || null
  return { value, confidence: value ? 0.95 : 0 }
}

export function parseErpText(rawText: string): ParsedErp {
  const text = rawText.replace(/\r/g, '')
  const parsed: ParsedErp = {
    orderCode: extract(text, /(?:Ordem\s*(?:de\s*)?Servi[cç]o|N[º°o]?\s*(?:da\s*)?O\.?\s*S\.?|O\.?\s*S\.?)\s*(?:n[º°o]?\s*)?[:#-]?\s*(\d{4,})/i),
    customer: extract(text, /Cliente\s*:\s*([^\n]+)/i),
    building: extract(text, /Pr[eé]dio\s*:\s*([^\n]+)/i),
    address: extract(text, /Endere[cç]o\s+Cliente\s*:\s*([^\n]+)/i),
    rack: extract(text, /Rack(?:\s*\/\s*DGO)?\s*[:#-]?\s*(.+?)(?=\s+Slot(?:\s*\/\s*M[oó]dulo)?\s*[:#-]?|\n|$)/i),
    slot: extract(text, /Slot(?:\s*\/\s*M[oó]dulo)?\s*[:#-]?\s*([^\s]+)/i),
    switchIp: extract(text, /IP\s+do\s+switch\s*:\s*((?:\d{1,3}\.){3}\d{1,3})/i),
    switchPort: extract(text, /Porta\s+do\s+switch\s*:\s*([\w/-]+)/i),
    warnings: [],
  }

  const warningLabels: Array<[keyof Omit<ParsedErp, 'warnings'>, string]> = [
    ['orderCode', 'Número da OS'],
    ['customer', 'Cliente'],
    ['address', 'Endereço do cliente'],
    ['rack', 'Rack'],
    ['slot', 'Slot'],
    ['switchIp', 'IP do switch'],
    ['switchPort', 'Porta do switch'],
  ]
  for (const [key, label] of warningLabels) {
    if (!parsed[key].value) {
      parsed.warnings.push(`${label} não identificado; revise manualmente.`)
    }
  }

  return parsed
}
