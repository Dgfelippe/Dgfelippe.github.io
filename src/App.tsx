import { useEffect, useRef, useState } from 'react'
import './App.css'
import { createOrderRepository } from './data/orderRepository'
import type { RouteSegment, ServiceOrder } from './domain/order'
import { parseConnectMasterText } from './parsers/connectMaster'
import { parseErpText } from './parsers/erp'
import { recognizeErpImage } from './parsers/ocr'
import { extractPdfText } from './parsers/pdfText'

type Theme = 'sun' | 'night'
type FormData = Pick<ServiceOrder, 'code' | 'customer' | 'address' | 'building' | 'rack' | 'slot' | 'switchPort' | 'switchIp'>
const emptyForm: FormData = { code: '', customer: '', address: '', building: '', rack: '', slot: '', switchPort: '', switchIp: '' }

function App() {
  const [theme, setTheme] = useState<Theme>('sun')
  const [view, setView] = useState<'home' | 'import'>('home')
  const [form, setForm] = useState(emptyForm)
  const [segments, setSegments] = useState<RouteSegment[]>([])
  const [rawErpText, setRawErpText] = useState('')
  const [rawRouteText, setRawRouteText] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const repository = useRef(createOrderRepository())

  useEffect(() => document.documentElement.setAttribute('data-theme', theme), [theme])
  useEffect(() => {
    const current = repository.current
    current.list().then(setOrders).catch(() => undefined)
  }, [])

  const update = (key: keyof FormData, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function readErp(file?: File) {
    if (!file) return
    setBusy('Lendo imagem do ERP…')
    try {
      const text = await recognizeErpImage(file)
      const parsed = parseErpText(text)
      setRawErpText(text)
      setForm((current) => ({ ...current, code: parsed.orderCode.value ?? current.code, customer: parsed.customer.value ?? current.customer, address: parsed.address.value ?? current.address, building: parsed.building.value ?? current.building, rack: parsed.rack.value ?? current.rack, slot: parsed.slot.value ?? current.slot, switchIp: parsed.switchIp.value ?? current.switchIp, switchPort: parsed.switchPort.value ?? current.switchPort }))
      setWarnings((current) => [...current, ...parsed.warnings])
    } catch { setMessage('Não foi possível ler a imagem. Tente outra foto mais nítida.') }
    finally { setBusy('') }
  }

  async function readRoute(file?: File) {
    if (!file) return
    setBusy('Lendo PDF do ConnectMaster…')
    try {
      const text = await extractPdfText(await file.arrayBuffer())
      const parsed = parseConnectMasterText(text)
      setRawRouteText(text)
      setSegments(parsed.segments)
      if (parsed.orderCode) update('code', parsed.orderCode)
      setWarnings((current) => [...current, ...parsed.warnings])
    } catch { setMessage('Não foi possível ler o PDF. Confirme se é um relatório ConnectMaster válido.') }
    finally { setBusy('') }
  }

  async function saveOrder() {
    if (!form.code || !form.customer || !form.address || segments.length === 0) {
      setMessage('Preencha OS, cliente e endereço, e importe uma rota válida.')
      return
    }
    const timestamp = new Date().toISOString()
    const existing = await repository.current.findByCode(form.code)
    await repository.current.save({ ...form, id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp, rawErpText, rawRouteText, warnings: [...new Set(warnings)], segments })
    setOrders(await repository.current.list())
    setMessage(`OS ${form.code} salva neste aparelho.`)
    setView('home')
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="Ir para o início" onClick={() => setView('home')}><img src={theme === 'night' ? '/branding/mundivox-brand-dark.svg' : '/branding/mundivox-brand.svg'} alt="MUNDIVOX" /><span><strong>ROTAS MUNDIVOX</strong><small>Assistente técnico de campo</small></span></a>
      <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'sun' ? 'night' : 'sun')} aria-label={theme === 'sun' ? 'Ativar tema noturno' : 'Ativar tema solar'}><span aria-hidden="true">{theme === 'sun' ? '☾' : '☀'}</span>{theme === 'sun' ? 'Modo noturno' : 'Modo solar'}</button>
    </header>
    <main id="inicio" className="content">
      {message && <div className="notice" role="status">{message}</div>}
      {view === 'home' ? <>
        <section className="welcome-card"><div><p className="eyebrow">Operação local e segura</p><h1>ROTAS MUNDIVOX</h1><p className="welcome-copy">Importe sua ordem de serviço e a rota óptica para trabalhar com rapidez, precisão e acesso offline.</p></div><div className="status-pill"><span aria-hidden="true" />Pronto para uso</div></section>
        <section className="quick-actions" aria-label="Ações principais"><button className="action-card action-card--primary" type="button" onClick={() => { setMessage(''); setView('import') }}><span className="action-icon" aria-hidden="true">＋</span><span><strong>Importar nova OS</strong><small>Print ERP e PDF ConnectMaster</small></span></button><button className="action-card" type="button" onClick={() => document.querySelector('#recent-title')?.scrollIntoView()}><span className="action-icon" aria-hidden="true">⌕</span><span><strong>Consultar histórico</strong><small>OSs salvas neste aparelho</small></span></button></section>
        <section className="empty-state" aria-labelledby="recent-title"><div className="section-heading"><div><p className="eyebrow">Acesso rápido</p><h2 id="recent-title">Ordens recentes</h2></div><span className="offline-badge">Disponível offline</span></div>{orders.length ? <div className="order-list">{orders.map((order) => <article className="order-item" key={order.id}><strong>OS {order.code}</strong><span>{order.customer}</span><small>{order.address} · {order.segments.length} trecho(s)</small></article>)}</div> : <div className="empty-body"><span className="route-symbol" aria-hidden="true">⌁</span><strong>Nenhuma OS salva ainda</strong><p>Importe o primeiro atendimento para iniciar seu histórico.</p></div>}</section>
      </> : <section className="import-panel">
        <div className="section-heading"><div><p className="eyebrow">Nova ordem de serviço</p><h1>Importar e revisar</h1></div><button className="secondary-button" type="button" onClick={() => setView('home')}>Voltar</button></div>
        <div className="upload-grid"><label className="upload-box">Foto ou print do ERP<input aria-label="Foto ou print do ERP" type="file" accept="image/*" capture="environment" onChange={(event) => readErp(event.target.files?.[0])} /><small>Use uma imagem nítida ou tire uma foto</small></label><label className="upload-box">PDF do ConnectMaster<input aria-label="PDF do ConnectMaster" type="file" accept="application/pdf,.pdf" onChange={(event) => readRoute(event.target.files?.[0])} /><small>Selecione o relatório da rota óptica</small></label></div>
        {busy && <div className="notice" role="status">{busy}</div>}
        <div className="form-grid">{([['code','Número da OS'],['customer','Cliente'],['address','Endereço'],['building','Prédio'],['rack','Rack'],['slot','Slot'],['switchIp','IP do switch'],['switchPort','Porta do switch']] as Array<[keyof FormData,string]>).map(([key,label]) => <label key={key}>{label}<input value={form[key]} onChange={(event) => update(key,event.target.value)} /></label>)}</div>
        <div className="route-review"><h2>Trechos reconhecidos</h2>{segments.length ? segments.map((segment) => <article className="segment" key={segment.sequence}><span>{segment.sequence + 1}</span><div><strong>{segment.component}</strong><small>{segment.address}</small><small>{segment.cable} · {segment.point} · {segment.opticalLengthMeters ?? '—'} m</small></div></article>) : <p>Nenhuma rota importada ainda.</p>}</div>
        {warnings.length > 0 && <div className="warning-box"><strong>Revise estes pontos</strong>{warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</div>}
        <button className="save-button" type="button" onClick={saveOrder}>Salvar ordem de serviço</button>
      </section>}
    </main>
    <footer className="footer"><span>ROTAS MUNDIVOX</span><span>Desenvolvido por Diogo Felippe Do Nascimento</span></footer>
  </div>
}
export default App
