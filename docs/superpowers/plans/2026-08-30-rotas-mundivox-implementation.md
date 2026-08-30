# ROTAS MUNDIVOX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma PWA local-first que importe prints ERP e PDFs ConnectMaster, permita conferência, salve OSs offline e apresente rotas e cores ABNT em Android, iOS e Windows.

**Architecture:** A interface React consumirá serviços de domínio independentes da tela. Interpretadores puros transformarão texto bruto em modelos validados; um repositório Dexie persistirá esses modelos no IndexedDB. O service worker armazenará a aplicação para uso offline, enquanto OCR e PDF serão executados localmente no navegador.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Dexie/IndexedDB, Zod, PDF.js, Tesseract.js e vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-08-30-rotas-mundivox-design.md`

## Global Constraints

- Preservar `legacy/proto_assist_fibra.html` sem alterações como referência funcional e visual.
- Processar documentos localmente; não enviar PDFs, imagens ou dados de OS para terceiros.
- Manter leitura, consulta, salvamento, backup e cálculo ABNT disponíveis offline.
- Usar português do Brasil na interface principal.
- Exibir `Desenvolvido por Diogo Felippe Do Nascimento` em local visível.
- Oferecer temas solar, noturno e automático.
- Escrever teste que falha antes de cada implementação nova ou correção.
- Não considerar tarefa concluída com erros ou avisos inesperados nos testes e no navegador.

---

## Estrutura de arquivos

```text
ROTAS MUNDIVOX/
├── design-assets/                 # Logos aprovadas antes do scaffold
├── docs/superpowers/              # Especificação e plano
├── legacy/                        # Protótipo original preservado
├── public/
│   ├── branding/                  # Logos usadas pelo app
│   ├── icons/                     # Ícones PWA rasterizados
│   └── manifest.webmanifest
├── src/
│   ├── app/                       # Inicialização, rotas, tema e layout
│   ├── db/                        # Dexie, migrações e repositórios
│   ├── domain/                    # Modelos, validação e motor ABNT
│   ├── importers/                 # OCR, PDF e interpretadores ERP/ConnectMaster
│   ├── features/import/           # Fluxo de importação e conferência
│   ├── features/orders/           # Histórico, detalhe, rota e trecho
│   ├── features/settings/         # Tema, backup e restauração
│   └── test/                      # Configuração e fixtures compartilhadas
├── e2e/                           # Fluxos completos no navegador
├── package.json
├── vite.config.ts
└── playwright.config.ts
```

---

### Task 1: Scaffold testável e identidade visual

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/theme.css`
- Create: `src/app/App.test.tsx`
- Copy: `design-assets/mundivox-brand.svg` → `public/branding/mundivox-brand.svg`
- Copy: `design-assets/mundivox-brand-dark.svg` → `public/branding/mundivox-brand-dark.svg`

**Interfaces:**
- Produces: componente `App(): JSX.Element` e tokens CSS para os temas `sun`, `night` e `auto`.

- [ ] **Step 1: Criar o scaffold Vite React TypeScript e instalar dependências**

Run:

```powershell
pnpm create vite . --template react-ts
pnpm add dexie zod pdfjs-dist tesseract.js react-router-dom
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-plugin-pwa playwright @playwright/test
```

Expected: `package.json`, `src/` e `vite.config.ts` criados, com lockfile do pnpm.

- [ ] **Step 2: Escrever o teste inicial que exige nome, crédito e seletor de tema**

```tsx
it('exibe a identidade e permite alternar o tema', async () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'ROTAS MUNDIVOX' })).toBeVisible()
  expect(screen.getByText('Desenvolvido por Diogo Felippe Do Nascimento')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Ativar tema noturno' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'night')
})
```

- [ ] **Step 3: Executar o teste e confirmar a falha esperada**

Run: `pnpm vitest run src/app/App.test.tsx`

Expected: FAIL porque a identidade e o controle de tema ainda não existem.

- [ ] **Step 4: Implementar o shell mínimo com as logos e temas**

```tsx
export function App() {
  const [theme, setTheme] = useState<'sun' | 'night'>('sun')
  useEffect(() => document.documentElement.setAttribute('data-theme', theme), [theme])
  return (
    <main className="app-shell">
      <header>
        <picture>
          <source media="(prefers-color-scheme: dark)" srcSet="/branding/mundivox-brand-dark.svg" />
          <img src="/branding/mundivox-brand.svg" alt="MUNDIVOX" />
        </picture>
        <h1>ROTAS MUNDIVOX</h1>
        <button onClick={() => setTheme(theme === 'sun' ? 'night' : 'sun')}>
          {theme === 'sun' ? 'Ativar tema noturno' : 'Ativar tema solar'}
        </button>
      </header>
      <footer>Desenvolvido por Diogo Felippe Do Nascimento</footer>
    </main>
  )
}
```

