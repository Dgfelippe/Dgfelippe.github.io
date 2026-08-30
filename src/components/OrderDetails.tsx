import { useMemo, useState } from 'react'
import { calculateAbnt, parseFiberReference, type AbntColor } from '../domain/abnt'
import type { ServiceOrder } from '../domain/order'

const COLOR_HEX: Record<AbntColor, string> = {
  VERDE: '#00a859', AMARELO: '#ffd400', BRANCO: '#f7fafc', AZUL: '#1769e0',
  VERMELHO: '#e53935', VIOLETA: '#7e57c2', MARROM: '#795548', ROSA: '#ec008c',
  PRETO: '#18181b', CINZA: '#808285', LARANJA: '#f7941e', AQUA: '#00a79d',
}

function badgeText(color: AbntColor): string {
  return color === 'AMARELO' || color === 'BRANCO' ? '#10263a' : '#ffffff'
}

interface OrderDetailsProps {
  order: ServiceOrder
  onBack: () => void
}

export function OrderDetails({ order, onBack }: OrderDetailsProps) {
  const [segmentIndex, setSegmentIndex] = useState(0)
  const initialFiber = parseFiberReference(order.segments[0]?.point ?? '') ?? 1
  const [fiberNumber, setFiberNumber] = useState<number | ''>(initialFiber)
  const segment = order.segments[segmentIndex]
  const identification = useMemo(() => {
    if (fiberNumber === '' || fiberNumber < 1 || fiberNumber > 144) return null
    return calculateAbnt(fiberNumber)
  }, [fiberNumber])

  function chooseSegment(index: number) {
    setSegmentIndex(index)
    setFiberNumber(parseFiberReference(order.segments[index]?.point ?? '') ?? 1)
  }

  const currentAddress = segment?.address || order.address
  const encodedAddress = encodeURIComponent(`${currentAddress}, Rio de Janeiro`)

  return <section className="detail-panel">
    <div className="section-heading"><div><p className="eyebrow">Ordem salva offline</p><h1>Detalhes da OS {order.code}</h1><p className="detail-customer">{order.customer || 'Cliente pendente de revisão'}</p></div><button className="secondary-button" type="button" onClick={onBack}>Voltar ao histórico</button></div>

    {order.segments.length > 0 && <div className="location-control"><label htmlFor="route-location">Selecionar endereço da rota</label><select id="route-location" value={segmentIndex} onChange={(event) => chooseSegment(Number(event.target.value))}>{order.segments.map((item, index) => <option value={index} key={`${item.sequence}-${item.address}`}>{index + 1}. {item.address} — {item.component}</option>)}</select><div className="navigation-row"><strong>{currentAddress}</strong><div><a href={`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`} target="_blank" rel="noreferrer">Abrir endereço no mapa</a><a href={`https://waze.com/ul?q=${encodedAddress}&navigate=yes`} target="_blank" rel="noreferrer">Abrir no Waze</a></div></div></div>}

    <div className="technical-grid">
      <article className="technical-card"><div className="card-title"><h2>Equipamento e switch</h2><span>OS {order.code}</span></div><dl><div><dt>Rack / DGO</dt><dd>{order.rack || '—'}</dd></div><div><dt>Slot / Módulo</dt><dd>{order.slot || '—'}</dd></div><div><dt>Porta do switch</dt><dd>{order.switchPort || '—'}</dd></div><div><dt>IP do switch</dt><dd>{order.switchIp || '—'}</dd></div></dl></article>
      <article className="technical-card"><div className="card-title"><h2>Trecho óptico selecionado</h2><span>ConnectMaster</span></div><dl><div><dt>Componente / Caixa</dt><dd>{segment?.component || '—'}</dd></div><div><dt>Cabo</dt><dd>{segment?.cable || '—'}</dd></div><div><dt>Ponto / Conexão</dt><dd>{segment?.point || '—'}</dd></div><div><dt>Comprimento óptico</dt><dd>{segment?.opticalLengthMeters != null ? `${segment.opticalLengthMeters} m` : '—'}</dd></div></dl></article>
    </div>

    <section className="abnt-panel"><div className="abnt-heading"><div><p className="eyebrow">NBR 14771</p><h2>Identificação de cores ABNT</h2></div><label>Número global da fibra<input aria-label="Número global da fibra" type="number" min="1" max="144" value={fiberNumber} onChange={(event) => setFiberNumber(event.target.value === '' ? '' : Number(event.target.value))} /></label></div>{identification ? <div className="abnt-grid"><article><div><small>Grupo / Tubo loose</small><strong>Grupo {identification.group}</strong></div><span style={{ backgroundColor: COLOR_HEX[identification.groupColor], color: badgeText(identification.groupColor) }}>{identification.groupColor}</span></article><article><div><small>Fibra / Via de sinal</small><strong>Fibra {identification.fiber} (Global {identification.globalFiber})</strong></div><span style={{ backgroundColor: COLOR_HEX[identification.fiberColor], color: badgeText(identification.fiberColor) }}>{identification.fiberColor}</span></article></div> : <p className="field-error">Informe uma fibra entre 1 e 144.</p>}</section>

    {order.warnings.length > 0 && <div className="warning-box"><strong>Dados pendentes de revisão</strong>{order.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
  </section>
}
