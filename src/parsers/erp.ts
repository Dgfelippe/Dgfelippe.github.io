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
  customerIp: ExtractedField
  popAddress: ExtractedField
  instructions: ExtractedField
  serviceType: ExtractedField
  serviceStatus: ExtractedField
  scheduledWindow: ExtractedField
  occurrence: ExtractedField
  activity: ExtractedField
  warnings: string[]
}

function field(value?: string | null, confidence = 0.95): ExtractedField {
  const normalized = value?.replace(/\s+/g, ' ').trim() || null
  return { value: normalized, confidence: normalized ? confidence : 0 }
}

function extract(text: string, pattern: RegExp, confidence = 0.95): ExtractedField {
  return field(text.match(pattern)?.[1], confidence)
}

function extractHeader(lines: string[]): { code: ExtractedField, customer: ExtractedField } {
  const index = lines.findIndex((line) => /^\d{4,}\s*-/.test(line))
  if (index < 0) return { code: field(), customer: field() }
  const first = lines[index].match(/^(\d{4,})\s*-\s*(.*)$/)!
  const customerParts = [first[2]]
  for (let next = index + 1; next < lines.length; next += 1) {
    if (/^(?:CLIENTES\s*-|MUNDIVOX\s*-|DESLOCAMENTO\b|\d{2}\/\d{2}\/\d{4}\b|Pr[eé]dio\s*:)/i.test(lines[next])) break
    customerParts.push(lines[next])
  }
  return { code: field(first[1]), customer: field(customerParts.join(' '), 0.9) }
}

export function parseErpText(rawText: string): ParsedErp {
  const text = rawText.replace(/\r/g, '')
  const lines = text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const compact = lines.join(' ')
  const header = extractHeader(lines)
  const labeledOrder = extract(text, /(?:Ordem\s*(?:de\s*)?Servi[cç]o|N[º°o]?\s*(?:da\s*)?O\.?\s*S\.?|O\.?\s*S\.?)\s*(?:n[º°o]?\s*)?[:#-]?\s*(\d{4,})/i)
  const labeledCustomer = extract(text, /^Cliente\s*:\s*([^\n]+)/im)
  const customerAddress = extract(compact, /Endere[cç]o\s+do\s+cliente\s*:\s*(.*?)(?=Endere[cç]o\s+do\s+POP\s*:|Instru[cç][oõ]es\s+do\s+que\s+fazer\s*:|Servi[cç]o\s+|Ocorr[eê]ncia\s*:|Atividade\s*:|$)/i, 0.9)
  const labeledAddress = extract(compact, /Endere[cç]o\s+Cliente\s*:\s*(.*?)(?=Contato\s*:|$)/i, 0.9)
  const buildingAddress = extract(compact, /Endere[cç]o\s+Pr[eé]dio\s*:\s*(.*?)(?=Contato\s*:|$)/i, 0.88)
  const explicitInstructions = extract(compact, /Instru[cç][oõ]es\s+do\s+que\s+fazer\s*:\s*(.*?)(?=Servi[cç]o\s+[A-Z]|Ocorr[eê]ncia\s*:|Atividade\s*:|$)/i, 0.88)
  const contactAsInstructions = extract(compact, /Contato\s*:\s*(.*?)(?=Ocorr[eê]ncia\s*:|Atividade\s*:|$)/i, 0.75)

  const parsed: ParsedErp = {
    orderCode: labeledOrder.value ? labeledOrder : header.code,
    customer: labeledCustomer.value ? labeledCustomer : header.customer,
    building: extract(compact, /Pr[eé]dio\s*:\s*(.*?)(?=(?:Es?\s*)?Detalhamento\b|Endere[cç]o\s+(?:Cliente|Pr[eé]dio|do\s+cliente)\s*:|Contato\s*:|$)/i),
    address: customerAddress.value ? customerAddress : labeledAddress.value ? labeledAddress : buildingAddress,
    rack: extract(text, /Rack(?:\s*\/\s*DGO)?\s*[:#-]?\s*(.+?)(?=\s+Slot(?:\s*\/\s*M[oó]dulo)?\s*[:#-]?|\n|$)/i),
    slot: extract(text, /Slot(?:\s*\/\s*M[oó]dulo)?\s*[:#-]?\s*([^\s]+)/i),
    switchIp: extract(compact, /IP\s+do\s+switch\s*:\s*((?:\d{1,3}\.){3}\d{1,3})/i),
    switchPort: extract(compact, /Porta\s+do\s+switch\s*:\s*([A-Za-z]*\s*\d+(?:\/\d+)+)/i),
    customerIp: extract(compact, /IP\s+do\s+cliente\s*:\s*((?:\d{1,3}\.){3}\d{1,3})/i),
    popAddress: extract(compact, /Endere[cç]o\s+do\s+POP\s*:\s*(.*?)(?=Instru[cç][oõ]es\s+do\s+que\s+fazer\s*:|Servi[cç]o\s+[A-Z]|Ocorr[eê]ncia\s*:|Atividade\s*:|$)/i, 0.9),
    instructions: explicitInstructions.value ? explicitInstructions : contactAsInstructions,
    serviceType: field(lines.find((line) => /^(?:CLIENTES|MUNDIVOX)\s*-\s*.+/i.test(line)), 0.9),
    serviceStatus: field(lines.find((line) => /^(?:DESLOCAMENTO|AGENDADO|EM\s+ATENDIMENTO|CONCLU[IÍ]DO)\b/i.test(line)), 0.9),
    scheduledWindow: field(lines.find((line) => /^\d{2}\/\d{2}\/\d{4}.*(?:at[eé]|às)/i.test(line)), 0.9),
    occurrence: extract(compact, /Ocorr[eê]ncia\s*:\s*(\d+)/i),
    activity: extract(compact, /Atividade\s*:\s*(\d+)/i),
    warnings: [],
  }

  const warningLabels: Array<[keyof Omit<ParsedErp, 'warnings'>, string]> = [
    ['orderCode', 'Número da OS'], ['customer', 'Cliente'], ['address', 'Endereço do cliente'],
    ['rack', 'Rack'], ['slot', 'Slot'], ['switchIp', 'IP do switch'], ['switchPort', 'Porta do switch'],
  ]
  for (const [key, label] of warningLabels) {
    if (!parsed[key].value) parsed.warnings.push(`${label} não identificado; revise manualmente.`)
  }

  return parsed
}