- [ ] **Step 5: Executar testes e build**

Run: `pnpm vitest run && pnpm build`

Expected: PASS e build sem erros.

- [ ] **Step 6: Inicializar Git e registrar o scaffold**

```powershell
git init
git add .
git commit -m "chore: scaffold rotas mundivox pwa"
```

---

### Task 2: Modelos validados e motor ABNT

**Files:**
- Create: `src/domain/order.ts`
- Create: `src/domain/abnt.ts`
- Create: `src/domain/abnt.test.ts`

**Interfaces:**
- Produces: `ServiceOrderSchema`, `ServiceOrder`, `RouteSegment`, `calculateAbnt(globalFiber: number): AbntIdentification` e `parseFiberReference(value: string): number | null`.

- [ ] **Step 1: Escrever testes para as referências reais**

```ts
it.each([
  [1, 1, 'VERDE', 1, 'VERDE'],
  [8, 1, 'VERDE', 8, 'ROSA'],
  [15, 2, 'AMARELO', 3, 'BRANCO'],
])('calcula a fibra global %i', (global, group, groupColor, fiber, fiberColor) => {
  expect(calculateAbnt(global)).toMatchObject({ group, groupColor, fiber, fiberColor })
})

it.each([['Fibra03', 3], ['G1-F8', 8], ['19', 19], ['S2-P07', null]])(
  'interpreta %s',
  (input, expected) => expect(parseFiberReference(input)).toBe(expected),
)
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `pnpm vitest run src/domain/abnt.test.ts`

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar sequência ABNT e validação de faixa**

```ts
const COLORS = ['VERDE', 'AMARELO', 'BRANCO', 'AZUL', 'VERMELHO', 'VIOLETA', 'MARROM', 'ROSA', 'PRETO', 'CINZA', 'LARANJA', 'AQUA'] as const

