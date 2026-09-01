# ROTAS MUNDIVOX

Aplicativo de apoio ao trabalho técnico de campo, com importação de ERP e ConnectMaster, histórico local, identificação ABNT, temas solar/noturno, backup e funcionamento offline.

## Executar no Windows

```powershell
pnpm install
pnpm dev
```

## Distância real pelas ruas

A função de distância usa a biblioteca oficial Routes da Google Maps JavaScript API. A origem vem da geolocalização atual autorizada pelo usuário. O destino digitado é geocodificado pela própria Routes API, e o aplicativo exibe exclusivamente o campo `distanceMeters` retornado pela rota real no modo de condução.

Não é utilizada distância em linha reta, estimativa manual, valor fixo ou dado inventado.

No Google Cloud, é necessário:

1. Criar ou selecionar um projeto com faturamento habilitado.
2. Ativar **Maps JavaScript API**.
3. Ativar **Routes API**.
4. Criar uma chave de API para website.
5. Restringir a chave aos endereços autorizados do aplicativo, incluindo o endereço local durante o desenvolvimento e o domínio definitivo após a hospedagem.
6. Restringir o uso da chave somente a **Maps JavaScript API** e **Routes API**.

Copie `.env.example` para `.env.local` e preencha a variável:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=sua_chave_restrita
```

Nunca envie `.env.local` ao Git e nunca escreva uma chave real diretamente no código. Em aplicações web, a chave é usada pelo navegador; portanto, as restrições de website e de APIs no Google Cloud são obrigatórias para evitar uso indevido.

## Verificações

```powershell
pnpm test
pnpm lint
pnpm build
```

## Compatibilidade móvel

O leitor de PDF usa a distribuição `legacy` do PDF.js para compatibilidade com Safari 18+ no iOS e navegadores Android atuais.

O cálculo real exige HTTPS ou `localhost`, permissão de localização e acesso à internet. As demais funções locais do aplicativo continuam disponíveis offline.
