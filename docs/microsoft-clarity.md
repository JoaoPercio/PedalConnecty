# Microsoft Clarity (avaliação de usabilidade — TCC)

Integração temporária e opt-in. O PedalConnect continua funcionando com o Clarity desligado. A fonte de verdade dos testes de usabilidade permanece em `src/usability-tests/` (`TestSessionService`).

SDK oficial: [`@microsoft/clarity`](https://www.npmjs.com/package/@microsoft/clarity) (APIs: `init`, `identify`, `setTag`, `event`, `consentV2`, `upgrade`). Documentação: [Clarity client API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api) e [Consent V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2).

## 1. Criar o projeto no Clarity

1. Acesse [https://clarity.microsoft.com](https://clarity.microsoft.com) e entre com uma conta Microsoft.
2. Crie um projeto (nome sugerido: PedalConnect TCC).
3. Em **Settings → Overview** copie o **Project ID**.
4. Em **Settings → Setup**, ative o **Consent Mode** (cookies só depois do consentimento), para alinhar com o banner do app.
5. Em **Settings**, revise o mascaramento (recomendado: máscara estrita / masking de conteúdo sensível). O app também marca regiões com `data-clarity-mask="true"`.

O Project ID é um identificador público do snippet (aparece no JavaScript do cliente). Mesmo assim ele **não** deve ser commitado no código-fonte.

## 2. Variáveis de ambiente

O frontend é Next.js: use o prefixo `NEXT_PUBLIC_`.

| Variável | Exemplo | Função |
|----------|---------|--------|
| `NEXT_PUBLIC_ENABLE_CLARITY` | `true` | Liga/desliga a integração (opt-in). Qualquer valor diferente de `true` desliga. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | o ID em Settings → Overview | Identificador do projeto Clarity |

Arquivo local: `.env.local` (não versionado). Modelo: `.env.example`.

Se o flag estiver `true` e o Project ID faltar, o app **não quebra**: o Clarity não inicia e, em desenvolvimento, um aviso aparece no console.

## 3. Configurar na Vercel

No painel do projeto Vercel → **Settings → Environment Variables**, adicione:

```
NEXT_PUBLIC_ENABLE_CLARITY=true
NEXT_PUBLIC_CLARITY_PROJECT_ID=<seu-project-id>
```

Aplique aos ambientes em que a avaliação vai ocorrer (em geral Production e, se quiser, Preview). Faça um **redeploy** depois de salvar: variáveis `NEXT_PUBLIC_*` entram no bundle no build.

Domínio: cadastre no Clarity o mesmo host da Vercel (e `localhost` se for testar localmente).

## 4. Ligar e desligar

- Ligar: `NEXT_PUBLIC_ENABLE_CLARITY=true` + Project ID válido.
- Desligar: `NEXT_PUBLIC_ENABLE_CLARITY=false` (ou omitir). O script não carrega, eventos não são enviados, o banner some. Os testes de usabilidade continuam iguais.

## 5. Identificação dos participantes

Depois do consentimento e do login, o app chama `Clarity.identify(customId)` com o **UUID interno do Supabase Auth** (`user.id`). O SDK faz hash do custom-id no cliente antes do envio.

Não são enviados: senha, JWT, e-mail, CPF, telefone, endereço, nome amigável (`friendlyName`), conteúdo de chat.

Visitantes sem conta recebem um id anônimo em `localStorage` (`pc_clarity_participant_id`), só técnico.

Tags oficiais (`Clarity.setTag`):

- `participant_id` — mesmo id técnico
- `current_test` — slug (`signup`, `create_pedal`, …)
- `test_number` — `"1"` … `"10"` ou `"none"`
- `test_status` — `pending` / `in_progress` / `completed` / `skipped` / `guest` / `finished`

## 6. Eventos e contexto

Ações reais já detectadas por `reportUsabilityEvent` são reenviadas ao Clarity só como **nome** (`Clarity.event`), sem payload:

| Evento Clarity | Ação no PedalConnect |
|----------------|----------------------|
| `account_registered` | cadastro |
| `signed_in` | login |
| `pedal_created` | pedal criado |
| `pedal_filters_used` | filtro usado (após listagem) |
| `pedal_join_requested` | pedido de participação |
| `pedal_message_sent` | mensagem enviada (conteúdo não vai no evento) |
| `pedal_details_viewed` | detalhes vistos por 2s (regra já existente) |
| `route_created` | rota criada |
| `route_favorited` | rota favoritada |
| `bike_service_viewed` | serviço no mapa aberto |
| `notification_viewed` | notificações abertas |

Quando `TestSessionService` marca um teste como concluído, extra:

- `Clarity.event("usability_test_completed")`
- `Clarity.setTag("last_completed_test", "<n>")`
- `Clarity.upgrade("usability_test_completed")` — prioriza a gravação (API oficial)

Abrir uma página **não** completa teste e **não** dispara `usability_test_completed`.

## 7. Privacidade e mascaramento

Além do mascaramento padrão do Clarity (inputs, e-mails, números), o app usa `data-clarity-mask="true"` em:

- campos de login/senha (inclusive senha visível)
- cadastro (dados pessoais, e-mail, senha, avatar)
- edição de perfil
- chat do pedal
- lista de participantes
- lista de notificações
- modal de perfil (nome e e-mail)

Consentimento: banner simples no topo. Aceite grava `pc_clarity_consent_v1=granted`, chama `Clarity.init` e `Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: "granted" })`. Recusa não inicializa o Clarity.

## 8. Verificar se está funcionando

1. `NEXT_PUBLIC_ENABLE_CLARITY=true` e Project ID no `.env.local`.
2. `npm run dev`.
3. Aceite o banner.
4. No DevTools → Network, deve haver pedido a `clarity.ms` / `clarity.ms/tag/<id>`.
5. No dashboard Clarity, sessões podem levar alguns minutos.
6. Com o flag `false`, não deve haver script `clarity-script` nem chamadas ao tag.

## 9. Remover a integração depois do TCC

1. `NEXT_PUBLIC_ENABLE_CLARITY=false` (desliga sem apagar código).
2. Remoção completa:
   - apagar `src/clarity/`, `components/clarity/`, `docs/microsoft-clarity.md`
   - remover `<ClarityHost />` de `app/layout.tsx`
   - remover imports/chamadas `@/clarity` em `UsabilityTestHost.tsx`
   - remover `data-clarity-mask` (opcional; inofensivo sem o script)
   - remover `@microsoft/clarity` do `package.json`
   - remover as variáveis na Vercel
   - remover aliases `@/clarity` em `tsconfig.json` e `vitest.config.ts`

`TestSessionService` não depende do Clarity.