export function calculateAbnt(globalFiber: number) {
  if (!Number.isInteger(globalFiber) || globalFiber < 1 || globalFiber > 144) {
    throw new RangeError('A fibra global deve estar entre 1 e 144')
  }
  const group = Math.ceil(globalFiber / 12)
  const fiber = ((globalFiber - 1) % 12) + 1
  return { globalFiber, group, groupColor: COLORS[(group - 1) % 12], fiber, fiberColor: COLORS[fiber - 1] }
}
```

- [ ] **Step 4: Definir schemas Zod para OS e trechos**

```ts
export const RouteSegmentSchema = z.object({
  sequence: z.number().int().nonnegative(),
  address: z.string().min(1),
  component: z.string().min(1),
  cable: z.string().min(1),
  point: z.string().min(1),
  opticalLengthMeters: z.number().nonnegative().nullable(),
})
```

- [ ] **Step 5: Executar toda a suíte e registrar**

Run: `pnpm vitest run && git add src/domain && git commit -m "feat: add validated order model and abnt engine"`

Expected: PASS.

---

### Task 3: Persistência IndexedDB e histórico permanente

**Files:**
- Create: `src/db/database.ts`
- Create: `src/db/orderRepository.ts`
- Create: `src/db/orderRepository.test.ts`

**Interfaces:**
- Consumes: `ServiceOrder` de `src/domain/order.ts`.
- Produces: `OrderRepository` com `save`, `getById`, `findByCode`, `list`, `remove` e `clearForTests`.

- [ ] **Step 1: Escrever o teste que salva, atualiza e recupera uma OS**

```ts
it('mantém uma OS após reabrir o repositório', async () => {
  const first = createRepository('rotas-test')
  await first.save(orderFixture)
  first.close()
  const reopened = createRepository('rotas-test')
  expect(await reopened.findByCode('98216')).toMatchObject({ code: '98216' })
})
```

- [ ] **Step 2: Confirmar a falha**

Run: `pnpm vitest run src/db/orderRepository.test.ts`

Expected: FAIL porque o repositório não existe.

- [ ] **Step 3: Implementar Dexie com versão explícita**

```ts
class RotasDatabase extends Dexie {
  orders!: Table<ServiceOrder, string>
  constructor(name = 'rotas-mundivox') {
    super(name)
    this.version(1).stores({ orders: 'id, code, updatedAt' })
  }
}
```

- [ ] **Step 4: Implementar upsert sem perder `createdAt`**

```ts
async save(order: ServiceOrder) {
  const existing = await this.db.orders.get(order.id)
  const parsed = ServiceOrderSchema.parse({
    ...order,
    createdAt: existing?.createdAt ?? order.createdAt,
    updatedAt: new Date().toISOString(),
  })
  await this.db.orders.put(parsed)
  return parsed
}
```

- [ ] **Step 5: Testar recarga, busca e remoção**

Run: `pnpm vitest run src/db/orderRepository.test.ts`

Expected: PASS para persistência, atualização, pesquisa e exclusão.

- [ ] **Step 6: Registrar**

Run: `git add src/db && git commit -m "feat: persist service orders in indexeddb"`

---

### Task 4: Extração e interpretação de PDFs ConnectMaster

**Files:**
- Create: `src/importers/pdf/extractPdfText.ts`
- Create: `src/importers/connectmaster/normalizeText.ts`
- Create: `src/importers/connectmaster/parseConnectMaster.ts`
- Create: `src/importers/connectmaster/parseConnectMaster.test.ts`
- Create: `src/test/fixtures/connectmaster-98216.txt`
- Create: `src/test/fixtures/connectmaster-98533.txt`

**Interfaces:**
- Produces: `extractPdfText(file: ArrayBuffer): Promise<PdfExtraction>` e `parseConnectMaster(text: string): ParsedRoute`.
- `PdfExtraction` contém `pages`, `text`, `requiresOcr` e `warnings`.

- [ ] **Step 1: Criar fixtures textuais sem dados desnecessários**

As fixtures devem conter cabeçalho, rodapé, linhas de componente/cabo, quebras de página e casos de acentuação presentes nos PDFs reais, incluindo `CEO-RJO-1293`, `12F-RJO-2333`, `Fibra03`, `CEO-RJO-2790`, `48F-RJO-2792` e `G2-F7`.

- [ ] **Step 2: Escrever testes para reconstrução da rota**

```ts
it('reconstrói a rota 98216 na ordem do PDF', () => {
  const result = parseConnectMaster(fixture98216)
  expect(result.code).toBe('98216')
  expect(result.segments[0]).toMatchObject({ component: expect.stringContaining('TOA 2F-97966'), cable: expect.stringContaining('12F-9858'), point: 'Fibra01' })
  expect(result.segments[1]).toMatchObject({ component: expect.stringContaining('CEO-RJO-1293'), cable: '12F-RJO-2333', point: 'Fibra03' })
})
```

- [ ] **Step 3: Confirmar a falha do parser inexistente**

Run: `pnpm vitest run src/importers/connectmaster/parseConnectMaster.test.ts`

Expected: FAIL.

- [ ] **Step 4: Implementar normalização sem inventar conteúdo**

```ts
export function normalizeConnectMasterText(text: string) {
  return text
    .normalize('NFC')
    .replace(/ConnectMaster[^\n]*\d+ de \d+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
```

- [ ] **Step 5: Implementar máquina de estados componente → cabo**

O parser deve aceitar uma linha de local/componente, guardar o trecho pendente e completá-lo somente quando encontrar a linha seguinte de cabo/ponto/comprimento. Linhas incompletas devem produzir `warnings`, nunca dados fictícios.

- [ ] **Step 6: Implementar extração PDF.js e detecção de OCR**

`requiresOcr` será verdadeiro quando nenhuma página produzir texto útil acima de 40 caracteres após normalização.

- [ ] **Step 7: Executar os dois casos reais e registrar**

Run: `pnpm vitest run src/importers/connectmaster && git add src/importers src/test/fixtures && git commit -m "feat: parse connectmaster route pdf text"`

Expected: PASS e número de trechos estável para ambas as fixtures.

---

### Task 5: OCR e interpretação do print ERP

**Files:**
- Create: `src/importers/ocr/recognizeImage.ts`
- Create: `src/importers/erp/parseErpText.ts`
- Create: `src/importers/erp/parseErpText.test.ts`
- Create: `src/test/fixtures/erp-98216.txt`

**Interfaces:**
- Produces: `recognizeImage(file: Blob): Promise<OcrResult>` e `parseErpText(text: string): ParsedErpOrder`.
- Cada campo de `ParsedErpOrder` contém `value`, `confidence` e `sourceLine`.

- [ ] **Step 1: Escrever teste com o texto real do print 98216**

```ts
it('extrai código, endereço, IP e porta do ERP', () => {
  const result = parseErpText(erp98216)
  expect(result.code.value).toBe('98216')
  expect(result.address.value).toContain('Rua Ipadu, 520')
  expect(result.switchIp.value).toBe('10.10.8.233')
  expect(result.switchPort.value).toBe('1/1/9')
})
```

- [ ] **Step 2: Confirmar a falha**

Run: `pnpm vitest run src/importers/erp/parseErpText.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implementar normalização e regexes isoladas**

```ts
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/
const PORT_PATTERN = /Porta(?: do switch)?\s*[:\-]?\s*(\d+\/\d+\/\d+)/i
const ORDER_PATTERN = /\b(\d{5,})\s*-\s*(.+)/
```

Valores incompatíveis, como octeto IP acima de 255, devem ser rejeitados e gerar aviso.

- [ ] **Step 4: Integrar Tesseract.js com progresso e cancelamento**

O worker usará português, encerrará recursos após cada trabalho e emitirá progresso de `0` a `1`. O interpretador continuará separado para ser testável sem OCR.

- [ ] **Step 5: Testar e registrar**

Run: `pnpm vitest run src/importers/erp && git add src/importers/erp src/importers/ocr src/test/fixtures && git commit -m "feat: extract erp fields from image text"`

Expected: PASS.

---

### Task 6: Fluxo de importação, conferência e salvamento

**Files:**
- Create: `src/features/import/importMachine.ts`
- Create: `src/features/import/ImportPage.tsx`
- Create: `src/features/import/ReviewPage.tsx`
- Create: `src/features/import/ImportPage.test.tsx`

**Interfaces:**
- Consumes: resultados ERP, rota ConnectMaster e `OrderRepository`.
- Produces: rascunho validável com estados `idle`, `reading`, `review`, `saving`, `saved` e `failed`.

- [ ] **Step 1: Escrever teste do fluxo sem arquivos fictícios**

```tsx
it('só permite salvar depois da revisão dos campos obrigatórios', async () => {
  const services = {
    recognizeErp: async () => erp98216ParsedFixture,
    readRoute: async () => connectMaster98216ParsedFixture,
    save: async (order: ServiceOrder) => order,
  }
  render(<ImportPage services={services} />)
  await userEvent.upload(
    screen.getByLabelText('Print do ERP'),
    new File(['erp'], 'erp-98216.png', { type: 'image/png' }),
  )
  await userEvent.upload(
    screen.getByLabelText('PDF ConnectMaster'),
    new File(['pdf'], 'rota-98216.pdf', { type: 'application/pdf' }),
  )
  expect(await screen.findByText('Conferir dados extraídos')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Salvar OS' })).toBeDisabled()
  await userEvent.click(screen.getByLabelText('Confirmar endereço'))
  expect(screen.getByRole('button', { name: 'Salvar OS' })).toBeEnabled()
})
```

- [ ] **Step 2: Confirmar a falha**

Run: `pnpm vitest run src/features/import/ImportPage.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implementar máquina de estados e cancelamento**

Uma nova importação deverá abortar workers anteriores. Falha do PDF não eliminará resultado válido do ERP, e vice-versa.

- [ ] **Step 4: Implementar conferência com origem e confiança**

Campos abaixo de `0.80` ou ausentes deverão receber `requiresReview: true`. O botão salvar permanecerá desabilitado até que todo campo obrigatório esteja preenchido e confirmado.

- [ ] **Step 5: Conectar salvamento real ao repositório**

Após `await repository.save(order)`, navegar para `/os/:id`; não mostrar sucesso antes da Promise concluir.

- [ ] **Step 6: Testar persistência após recarga e registrar**

Run: `pnpm vitest run src/features/import src/db && git add src/features/import && git commit -m "feat: add reviewed import workflow"`

Expected: PASS.

---

### Task 7: Histórico, detalhe, rota, trecho e mapas

**Files:**
- Create: `src/features/orders/OrdersPage.tsx`
- Create: `src/features/orders/OrderDetailPage.tsx`
- Create: `src/features/orders/RoutePage.tsx`
- Create: `src/features/orders/mapLinks.ts`
- Create: `src/features/orders/mapLinks.test.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces: rotas `/`, `/importar`, `/os/:id` e `/os/:id/rota`; `createMapLinks(address, coordinates?)`.

- [ ] **Step 1: Escrever testes de URLs com acentos e coordenadas**

```ts
it('codifica o endereço para Google Maps e Waze', () => {
  const links = createMapLinks('Rua Cônego Felipe, 975 - Taquara')
  expect(links.google).toContain(encodeURIComponent('Rua Cônego Felipe, 975 - Taquara'))
  expect(links.waze).toContain('navigate=yes')
})
```

- [ ] **Step 2: Confirmar a falha**

Run: `pnpm vitest run src/features/orders/mapLinks.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implementar pesquisa por código, cliente e endereço**

A pesquisa será normalizada com remoção de acentos somente para comparação; os valores originais permanecerão intactos para exibição.

- [ ] **Step 4: Implementar detalhe e rota sequencial**

Cada trecho exibirá sequência, endereço, componente, cabo, ponto, comprimento e identificação ABNT quando interpretável. Referências ambíguas mostrarão `Revisar fibra`.

- [ ] **Step 5: Implementar exclusão com confirmação**

O diálogo deverá informar código e cliente. Cancelar não executará `repository.remove`.

- [ ] **Step 6: Testar navegação e registrar**

Run: `pnpm vitest run src/features/orders && git add src/features/orders src/app && git commit -m "feat: browse orders and optical routes"`

Expected: PASS.

---

### Task 8: Backup, restauração, PWA offline e validação final

**Files:**
- Create: `src/features/settings/backup.ts`
- Create: `src/features/settings/backup.test.ts`
- Create: `src/features/settings/SettingsPage.tsx`
- Modify: `vite.config.ts`
- Create: `e2e/fixtures/erp-98216.png`
- Create: `e2e/fixtures/connectmaster-98216.pdf`
- Create: `e2e/import-save-reload.spec.ts`
- Create: `e2e/offline.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Produces: `exportBackup(orders): Blob`, `validateBackup(json): BackupFile` e `restoreBackup(file, strategy)`.

- [ ] **Step 1: Escrever testes de round-trip e arquivo inválido**

```ts
it('exporta e restaura as mesmas ordens', async () => {
  const blob = exportBackup([orderFixture])
  const restored = validateBackup(await blob.text())
  expect(restored.orders).toEqual([orderFixture])
})

it('rejeita backup com versão desconhecida', () => {
  expect(() => validateBackup('{"version":999,"orders":[]}')).toThrow('Versão de backup não suportada')
})
```

- [ ] **Step 2: Confirmar a falha**

Run: `pnpm vitest run src/features/settings/backup.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implementar formato versionado e estratégias de conflito**

```ts
export const BackupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  orders: z.array(ServiceOrderSchema),
})
```

Estratégias aceitas: `skip`, `replace` e `duplicate`. A restauração validará o arquivo inteiro antes da primeira escrita.

- [ ] **Step 4: Configurar manifest e service worker**

`vite-plugin-pwa` deverá registrar `name: 'ROTAS MUNDIVOX'`, `short_name: 'ROTAS'`, `display: 'standalone'`, `theme_color` solar e ícones de 192 e 512 pixels. PDF.js e Tesseract não poderão depender de CDN em tempo de execução.

- [ ] **Step 5: Escrever fluxo E2E de salvar e recarregar**

```ts
test('OS permanece após recarregar o aplicativo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Importar nova OS' }).click()
  await page.getByLabel('Print do ERP').setInputFiles('e2e/fixtures/erp-98216.png')
  await page.getByLabel('PDF ConnectMaster').setInputFiles('e2e/fixtures/connectmaster-98216.pdf')
  await page.getByRole('checkbox', { name: 'Confirmar endereço' }).check()
  await page.getByRole('button', { name: 'Salvar OS' }).click()
  await page.reload()
  await expect(page.getByText('OS #98216')).toBeVisible()
})
```

- [ ] **Step 6: Escrever teste offline**

O teste instalará o service worker, recarregará uma vez online, ativará contexto offline e confirmará que início, histórico e detalhe da OS continuam acessíveis.

- [ ] **Step 7: Executar verificação completa**

Run:

```powershell
pnpm vitest run
pnpm build
pnpm exec playwright test
```

Expected: todos os testes PASS, build concluído e nenhum erro no console.

- [ ] **Step 8: Revisar manualmente nos breakpoints**

Testar em `360×800`, `390×844`, `768×1024` e `1366×768`, nos temas solar e noturno, verificando ausência de corte horizontal, contraste, alvos de toque e leitura da logo.

- [ ] **Step 9: Registrar a primeira versão funcional**

Run: `git add . && git commit -m "feat: complete offline rotas mundivox workflow"`

Expected: árvore limpa após o commit e suíte completa verde.
