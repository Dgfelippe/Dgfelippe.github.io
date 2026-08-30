# ROTAS MUNDIVOX — Especificação de Produto e Arquitetura

## Objetivo

Criar um aplicativo instalável e confiável para técnicos de fibra óptica utilizarem em Android, iOS, tablets e computadores. O aplicativo deve importar prints do ERP e PDFs do ConnectMaster, estruturar as informações da ordem de serviço, calcular cores de fibras e grupos e manter o histórico disponível mesmo sem internet.

## Plataforma

- Aplicação Web Progressiva (PWA) desenvolvida com React e TypeScript.
- Instalação pela tela inicial em Android e iOS e pelo navegador no Windows.
- Interface responsiva, otimizada primeiro para celular.
- Funcionamento offline após a primeira instalação.
- Estrutura compatível com empacotamento futuro por Capacitor para Play Store e App Store.

## Identidade visual

- Nome do aplicativo: `ROTAS MUNDIVOX`.
- Marca vetorial própria armazenada em `assets/branding/mundivox-brand.svg`.
- Tema solar com alto contraste para leitura sob luz intensa.
- Tema noturno com brilho reduzido para trabalho durante a madrugada.
- Alternância manual de tema e opção automática baseada no aparelho.
- Crédito visível: `Desenvolvido por Diogo Felippe Do Nascimento`.
- Tradução em inglês do crédito: `Developed by Diogo Felippe Do Nascimento`.

## Fluxo principal

1. O técnico inicia uma nova importação.
2. Seleciona ou fotografa o print da OS no ERP.
3. Seleciona um ou mais PDFs de rota do ConnectMaster.
4. O aplicativo extrai o texto do PDF. Quando o documento não possui texto utilizável, aplica OCR às páginas renderizadas.
5. O aplicativo executa OCR no print e identifica código da OS, cliente, endereço, prédio, IP, porta, rack, slot e demais campos reconhecíveis.
6. Interpretadores específicos convertem os textos em dados estruturados.
7. Uma tela de conferência exibe cada campo, sua origem e seu nível de confiança.
8. Campos duvidosos ficam destacados e podem ser corrigidos pelo técnico.
9. Somente dados validados podem ser salvos.
10. A OS passa a aparecer no histórico e permanece disponível offline.

## Dados e persistência

O IndexedDB armazenará:

- ordens de serviço;
- dados do cliente e do circuito;
- rotas e trechos em ordem sequencial;
- caixas, cabos, fibras, pontos e comprimentos;
- arquivos originais ou referências locais recuperáveis;
- texto bruto extraído;
- correções realizadas pelo usuário;
- data de criação e última alteração;
- versão do formato dos dados.

O armazenamento será acessado por um repositório isolado da interface. Migrações versionadas deverão preservar OSs salvas quando o aplicativo for atualizado.

## Leitura de documentos

### Print do ERP

- OCR executado localmente no aparelho.
- Normalização de espaços, pontuação e caracteres confundidos pelo OCR.
- Regras específicas para código da OS, cliente, prédio, endereço, IP e porta.
- Preservação do texto bruto para auditoria e correção.
- Nenhum campo incerto será inventado silenciosamente.

### PDF ConnectMaster

- Extração direta de texto como primeira opção.
- Detecção de páginas sem texto e fallback para OCR.
- Reconstrução das linhas alternadas de componente e cabo.
- Remoção de cabeçalhos e rodapés repetidos.
- Correção controlada de problemas de codificação, como acentos substituídos.
- Preservação da ordem dos trechos e do comprimento óptico acumulado.
- Compatibilidade inicial validada com os dois PDFs reais já fornecidos.

## Motor ABNT

- Sequência de 12 cores configurada e testada.
- Cálculo de grupo e posição da fibra a partir do número global.
- Interpretação de valores como `Fibra03`, `G1-F8`, `19`, `S2-P07` e variações com zeros à esquerda.
- Exibição do número global, grupo, cor do grupo, posição interna e cor da fibra.
- Quando a capacidade ou organização do cabo for ambígua, o aplicativo solicitará confirmação em vez de presumir uma regra.

## Telas

