import { useEffect, useState } from 'react'
import './App.css'

type Theme = 'sun' | 'night'

function App() {
  const [theme, setTheme] = useState<Theme>('sun')
  useEffect(() => document.documentElement.setAttribute('data-theme', theme), [theme])
  const nextTheme: Theme = theme === 'sun' ? 'night' : 'sun'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Ir para o início">
          <img src={theme === 'night' ? '/branding/mundivox-brand-dark.svg' : '/branding/mundivox-brand.svg'} alt="MUNDIVOX" />
          <span><strong>ROTAS MUNDIVOX</strong><small>Assistente técnico de campo</small></span>
        </a>
        <button className="theme-toggle" type="button" onClick={() => setTheme(nextTheme)} aria-label={theme === 'sun' ? 'Ativar tema noturno' : 'Ativar tema solar'}>
          <span aria-hidden="true">{theme === 'sun' ? '☾' : '☀'}</span>{theme === 'sun' ? 'Modo noturno' : 'Modo solar'}
        </button>
      </header>

      <main id="inicio" className="content">
        <section className="welcome-card">
          <div><p className="eyebrow">Operação local e segura</p><h1>ROTAS MUNDIVOX</h1><p className="welcome-copy">Importe sua ordem de serviço e a rota óptica para trabalhar com rapidez, precisão e acesso offline.</p></div>
          <div className="status-pill"><span aria-hidden="true" />Pronto para uso</div>
        </section>
        <section className="quick-actions" aria-label="Ações principais">
          <button className="action-card action-card--primary" type="button"><span className="action-icon" aria-hidden="true">＋</span><span><strong>Importar nova OS</strong><small>Print ERP e PDF ConnectMaster</small></span></button>
          <button className="action-card" type="button"><span className="action-icon" aria-hidden="true">⌕</span><span><strong>Consultar histórico</strong><small>OSs salvas neste aparelho</small></span></button>
        </section>
        <section className="empty-state" aria-labelledby="recent-title">
          <div className="section-heading"><div><p className="eyebrow">Acesso rápido</p><h2 id="recent-title">Ordens recentes</h2></div><span className="offline-badge">Disponível offline</span></div>
          <div className="empty-body"><span className="route-symbol" aria-hidden="true">⌁</span><strong>Nenhuma OS salva ainda</strong><p>Importe o primeiro atendimento para iniciar seu histórico.</p></div>
        </section>
      </main>
      <footer className="footer"><span>ROTAS MUNDIVOX</span><span>Desenvolvido por Diogo Felippe Do Nascimento</span></footer>
    </div>
  )
}

export default App
