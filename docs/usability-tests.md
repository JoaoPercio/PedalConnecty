# Testes de usabilidade (TCC)

Módulo temporário para validação do PedalConnect. Foi isolado para poder ser desligado ou removido depois da defesa sem reescrever as funcionalidades principais.

## Onde está

- Código: `src/usability-tests/`
- Interface: `components/usability-tests/`
- Integração global: `UsabilityTestHost` em `app/layout.tsx` (layout autenticado/público, um único ponto)
- Migration: `supabase/migrations/20260907230000_user_test_progress.sql`

## Como a sessão funciona

O painel fica fixo acima do rodapé nas telas com `FooterNav` e na base da tela nas demais (login/cadastro). Pode ser minimizado e reaberto. O progresso vem do Supabase (`user_test_progress` + `user_test_sessions`).

O teste atual é o menor número ainda `pending` ou `in_progress`. Conclusão automática só vale para o teste atual (evita marcar etapas futuras por navegação).

## Onde os testes estão definidos

`src/usability-tests/catalog.ts` — lista única dos 10 testes (título, tarefa e objetivo).

## Detecção automática

`reportUsabilityEvent(...)` é um no-op se o módulo estiver desligado. Eventos:

| Teste | Evento | Origem |
|------|--------|--------|
| 1 | `account_registered` + `signed_in` | `registration.ts`, `oauth-registration.ts`, `auth.ts` (login). Contas criadas há menos de 48h também completam o teste 1 após o primeiro load autenticado. |
| 2 | `pedal_created` | `createPedal` em `pedals.ts` (com `pedal_id`) |
| 3 | `pedal_filters_used` | `NearbyPedalsMap` só depois de carregar a listagem **e** com filtro ativo (não basta abrir `/home`) |
| 4 | `pedal_join_requested` | pedido de participação ou entrada por convite — não o insert do criador em `createPedal`. No Teste 4 um pedal de demonstração (só em memória / `sessionStorage`) é injetado no mapa se necessário, para o pedido não depender de pedais reais por perto |
| 5 | `pedal_message_sent` | `sendPedalMessage` após insert com sucesso |
| 6 | `pedal_details_viewed` | rota `/pedals/[id]` com permanência de 2s (`UsabilityTestHost`) |
| 7 | `route_created` | `createRoute` |
| 8 | `route_favorited` | `insertRouteFavorite` |
| 9 | `bike_service_viewed` | abrir popup de um marcador em `BikeServicesMap` |
| 10 | `notification_viewed` | abrir o sino; no Teste 10 uma notificação de demonstração (só em memória) é injetada se necessário |

Não existe botão “Concluir teste”. O botão **Não consegui realizar** grava `skipped` após confirmação.

Quando os 10 testes estão finalizados, o painel pede o questionário de avaliação (`USABILITY_FEEDBACK_FORM_URL` em `config.ts`).

## Tabelas

- `user_test_progress`: um registro por usuário e número de teste (`pending` / `in_progress` / `completed` / `skipped`), timestamps e `metadata` (ids relacionados).
- `user_test_sessions`: início, contagens e `finished_at` quando os 10 testes estão concluídos ou pulados.

RLS: o usuário autenticado só lê/grava as próprias linhas.

## Como desligar ou remover

1. Desligar sem apagar código: `NEXT_PUBLIC_ENABLE_USABILITY_TESTS=false` em `.env`. O painel some e `reportUsabilityEvent` não faz nada.
2. Remover de vez:
   - apagar `src/usability-tests/`, `components/usability-tests/` e `docs/usability-tests.md`
   - remover `<UsabilityTestHost />` de `app/layout.tsx`
   - remover as linhas `reportUsabilityEvent(...)` (e o import) em: `pedals.ts`, `pedal-detail-client.ts`, `routes.ts`, `auth.ts`, `registration.ts`, `oauth-registration.ts`, `NearbyPedalsMap.tsx`, `BikeServicesMap.tsx`, `NotificationBell.tsx`
   - remover a ramificação do pedal de demonstração em `app/pedals/[id]/page.tsx`, `pedal-detail-fetch.ts` e `pedal-detail-client.ts`
   - opcional: dropar as tabelas no Supabase

As funcionalidades de pedais, chat, rotas, mapa e notificações continuam iguais.