1. **Início:** busca, OSs recentes, nova importação e estado offline.
2. **Importação:** escolha de print e PDFs com progresso individual.
3. **Conferência:** campos extraídos, origem, confiança, correção e validação.
4. **Detalhe da OS:** equipamento, switch, cliente, endereço e ações principais.
5. **Rota:** lista sequencial de trechos, busca por endereço e posição atual.
6. **Trecho:** caixa, cabo, ponto, fibra, cores e atalhos de navegação.
7. **Histórico:** pesquisa, edição, duplicação e exclusão confirmada.
8. **Configurações:** tema, idioma do crédito, backup, restauração e informações do aplicativo.

## Navegação externa

- Google Maps e Waze em Android.
- Apple Maps, Google Maps e Waze em iOS quando disponíveis.
- Endereços serão mostrados ao técnico antes da abertura do aplicativo de mapas.
- Coordenadas presentes no PDF terão prioridade sobre geocodificação textual.

## Backup e restauração

- Exportação de todas as OSs para um arquivo versionado.
- Restauração com validação antes de alterar o banco local.
- Detecção de duplicidades por identificador e código da OS.
- Opções explícitas para ignorar, substituir ou manter as duas versões.
- Nenhum dado existente será apagado sem confirmação.

## Funcionamento offline

- Interface e recursos essenciais armazenados pelo service worker.
- Banco e documentos mantidos localmente.
- Leitura, conferência, consulta e cálculo ABNT disponíveis sem rede.
- Mapas externos exigirão conexão, mas o endereço continuará visível e copiável.
- Atualizações serão aplicadas de forma controlada para evitar perda de uma importação em andamento.

## Tratamento de erros

- Cada arquivo terá estados: aguardando, lendo, concluído, requer revisão ou falhou.
- Mensagens explicarão o problema e indicarão como corrigi-lo.
- Falha em um arquivo não descartará resultados válidos dos demais.
- Arquivos incompatíveis permanecerão disponíveis para nova tentativa.
- Erros técnicos serão registrados localmente sem armazenar dados sensíveis desnecessários.
- O usuário poderá copiar um relatório de diagnóstico sem expor documentos completos por padrão.

## Segurança e privacidade

- Processamento local como padrão.
- Nenhum documento será enviado a terceiros na primeira versão.
- O aplicativo não solicitará localização contínua.
- Dados não serão apagados automaticamente.
- Exportações conterão aviso para armazenamento seguro, pois podem incluir informações operacionais.

## Estratégia de testes

- Desenvolvimento orientado por testes para regras, persistência e interpretadores.
- Testes unitários para normalização, parsing e cálculo ABNT.
- Testes de integração para importação, validação, salvamento, recarga e migração.
- Arquivos reais anonimizados ou cópias de teste para impedir regressões nos formatos ConnectMaster e ERP.
- Testes de interface para os fluxos principais.
- Testes manuais no navegador em larguras de Android pequeno, iPhone, tablet e computador.
- Verificação dos temas solar e noturno.
- Verificação offline real por desligamento de rede durante os testes.
- Nenhuma funcionalidade será considerada concluída enquanto seus testes relevantes não passarem sem erros ou avisos inesperados.

## Escopo da primeira versão

Incluído:

- PWA instalável;
- armazenamento local permanente;
- importação de print e PDF;
- tela de conferência;
- histórico e pesquisa;
- rotas e trechos;
- motor ABNT;
- mapas externos;
- temas solar e noturno;
- backup e restauração.

Não incluído inicialmente:

- sincronização automática entre aparelhos;
- contas de usuário;
- servidor em nuvem;
- publicação nas lojas;
- edição colaborativa;
- rastreamento contínuo por GPS.

Esses itens poderão ser adicionados posteriormente sem substituir a base local-first.

## Critérios de sucesso

- O aplicativo instala e abre em Android, iOS e Windows por navegadores atuais.
- Uma OS importada permanece disponível após fechar e reabrir o aplicativo.
- Os dois PDFs e o print fornecidos são processados e apresentados para conferência.
- Erros de leitura são visíveis e corrigíveis.
- O aplicativo continua consultável offline.
- O cálculo ABNT passa pelos casos de referência e limites definidos.
- A interface permanece legível sob tema solar e confortável no tema noturno.
- Backup exportado pode restaurar os mesmos dados em uma instalação limpa.
